import httpx

from app.llm.base import ChatTurn, LLMError


class OpenAICompatProvider:
    """Qualquer API no formato /chat/completions da OpenAI: Groq, OpenRouter, Ollama, LM Studio..."""

    name = "openai_compat"

    def __init__(self, base_url: str, api_key: str, model: str, max_input_chars: int, timeout: float):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.max_input_chars = max_input_chars
        self.timeout = timeout

    async def complete(self, system: str, turns: list[ChatTurn], *, json_mode: bool = False) -> str:
        body: dict = {
            "model": self.model,
            "temperature": 0.2,
            "messages": [{"role": "system", "content": system}]
            + [{"role": t.role, "content": t.content} for t in turns],
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=body)
        except httpx.HTTPError as exc:
            raise LLMError(f"Falha de rede ao chamar {self.base_url}: {exc}") from exc

        if resp.status_code == 429:
            raise LLMError("Limite de uso do provedor de IA atingido. Tente em alguns minutos.")
        if resp.status_code >= 400:
            raise LLMError(f"Provedor respondeu {resp.status_code}: {resp.text[:300]}")

        try:
            return resp.json()["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError) as exc:
            raise LLMError("Provedor de IA retornou uma resposta inesperada.") from exc
