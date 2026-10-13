from dataclasses import dataclass
from typing import Literal, Protocol


class LLMError(RuntimeError):
    """Falha ao chamar o provedor de IA (rede, cota, resposta inválida...)."""


@dataclass(frozen=True)
class ChatTurn:
    role: Literal["user", "assistant"]
    content: str


class LLMProvider(Protocol):
    name: str
    # Quantos caracteres de documento cabem numa chamada; acima disso o texto é dividido.
    max_input_chars: int

    async def complete(self, system: str, turns: list[ChatTurn], *, json_mode: bool = False) -> str:
        """Gera a próxima resposta do assistente. Com json_mode=True deve devolver só JSON."""
        ...
