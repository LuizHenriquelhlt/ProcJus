from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---------- Auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("A senha precisa ter letras e números.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    created_at: datetime


# ---------- Análise do documento (saída estruturada da IA) ----------
class Party(BaseModel):
    nome: str
    papel: str = Field(description="Papel da parte em linguagem simples, ex.: 'quem está cobrando'")


class Deadline(BaseModel):
    descricao: str
    prazo: str = Field(description="Data ou prazo como aparece no documento, ex.: '15 dias úteis'")


class GlossaryTerm(BaseModel):
    termo: str = Field(description="Termo exatamente como aparece no texto original")
    explicacao: str = Field(description="Explicação curta em linguagem do dia a dia")


class Analysis(BaseModel):
    titulo: str = Field(description="Título curto e claro para o documento")
    tipo_documento: str = Field(description="Ex.: sentença, petição inicial, contrato, intimação")
    resumo_simples: str = Field(
        description="Resumo em 2 a 4 parágrafos curtos, como se explicasse a um amigo leigo"
    )
    partes: list[Party] = Field(default_factory=list)
    pontos_principais: list[str] = Field(default_factory=list)
    decisao: str | None = Field(
        default=None, description="O que foi decidido/pedido, se houver; null se não se aplicar"
    )
    prazos: list[Deadline] = Field(default_factory=list)
    proximos_passos: list[str] = Field(
        default_factory=list, description="O que a pessoa pode/precisa fazer agora"
    )
    glossario: list[GlossaryTerm] = Field(default_factory=list)


# ---------- Documentos e chat ----------
DocumentStatus = Literal["processing", "ready", "error"]


class DocumentSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    page_count: int
    status: DocumentStatus
    title: str | None = None
    created_at: datetime


class DocumentOut(DocumentSummaryOut):
    error: str | None
    text: str
    analysis: Analysis | None


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
