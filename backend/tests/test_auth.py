from tests.conftest import register


def test_register_sets_session_and_hashes_password(client):
    resp = register(client)
    assert resp.status_code == 201
    assert resp.json()["email"] == "ana@example.com"
    assert "password" not in resp.text
    assert "procjus_session" in resp.cookies
    assert client.get("/api/auth/me").json()["name"] == "Ana"


def test_register_rejects_duplicate_email_case_insensitive(client):
    register(client)
    assert register(client, email="ANA@example.com").status_code == 409


def test_register_rejects_weak_password(client):
    assert register(client, password="somenteletras").status_code == 422
    assert register(client, password="a1").status_code == 422


def test_login_and_logout(client):
    register(client)
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    assert (
        client.post("/api/auth/login", json={"email": "ana@example.com", "password": "errada123"}).status_code
        == 401
    )
    resp = client.post("/api/auth/login", json={"email": "ana@example.com", "password": "senha1234"})
    assert resp.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_unknown_email_gives_same_error_as_wrong_password(client):
    resp = client.post("/api/auth/login", json={"email": "ninguem@example.com", "password": "senha1234"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "E-mail ou senha incorretos."


def test_login_is_rate_limited(client):
    register(client)
    client.post("/api/auth/logout")
    for _ in range(5):
        client.post("/api/auth/login", json={"email": "ana@example.com", "password": "errada123"})
    resp = client.post("/api/auth/login", json={"email": "ana@example.com", "password": "senha1234"})
    assert resp.status_code == 429


def test_tampered_cookie_is_rejected(client):
    client.cookies.set("procjus_session", "nao.e.um.jwt")
    assert client.get("/api/auth/me").status_code == 401
