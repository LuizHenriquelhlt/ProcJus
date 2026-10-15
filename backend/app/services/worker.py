"""Fila de análise guardada no próprio banco.

Um documento com `status == "processing"` é um job pendente. Não há serviço extra: se o processo
reiniciar no meio de uma análise, o documento continua `processing` e é retomado na próxima
varredura. Os jobs rodam um por vez, o que também limita o gasto com a IA.

Pensado para uma única instância da API (como no docker-compose). Com várias réplicas, dois
processos poderiam pegar o mesmo documento; aí vale trocar por um claim atômico ou uma fila externa.
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.db import SessionLocal
from app.llm import LLMError, LLMProvider, get_provider
from app.models import Document
from app.services.analysis import analyze_document

log = logging.getLogger(__name__)

# Sem await entre ler e gravar a flag, então é seguro dentro de um event loop.
_busy = False


async def run_analysis(doc_id: str, provider: LLMProvider, session_factory: sessionmaker) -> None:
    with session_factory() as db:
        doc = db.get(Document, doc_id)
        if doc is None or doc.status != "processing":
            return
        try:
            analysis = await analyze_document(provider, doc.text)
            doc.analysis = analysis.model_dump()
            doc.status, doc.error = "ready", None
        except LLMError as exc:
            doc.status, doc.error = "error", str(exc)
        except Exception:
            log.exception("Erro inesperado ao analisar documento %s", doc_id)
            doc.status, doc.error = "error", "Erro inesperado ao analisar o documento."
        db.commit()


async def process_pending(session_factory: sessionmaker, provider: LLMProvider) -> int:
    """Analisa todos os documentos pendentes, do mais antigo ao mais novo. Devolve quantos processou."""
    global _busy
    if _busy:  # outra chamada já está esvaziando a fila
        return 0
    _busy = True
    attempted: set[str] = set()
    try:
        while True:
            with session_factory() as db:
                doc_id = db.scalars(
                    select(Document.id)
                    .where(Document.status == "processing", Document.id.notin_(attempted))
                    .order_by(Document.created_at)
                    .limit(1)
                ).first()
            if doc_id is None:
                return len(attempted)
            # Cada documento é tentado uma vez por passada: se algo impedir de gravar o resultado,
            # ele fica para a próxima varredura em vez de travar este laço.
            attempted.add(doc_id)
            try:
                await run_analysis(doc_id, provider, session_factory)
            except Exception:
                log.exception("Falha ao processar documento %s", doc_id)
    finally:
        _busy = False


async def sweep_forever() -> None:
    """Retoma documentos órfãos (reinício, falha ao gravar) logo na subida e depois a cada intervalo."""
    interval = get_settings().worker_sweep_seconds
    while True:
        try:
            await process_pending(SessionLocal, get_provider())
        except Exception:
            log.exception("Erro na varredura da fila de análise")
        await asyncio.sleep(interval)
