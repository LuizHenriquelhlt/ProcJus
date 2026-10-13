from functools import lru_cache

from app.config import get_settings
from app.llm.base import ChatTurn, LLMError, LLMProvider
from app.llm.fake import FakeProvider
from app.llm.gemini import GeminiProvider
from app.llm.openai_compat import OpenAICompatProvider

__all__ = ["ChatTurn", "LLMError", "LLMProvider", "get_provider"]


@lru_cache
def get_provider() -> LLMProvider:
    s = get_settings()
    if s.llm_provider == "gemini":
        return GeminiProvider(
            s.gemini_api_key, s.gemini_model, s.gemini_max_input_chars, s.llm_timeout_seconds
        )
    if s.llm_provider == "openai_compat":
        return OpenAICompatProvider(
            s.openai_compat_base_url,
            s.openai_compat_api_key,
            s.openai_compat_model,
            s.openai_compat_max_input_chars,
            s.llm_timeout_seconds,
        )
    return FakeProvider()
