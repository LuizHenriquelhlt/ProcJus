from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.models import User
from app.schemas import LoginIn, RegisterIn, UserOut
from app.security import (
    create_access_token,
    hash_password,
    login_limiter,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, user_id: str) -> None:
    s = get_settings()
    response.set_cookie(
        s.cookie_name,
        create_access_token(user_id),
        max_age=s.access_token_minutes * 60,
        httponly=True,  # inacessível ao JavaScript -> protege contra roubo via XSS
        secure=s.cookie_secure,
        samesite="lax",  # não é enviado em POST vindo de outro site -> mitiga CSRF
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, response: Response, db: DbSession):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma conta com este e-mail.")
    user = User(name=data.name, email=email, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    _set_session_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(data: LoginIn, response: Response, db: DbSession):
    email = data.email.lower()
    if login_limiter.is_blocked(email):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
        )
    user = db.scalar(select(User).where(User.email == email))
    if not verify_password(data.password, user.password_hash if user else None):
        login_limiter.register_failure(email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")
    login_limiter.reset(email)
    _set_session_cookie(response, user.id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(get_settings().cookie_name, path="/")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
