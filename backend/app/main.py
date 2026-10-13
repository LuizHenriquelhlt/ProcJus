import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.routers import auth, documents

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("procjus")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if settings.secret_key.startswith("dev-secret-change-me"):
        log.warning("SECRET_KEY padrão em uso: defina uma chave própria no .env antes de publicar.")
    log.info("Provedor de IA: %s", settings.llm_provider)
    Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="ProcJus API",
        description="Traduz documentos jurídicos para linguagem simples.",
        version="2.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(documents.router)

    @app.get("/api/health", tags=["meta"])
    def health():
        return {"status": "ok", "llm_provider": settings.llm_provider}

    return app


app = create_app()
