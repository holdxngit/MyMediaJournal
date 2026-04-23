import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, UserSession


SESSION_COOKIE_NAME = "media_journal_session"
SESSION_DAYS = 7
PASSWORD_ITERATIONS = 260_000
MIN_PASSWORD_LENGTH = 8


def _utcnow() -> datetime:
    return datetime.utcnow()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return (
        f"pbkdf2_sha256${PASSWORD_ITERATIONS}$"
        f"{base64.b64encode(salt).decode('ascii')}$"
        f"{base64.b64encode(digest).decode('ascii')}"
    )


def verify_password(password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False

    try:
        algorithm, iterations, salt, digest = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False

        candidate = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            base64.b64decode(salt),
            int(iterations),
        )
        return hmac.compare_digest(candidate, base64.b64decode(digest))
    except (ValueError, TypeError):
        return False


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
        )


def _hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session_cookie(response: Response, db: Session, user: User) -> None:
    token = secrets.token_urlsafe(32)
    session = UserSession(
        user_id=user.user_id,
        token_hash=_hash_session_token(token),
        expires_at=_utcnow() + timedelta(days=SESSION_DAYS),
    )
    db.add(session)
    db.commit()

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        max_age=SESSION_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        path="/",
    )


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token_hash = _hash_session_token(session_token)
    session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()
    if not session or session.expires_at <= _utcnow():
        if session:
            db.delete(session)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return session.user


def get_user_from_token(token: str, db: Session) -> User | None:
    """Non-raising auth for WebSocket connections."""
    token_hash = _hash_session_token(token)
    session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()
    if not session or session.expires_at <= _utcnow():
        return None
    return session.user


def delete_current_session(
    response: Response,
    db: Session,
    session_token: str | None,
) -> None:
    if session_token:
        token_hash = _hash_session_token(session_token)
        session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()
        if session:
            db.delete(session)
            db.commit()

    clear_session_cookie(response)
