import json
import logging
import re

from pydantic import ValidationError

from app.llm import ChatTurn, LLMError, LLMProvider
from app.schemas import Analysis
from app.services.pdf import split_into_chunks
from app.services.prompts import ANALYSIS_SYSTEM, NOTES_SYSTEM, chat_system

log = logging.getLogger(__name__)


def _parse_analysis(raw: str) -> Analysis:
    # Alguns modelos embrulham o JSON em ```json ... ```; pegamos do primeiro { ao último }.
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("resposta sem JSON")
    return Analysis.model_validate(json.loads(match.group(0)))


MAX_CONDENSE_ROUNDS = 3


async def _condense(provider: LLMProvider, text: str, round_: int = 1) -> str:
    """Documentos maiores que o contexto do modelo viram anotações por trecho (map-reduce)."""
    limit = provider.max_input_chars
    chunks = split_into_chunks(text, limit)
    if len(chunks) == 1:
        return text
    notes = []
    for i, chunk in enumerate(chunks, start=1):
        prompt = f"Trecho {i} de {len(chunks)}:\n\n{chunk}"
        reply = await provider.complete(NOTES_SYSTEM, [ChatTurn("user", prompt)])
        notes.append(f"## Anotações do trecho {i}\n{reply}")
    condensed = "\n\n".join(notes)
    if len(condensed) <= limit:
        return condensed
    # Se as anotações não encolheram o suficiente, mais uma rodada; depois disso, corta para
    # garantir que o processo termina mesmo com um modelo que resume mal.
    if round_ < MAX_CONDENSE_ROUNDS and len(condensed) < len(text):
        return await _condense(provider, condensed, round_ + 1)
    log.warning("Anotações ainda excedem o limite após %d rodada(s); cortando.", round_)
    return condensed[:limit]


async def analyze_document(provider: LLMProvider, text: str) -> Analysis:
    material = await _condense(provider, text)
    turns = [ChatTurn("user", f"Documento:\n\n{material}")]
    raw = await provider.complete(ANALYSIS_SYSTEM, turns, json_mode=True)
    try:
        return _parse_analysis(raw)
    except (ValueError, ValidationError) as first_error:
        log.warning("Análise com JSON inválido, pedindo correção: %s", first_error)
        turns += [
            ChatTurn("assistant", raw),
            ChatTurn(
                "user", f"O JSON acima é inválido ({first_error}). Responda apenas com o JSON corrigido."
            ),
        ]
        raw = await provider.complete(ANALYSIS_SYSTEM, turns, json_mode=True)
        try:
            return _parse_analysis(raw)
        except (ValueError, ValidationError) as exc:
            raise LLMError("A IA não conseguiu estruturar a análise do documento.") from exc


async def answer_question(
    provider: LLMProvider, document_text: str, analysis: dict | None, history: list[ChatTurn]
) -> str:
    # Reserva espaço para a análise e o histórico; corta o documento se precisar.
    budget = max(provider.max_input_chars - 8_000, 4_000)
    doc = document_text
    if len(doc) > budget:
        doc = (
            doc[:budget] + "\n\n[... documento cortado por tamanho; use a análise prévia para o restante ...]"
        )
    return (await provider.complete(chat_system(doc, analysis), history)).strip()
