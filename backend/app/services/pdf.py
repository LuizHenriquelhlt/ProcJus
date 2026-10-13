import io
import re
from dataclasses import dataclass

from pypdf import PdfReader
from pypdf.errors import PdfReadError


class PdfExtractionError(ValueError):
    pass


@dataclass
class ExtractedPdf:
    text: str
    page_count: int


def extract_pdf_text(data: bytes, max_chars: int) -> ExtractedPdf:
    if not data.startswith(b"%PDF"):
        raise PdfExtractionError("O arquivo enviado não é um PDF válido.")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise PdfExtractionError("O PDF está protegido por senha.")
        pages = [page.extract_text() or "" for page in reader.pages]
    except PdfReadError as exc:
        raise PdfExtractionError("Não foi possível ler o PDF (arquivo corrompido?).") from exc

    text = normalize_text("\n\n".join(pages))
    if len(text) < 50:
        raise PdfExtractionError(
            "Não encontramos texto no PDF. Ele parece ser uma imagem escaneada, "
            "que ainda não conseguimos ler."
        )
    if len(text) > max_chars:
        raise PdfExtractionError(
            f"O documento é grande demais ({len(text):,} caracteres; limite {max_chars:,})."
        )
    return ExtractedPdf(text=text, page_count=len(pages))


def normalize_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_into_chunks(text: str, max_chars: int) -> list[str]:
    """Divide por parágrafos, sem ultrapassar max_chars por pedaço."""
    chunks: list[str] = []
    current = ""
    for para in text.split("\n\n"):
        while len(para) > max_chars:  # parágrafo gigante: corta no limite
            if current:
                chunks.append(current)
                current = ""
            chunks.append(para[:max_chars])
            para = para[max_chars:]
        if len(current) + len(para) + 2 > max_chars and current:
            chunks.append(current)
            current = para
        else:
            current = f"{current}\n\n{para}" if current else para
    if current:
        chunks.append(current)
    return chunks
