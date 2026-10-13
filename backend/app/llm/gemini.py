import httpx

from app.llm.base import ChatTurn, LLMError

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiProvider:
    """Google Gemini via API REST do AI Studio (tem camada gratuita)."""

    name = "gemini"

    def __init__(self, api_key: str, model: str, max_input_chars: int, timeout: float):
        if not api_key:
            raise LLMError("GEMINI_API_KEY não configurada.")
        self.api_key = api_key
        self.model = model
        self.max_input_chars = max_input_chars
        self.timeout = timeout

    async def complete(self, system: str, turns: list[ChatTurn], *, json_mode: bool = False) -> str:
        body: dict = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [
                {"role": "model" if t.role == "assistant" else "user", "parts": [{"text": t.content}]}
                for t in turns
            ],
            "generationConfig": {"temperature": 0.2},
        }
        if json_mode:
            body["generationConfig"]["responseMimeType"] = "application/json"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    GEMINI_URL.format(model=self.model),
                    headers={"x-goog-api-key": self.api_key},
                    json=body,
                )
        except httpx.HTTPError as exc:
            raise LLMError(f"Falha de rede ao chamar o Gemini: {exc}") from exc

        if resp.status_code == 429:
            raise LLMError("Limite da camada gratuita do Gemini atingido. Tente em alguns minutos.")
        if resp.status_code >= 400:
            raise LLMError(f"Gemini respondeu {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        try:
            parts = data["candidates"][0]["content"]["parts"]
            return "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError) as exc:
            reason = data.get("promptFeedback", {}).get("blockReason") or "resposta vazia"
            raise LLMError(f"Gemini não retornou texto ({reason}).") from exc
