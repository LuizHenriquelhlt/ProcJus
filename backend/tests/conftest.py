import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db, make_engine
from app.llm import get_provider
from app.llm.fake import FakeProvider
from app.main import app
from app.routers.documents import get_session_factory
from app.security import login_limiter


@pytest.fixture
def provider() -> FakeProvider:
    return FakeProvider()


@pytest.fixture
def client(provider):
    engine = make_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def _get_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_session_factory] = lambda: factory
    app.dependency_overrides[get_provider] = lambda: provider
    login_limiter._failures.clear()
    yield TestClient(app)
    app.dependency_overrides.clear()


def register(client: TestClient, email="ana@example.com", password="senha1234", name="Ana"):
    return client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
