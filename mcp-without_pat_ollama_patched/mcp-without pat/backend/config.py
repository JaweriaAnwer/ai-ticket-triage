import os
from pathlib import Path

# Windows: ProactorEventLoop before any asyncio subprocess (MCP stdio)
import backend.platform_fix  # noqa: F401

from dotenv import load_dotenv

# Load .env from project root (parent of backend/)
_ROOT = Path(__file__).resolve().parent.parent
# .env must win over stale shell exports (e.g. old TABLEAU_SITE_NAME).
load_dotenv(_ROOT / ".env", override=True)


def _strip_env_value(value: str) -> str:
    """Trim and remove optional surrounding quotes from .env values."""
    v = value.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
        v = v[1:-1].strip()
    return v


def env(name: str, default: str = "") -> str:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return _strip_env_value(raw)


def require_env(name: str) -> str:
    v = env(name)
    if not v:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return v


def env_int(name: str, default: int) -> int:
    raw = env(name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def httpx_verify() -> bool:
    raw = env("TABLEAU_SSL_VERIFY", "1").lower()
    return raw not in ("0", "false", "no")


def openai_base_url() -> str:
    """Base URL for the OpenAI-compatible chat endpoint.

    Empty string = talk to api.openai.com (real OpenAI).
    Set OPENAI_BASE_URL=http://localhost:11434/v1 to use a local Ollama server instead.
    """
    return env("OPENAI_BASE_URL")


def openai_api_key() -> str:
    """API key for the chat endpoint.

    Ollama's OpenAI-compatible server ignores the key but the SDK still requires a
    non-empty string, so fall back to a dummy value whenever a custom base URL is set.
    """
    key = env("OPENAI_API_KEY")
    if key:
        return key
    if openai_base_url():
        return "ollama"
    return ""
