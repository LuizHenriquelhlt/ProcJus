import json

from app.llm.base import ChatTurn


class FakeProvider:
    """Provedor determinístico, sem rede: permite rodar o app e os testes sem chave de API."""

    name = "fake"

    def __init__(self, max_input_chars: int = 50_000):
        self.max_input_chars = max_input_chars
        self.calls: list[tuple[str, list[ChatTurn], bool]] = []

    async def complete(self, system: str, turns: list[ChatTurn], *, json_mode: bool = False) -> str:
        self.calls.append((system, turns, json_mode))
        if json_mode:
            return json.dumps(
                {
                    "titulo": "Documento de exemplo (modo simulado)",
                    "tipo_documento": "Documento jurídico",
                    "resumo_simples": (
                        "Este é um resumo simulado. Configure LLM_PROVIDER=gemini ou "
                        "openai_compat no backend/.env para receber a tradução real do documento."
                    ),
                    "partes": [{"nome": "Parte A", "papel": "quem fez o pedido"}],
                    "pontos_principais": ["O documento foi lido com sucesso."],
                    "decisao": None,
                    "prazos": [{"descricao": "Exemplo de prazo", "prazo": "15 dias"}],
                    "proximos_passos": ["Configure um provedor de IA real."],
                    "glossario": [
                        {
                            "termo": "trânsito em julgado",
                            "explicacao": "Quando a decisão vira definitiva e não cabe mais recurso.",
                        }
                    ],
                },
                ensure_ascii=False,
            )
        question = turns[-1].content if turns else ""
        if len(question) > 300:  # pedido de anotações de um trecho do documento
            return "Notas simuladas do trecho."
        return f"(modo simulado) Você perguntou: “{question}”."
