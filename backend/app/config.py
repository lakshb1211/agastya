import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

try:
    from dotenv import load_dotenv
    # Load .env from backend/ or workspace root
    if (BASE_DIR / ".env").exists():
        load_dotenv(BASE_DIR / ".env")
    elif (WORKSPACE_DIR / ".env").exists():
        load_dotenv(WORKSPACE_DIR / ".env")
except ImportError:
    pass

# Database
DB_PATH = Path(os.getenv("AGASTYA_DB_PATH", str(DATA_DIR / "agastya.db")))

# CORS
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]

# Security
SECRET_KEY = os.getenv("AGASTYA_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "AGASTYA_SECRET_KEY must be set. Generate one with "
        "`python -c \"import secrets; print(secrets.token_urlsafe(32))\"`."
    )
TOKEN_EXPIRY_DAYS = int(os.getenv("AGASTYA_TOKEN_EXPIRY_DAYS", "30"))

# AI Providers
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Upload limits
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_PDF_PAGES = 150

# Supported Languages
LANGUAGES = {
    "english": "English",
    "hindi": "Hindi",
    "spanish": "Spanish",
    "french": "French",
    "chinese": "Chinese",
}
LANG_ALIASES = {
    "en": "english",
    "hi": "hindi",
    "es": "spanish",
    "fr": "french",
    "zh": "chinese",
}
