import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.db import SessionLocal
from app.deps import CurrentUser, DbSession
from app.llm import ChatTurn, LLMError, LLMProvider, get_provider
from app.models import Document, Message, User
from app.schemas import DocumentOut, DocumentSummaryOut, MessageIn, MessageOut
from app.services.analysis import analyze_document, answer_question
from app.services.pdf import PdfExtractionError, extract_pdf_text

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])

Provider = Annotated[LLMProvider, Depends(get_provider)]


def get_session_factory() -> sessionmaker[Session]:
    return SessionLocal


SessionFactory = Annotated[sessionmaker, Depends(get_session_factory)]


def _summary(doc: Document) -> DocumentSummaryOut:
    out = DocumentSummaryOut.model_validate(doc)
    out.title = (doc.analysis or {}).get("titulo")
    return out


def _get_owned(db: Session, user: User, doc_id: str) -> Document:
    doc = db.get(Document, doc_id)
    # 404 também quando o documento é de outra pessoa: não revela que ele existe.
    if doc is None or doc.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento não encontrado.")
    return doc


async def _run_analysis(doc_id: str, provider: LLMProvider, session_factory: sessionmaker) -> None:
    with session_factory() as db:
        doc = db.get(Document, doc_id)
        if doc is None:
            return
        try:
            analysis = await analyze_document(provider, doc.text)
            doc.analysis = analysis.model_dump()
            doc.status = "ready"
        except LLMError as exc:
            doc.status, doc.error = "error", str(exc)
        except Exception:
            log.exception("Erro inesperado ao analisar documento %s", doc_id)
            doc.status, doc.error = "error", "Erro inesperado ao analisar o documento."
        db.commit()


@router.get("", response_model=list[DocumentSummaryOut])
def list_documents(user: CurrentUser, db: DbSession):
    docs = db.scalars(
        select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc())
    )
    return [_summary(d) for d in docs]


@router.post("", response_model=DocumentSummaryOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile,
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
    provider: Provider,
    session_factory: SessionFactory,
):
    settings = get_settings()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Arquivo maior que {settings.max_upload_mb} MB.",
        )
    try:
        extracted = extract_pdf_text(data, settings.max_document_chars)
    except PdfExtractionError as exc:
        raise HTTPException(422, str(exc)) from exc

    doc = Document(
        user_id=user.id,
        filename=(file.filename or "documento.pdf")[:255],
        page_count=extracted.page_count,
        text=extracted.text,
    )
    db.add(doc)
    db.commit()
    background.add_task(_run_analysis, doc.id, provider, session_factory)
    return _summary(doc)


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, user: CurrentUser, db: DbSession):
    doc = _get_owned(db, user, doc_id)
    out = DocumentOut.model_validate(doc)
    out.title = (doc.analysis or {}).get("titulo")
    return out


@router.post("/{doc_id}/retry", response_model=DocumentSummaryOut, status_code=status.HTTP_202_ACCEPTED)
def retry_analysis(
    doc_id: str,
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
    provider: Provider,
    session_factory: SessionFactory,
):
    doc = _get_owned(db, user, doc_id)
    if doc.status != "error":
        raise HTTPException(status.HTTP_409_CONFLICT, "Só é possível reprocessar documentos com erro.")
    doc.status, doc.error = "processing", None
    db.commit()
    background.add_task(_run_analysis, doc.id, provider, session_factory)
    return _summary(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(doc_id: str, user: CurrentUser, db: DbSession):
    db.delete(_get_owned(db, user, doc_id))
    db.commit()


@router.get("/{doc_id}/messages", response_model=list[MessageOut])
def list_messages(doc_id: str, user: CurrentUser, db: DbSession):
    return _get_owned(db, user, doc_id).messages


@router.post("/{doc_id}/messages", response_model=list[MessageOut], status_code=status.HTTP_201_CREATED)
async def send_message(doc_id: str, data: MessageIn, user: CurrentUser, db: DbSession, provider: Provider):
    doc = _get_owned(db, user, doc_id)
    if doc.status != "ready":
        raise HTTPException(status.HTTP_409_CONFLICT, "Aguarde a análise do documento terminar.")

    history = [ChatTurn(m.role, m.content) for m in doc.messages]
    history = history[-get_settings().chat_history_turns :]
    history.append(ChatTurn("user", data.content))
    try:
        reply = await answer_question(provider, doc.text, doc.analysis, history)
    except LLMError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    # Timestamps explícitos: no Windows o relógio pode repetir o mesmo microssegundo, e a
    # ordem pergunta -> resposta do histórico depende de created_at.
    asked_at = datetime.now(UTC)
    question = Message(document_id=doc.id, role="user", content=data.content, created_at=asked_at)
    answer = Message(
        document_id=doc.id,
        role="assistant",
        content=reply,
        created_at=asked_at + timedelta(microseconds=1),
    )
    db.add_all([question, answer])
    db.commit()
    return [question, answer]
