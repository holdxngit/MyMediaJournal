from typing import Optional

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .auth import (
    SESSION_COOKIE_NAME,
    create_session_cookie,
    delete_current_session,
    get_current_user,
    hash_password,
    validate_password,
    verify_password,
)
from .db import ensure_dev_schema, get_db
from .models import MediaItem, MediaItemGenre, Genre, ConsumptionLog, User
from .schemas import (
    MediaItemResponse,
    ConsumptionLogCreate,
    ConsumptionLogUpdate,
    ConsumptionLogResponse,
    PaginatedLogsResponse,
    LoginRequest,
    SignupRequest,
    UserResponse,
)

app = FastAPI()


@app.on_event("startup")
def startup():
    ensure_dev_schema()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_media_item(item: MediaItem) -> dict:
    return {
        "media_id": item.media_id,
        "title": item.title,
        "media_type": item.media_type,
        "genres": [mg.genre.title for mg in item.genres],
    }


def serialize_log(log: ConsumptionLog) -> dict:
    return {
        "log_id": log.log_id,
        "user_id": log.user_id,
        "media_id": log.media_id,
        "title": log.media_item.title,
        "media_type": log.media_item.media_type,
        "date_consumed": log.date_consumed,
        "time_consumed": log.time_consumed,
    }


def serialize_user(user: User) -> dict:
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
    }


@app.get("/")
def read_root():
    return {"message": "Backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    validate_password(payload.password)

    email = payload.email.lower()
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    create_session_cookie(response, db, user)
    db.refresh(user)
    return serialize_user(user)


@app.post("/auth/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    create_session_cookie(response, db, user)
    return serialize_user(user)


@app.post("/auth/logout", status_code=204)
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    delete_current_session(response, db, session_token)


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


@app.get("/genres", response_model=list[str])
def get_genres(db: Session = Depends(get_db)):
    genres = db.query(Genre).order_by(Genre.title).all()
    return [g.title for g in genres]


@app.get("/media", response_model=list[MediaItemResponse])
def get_media(
    media_type: Optional[str] = None,
    genre: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(MediaItem)

    if media_type:
        query = query.filter(MediaItem.media_type == media_type)

    if genre:
        query = (
            query.join(MediaItemGenre)
            .join(Genre)
            .filter(Genre.title == genre)
            .distinct()
        )

    items = query.order_by(MediaItem.media_id).all()
    return [serialize_media_item(item) for item in items]


PAGE_SIZE = 9

@app.get("/logs", response_model=PaginatedLogsResponse)
def get_logs(
    page: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_query = (
        db.query(ConsumptionLog)
        .join(MediaItem)
        .filter(
            ConsumptionLog.user_id == current_user.user_id,
            ConsumptionLog.media_id.isnot(None),
        )
        .order_by(ConsumptionLog.date_consumed.desc())
    )
    total = base_query.count()
    logs = base_query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {
        "items": [serialize_log(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": PAGE_SIZE,
    }


@app.post("/logs", response_model=ConsumptionLogResponse, status_code=201)
def create_log(
    payload: ConsumptionLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    media_item = db.query(MediaItem).filter(MediaItem.media_id == payload.media_id).first()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media item not found")

    log = ConsumptionLog(**payload.model_dump(), user_id=current_user.user_id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return serialize_log(log)


@app.put("/logs/{log_id}", response_model=ConsumptionLogResponse)
def update_log(
    log_id: int,
    payload: ConsumptionLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(ConsumptionLog)
        .filter(
            ConsumptionLog.log_id == log_id,
            ConsumptionLog.user_id == current_user.user_id,
        )
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    log.date_consumed = payload.date_consumed
    log.time_consumed = payload.time_consumed
    db.commit()
    db.refresh(log)
    return serialize_log(log)


@app.delete("/logs/{log_id}", status_code=204)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(ConsumptionLog)
        .filter(
            ConsumptionLog.log_id == log_id,
            ConsumptionLog.user_id == current_user.user_id,
        )
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    db.delete(log)
    db.commit()
