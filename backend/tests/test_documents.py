from fastapi.testclient import TestClient

from app.main import app
from app.services.pdf import split_into_chunks
from tests.conftest import register
from tests.pdf_factory import SAMPLE_PDF, make_pdf


def upload(client, data=SAMPLE_PDF, name="sentenca.pdf"):
    return client.post("/api/documents", files={"file": (name, data, "application/pdf")})


def test_requires_login(client):
    assert client.get("/api/documents").status_code == 401
    assert upload(client).status_code == 401


def test_upload_analyzes_document(client, provider):
    register(client)
    resp = upload(client)
    assert resp.status_code == 202
    doc_id = resp.json()["id"]

    # TestClient executa as background tasks antes de devolver a resposta.
    doc = client.get(f"/api/documents/{doc_id}").json()
    assert doc["status"] == "ready"
    assert doc["page_count"] == 1
    assert "Banco Exemplo" in doc["text"]
    assert doc["analysis"]["glossario"][0]["termo"] == "trânsito em julgado"
    assert doc["title"] == doc["analysis"]["titulo"]

    # O texto do documento foi enviado à IA em modo JSON.
    system, turns, json_mode = provider.calls[-1]
    assert json_mode and "Banco Exemplo" in turns[0].content

    listed = client.get("/api/documents").json()
    assert [d["id"] for d in listed] == [doc_id]


def test_rejects_non_pdf_and_scanned_pdf(client):
    register(client)
    assert upload(client, b"isto nao e pdf", "a.pdf").status_code == 422
    resp = upload(client, make_pdf([""]), "escaneado.pdf")
    assert resp.status_code == 422
    assert "escaneada" in resp.json()["detail"]


def test_chat_about_document(client, provider):
    register(client)
    doc_id = upload(client).json()["id"]
    resp = client.post(f"/api/documents/{doc_id}/messages", json={"content": "Quanto tenho que pagar?"})
    assert resp.status_code == 201
    question, answer = resp.json()
    assert question["role"] == "user" and answer["role"] == "assistant"

    # O prompt do chat leva o documento e o histórico.
    system, turns, _ = provider.calls[-1]
    assert "Banco Exemplo" in system
    assert turns[-1].content == "Quanto tenho que pagar?"

    client.post(f"/api/documents/{doc_id}/messages", json={"content": "E o prazo?"})
    assert len(client.get(f"/api/documents/{doc_id}/messages").json()) == 4


def test_users_cannot_see_each_others_documents(client):
    register(client)
    doc_id = upload(client).json()["id"]

    other = TestClient(app)
    register(other, email="bruno@example.com", name="Bruno")
    assert other.get(f"/api/documents/{doc_id}").status_code == 404
    assert other.post(f"/api/documents/{doc_id}/messages", json={"content": "oi"}).status_code == 404
    assert other.delete(f"/api/documents/{doc_id}").status_code == 404
    assert other.get("/api/documents").json() == []


def test_delete_document_removes_messages(client):
    register(client)
    doc_id = upload(client).json()["id"]
    client.post(f"/api/documents/{doc_id}/messages", json={"content": "oi"})
    assert client.delete(f"/api/documents/{doc_id}").status_code == 204
    assert client.get(f"/api/documents/{doc_id}").status_code == 404


def test_analysis_error_can_be_retried(client, provider, monkeypatch):
    from app.llm import LLMError

    register(client)
    original = provider.complete

    async def failing(*args, **kwargs):
        raise LLMError("cota esgotada")

    monkeypatch.setattr(provider, "complete", failing)
    doc_id = upload(client).json()["id"]
    doc = client.get(f"/api/documents/{doc_id}").json()
    assert doc["status"] == "error" and doc["error"] == "cota esgotada"

    monkeypatch.setattr(provider, "complete", original)
    assert client.post(f"/api/documents/{doc_id}/retry").status_code == 202
    assert client.get(f"/api/documents/{doc_id}").json()["status"] == "ready"


def test_long_documents_are_condensed_in_chunks(client, provider):
    provider.max_input_chars = 200
    register(client)
    lines = [f"Paragrafo {i}: o reu deve pagar a quantia combinada." for i in range(40)]
    doc_id = upload(client, make_pdf(lines)).json()["id"]
    assert client.get(f"/api/documents/{doc_id}").json()["status"] == "ready"
    note_calls = [c for c in provider.calls if not c[2]]
    assert len(note_calls) > 1  # gerou anotações por trecho antes da análise final


def test_split_into_chunks_respects_limit():
    text = "\n\n".join(["a" * 30] * 10 + ["b" * 250])
    chunks = split_into_chunks(text, 100)
    assert all(len(c) <= 100 for c in chunks)
    assert "".join(chunks).replace("\n", "") == text.replace("\n", "")


def test_chat_history_keeps_question_answer_order(client):
    register(client)
    doc_id = upload(client).json()["id"]
    for q in ["primeira", "segunda", "terceira"]:
        client.post(f"/api/documents/{doc_id}/messages", json={"content": q})
    roles = [m["role"] for m in client.get(f"/api/documents/{doc_id}/messages").json()]
    assert roles == ["user", "assistant"] * 3
