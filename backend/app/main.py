import secrets
import time
from datetime import date as date_type, datetime
from pathlib import Path
from typing import Optional

from fastapi import Cookie, Depends, FastAPI, File, HTTPException, Response, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import and_, extract, func, or_
from sqlalchemy.orm import Session

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

from .auth import (
    SESSION_COOKIE_NAME,
    create_session_cookie,
    delete_current_session,
    get_current_user,
    get_user_from_token,
    hash_password,
    validate_password,
    verify_password,
)
from .db import SessionLocal, ensure_dev_schema, get_db
from .models import ConsumptionLog, Friendship, FriendRequest, Genre, MediaItem, MediaItemGenre, Message, Role, User
from .schemas import (
    ConsumptionLogCreate,
    ConsumptionLogResponse,
    ConsumptionLogUpdate,
    FriendRequestResponse,
    FriendResponse,
    LogStatsResponse,
    LoginRequest,
    MediaItemResponse,
    MessageResponse,
    PaginatedLogsResponse,
    SendFriendRequestPayload,
    SendRequestResult,
    SignupRequest,
    UserResponse,
    WrappedResponse,
)
from .utils import generate_friend_code

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

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR.parent)), name="uploads")

# ── WebSocket connection manager ───────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self._active: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self._active[user_id] = ws

    def disconnect(self, user_id: int):
        self._active.pop(user_id, None)

    async def send_to(self, user_id: int, data: dict):
        ws = self._active.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)


manager = ConnectionManager()

# Short-lived tokens for WebSocket auth (in-memory, fine for single-server dev)
_ws_tokens: dict[str, tuple[int, datetime]] = {}


# ── Serializers ────────────────────────────────────────────────────────────────

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
        "friend_code": user.friend_code,
        "created_at": user.created_at,
        "avatar_url": user.avatar_url,
        "role": user.role.name if user.role else "user",
    }


def serialize_friend(user: User) -> dict:
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "friend_code": user.friend_code,
    }


def serialize_message(msg: Message) -> dict:
    return {
        "message_id": msg.message_id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "content": msg.content,
        "sent_at": msg.sent_at.isoformat(),
    }


def _compute_wrapped(target_user_id: int, period: str, db: Session) -> dict:
    today = date_type.today()

    base = db.query(ConsumptionLog).filter(
        ConsumptionLog.user_id == target_user_id,
        ConsumptionLog.media_id.isnot(None),
    )
    if period == "this_year":
        base = base.filter(extract("year", ConsumptionLog.date_consumed) == today.year)
    elif period == "this_month":
        base = base.filter(
            extract("year", ConsumptionLog.date_consumed) == today.year,
            extract("month", ConsumptionLog.date_consumed) == today.month,
        )

    totals = base.with_entities(
        func.count(ConsumptionLog.log_id),
        func.sum(ConsumptionLog.time_consumed),
    ).one()

    top_type = (
        base.join(MediaItem)
        .with_entities(MediaItem.media_type, func.count(ConsumptionLog.log_id).label("n"))
        .group_by(MediaItem.media_type)
        .order_by(func.count(ConsumptionLog.log_id).desc())
        .first()
    )

    top_item = (
        base.join(MediaItem)
        .with_entities(
            MediaItem.title,
            MediaItem.media_type,
            func.sum(ConsumptionLog.time_consumed).label("total_minutes"),
        )
        .group_by(MediaItem.media_id, MediaItem.title, MediaItem.media_type)
        .order_by(func.sum(ConsumptionLog.time_consumed).desc())
        .first()
    )

    type_breakdown = (
        base.join(MediaItem)
        .with_entities(
            MediaItem.media_type,
            func.count(ConsumptionLog.log_id).label("count"),
            func.sum(ConsumptionLog.time_consumed).label("minutes"),
        )
        .group_by(MediaItem.media_type)
        .order_by(func.count(ConsumptionLog.log_id).desc())
        .all()
    )

    longest_session = base.with_entities(func.max(ConsumptionLog.time_consumed)).scalar() or 0

    activity_by_day = (
        base.with_entities(
            ConsumptionLog.date_consumed,
            func.count(ConsumptionLog.log_id).label("count"),
        )
        .group_by(ConsumptionLog.date_consumed)
        .order_by(ConsumptionLog.date_consumed)
        .all()
    )

    return {
        "total_entries": totals[0] or 0,
        "total_minutes": totals[1] or 0,
        "top_media_type": top_type[0] if top_type else None,
        "longest_session_minutes": longest_session,
        "top_item": {
            "title": top_item[0],
            "media_type": top_item[1],
            "minutes": top_item[2] or 0,
        } if top_item else None,
        "type_breakdown": [
            {"media_type": row[0], "count": row[1], "minutes": row[2] or 0}
            for row in type_breakdown
        ],
        "activity_by_day": [
            {"date": str(row[0]), "count": row[1]}
            for row in activity_by_day
        ],
    }


# ── Root / health ──────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ── Auth ───────────────────────────────────────────────────────────────────────

@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    validate_password(payload.password)

    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")

    user_role = db.query(Role).filter(Role.name == "user").first()
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(payload.password),
        friend_code=generate_friend_code(),
        role_id=user_role.role_id if user_role else None,
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


@app.get("/auth/ws-token")
def get_ws_token(current_user: User = Depends(get_current_user)):
    # Prune expired tokens
    now = datetime.utcnow()
    expired = [k for k, v in _ws_tokens.items() if v[1] < now]
    for k in expired:
        del _ws_tokens[k]

    token = secrets.token_urlsafe(16)
    from datetime import timedelta
    _ws_tokens[token] = (current_user.user_id, now + timedelta(seconds=60))
    return {"token": token}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@app.post("/auth/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB.")

    ext = (file.filename or "upload").rsplit(".", 1)[-1].lower()
    filename = f"{current_user.user_id}_{int(time.time())}.{ext}"

    if current_user.avatar_url:
        old_name = current_user.avatar_url.rsplit("/", 1)[-1]
        old_path = UPLOAD_DIR / old_name
        if old_path.exists():
            old_path.unlink()

    (UPLOAD_DIR / filename).write_bytes(content)
    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)


# ── Media catalog ──────────────────────────────────────────────────────────────

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
    return [serialize_media_item(item) for item in query.order_by(MediaItem.media_id).all()]


# ── Logs ───────────────────────────────────────────────────────────────────────

@app.get("/logs/stats", response_model=LogStatsResponse)
def get_log_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(ConsumptionLog).filter(
        ConsumptionLog.user_id == current_user.user_id,
        ConsumptionLog.media_id.isnot(None),
    )
    totals = base.with_entities(
        func.count(ConsumptionLog.log_id),
        func.sum(ConsumptionLog.time_consumed),
    ).one()
    top_type = (
        base.join(MediaItem)
        .with_entities(MediaItem.media_type, func.count(ConsumptionLog.log_id).label("n"))
        .group_by(MediaItem.media_type)
        .order_by(func.count(ConsumptionLog.log_id).desc())
        .first()
    )
    return {
        "total_entries": totals[0] or 0,
        "total_minutes": totals[1] or 0,
        "top_media_type": top_type[0] if top_type else None,
    }


@app.get("/logs/wrapped", response_model=WrappedResponse)
def get_wrapped(
    period: str = "all_time",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _compute_wrapped(current_user.user_id, period, db)


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
        .filter(ConsumptionLog.log_id == log_id, ConsumptionLog.user_id == current_user.user_id)
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
        .filter(ConsumptionLog.log_id == log_id, ConsumptionLog.user_id == current_user.user_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    db.delete(log)
    db.commit()


# ── Friends ────────────────────────────────────────────────────────────────────

def _are_friends(db: Session, user_id: int, friend_id: int) -> bool:
    return db.query(Friendship).filter(
        Friendship.user_id == user_id,
        Friendship.friend_id == friend_id,
    ).first() is not None


@app.get("/friends", response_model=list[FriendResponse])
def get_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friends = (
        db.query(User)
        .join(Friendship, and_(Friendship.friend_id == User.user_id, Friendship.user_id == current_user.user_id))
        .all()
    )
    return [serialize_friend(f) for f in friends]


@app.post("/friends/request", response_model=SendRequestResult)
def send_friend_request(
    payload: SendFriendRequestPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    code = payload.friend_code.strip().upper()
    target = db.query(User).filter(User.friend_code == code).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user found with that friend code.")
    if target.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You can't add yourself.")
    if _are_friends(db, current_user.user_id, target.user_id):
        raise HTTPException(status_code=409, detail="You're already friends.")

    existing_req = db.query(FriendRequest).filter(
        FriendRequest.sender_id == current_user.user_id,
        FriendRequest.receiver_id == target.user_id,
    ).first()
    if existing_req:
        raise HTTPException(status_code=409, detail="Friend request already sent.")

    # Mutual request → auto-accept
    reverse = db.query(FriendRequest).filter(
        FriendRequest.sender_id == target.user_id,
        FriendRequest.receiver_id == current_user.user_id,
    ).first()
    if reverse:
        today = date_type.today()
        db.add(Friendship(user_id=current_user.user_id, friend_id=target.user_id, date_friended=today))
        db.add(Friendship(user_id=target.user_id, friend_id=current_user.user_id, date_friended=today))
        db.delete(reverse)
        db.commit()
        return {"status": "accepted", "message": "They had already sent you a request — you're now friends!"}

    db.add(FriendRequest(sender_id=current_user.user_id, receiver_id=target.user_id))
    db.commit()
    return {"status": "sent"}


@app.get("/friends/requests/incoming", response_model=list[FriendRequestResponse])
def get_incoming_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reqs = db.query(FriendRequest).filter(FriendRequest.receiver_id == current_user.user_id).all()
    return [
        {
            "request_id": r.request_id,
            "sender_id": r.sender_id,
            "sender_name": r.sender.name,
            "sender_email": r.sender.email,
            "sender_avatar_url": r.sender.avatar_url,
            "created_at": r.created_at,
        }
        for r in reqs
    ]


@app.post("/friends/requests/{request_id}/accept", status_code=200)
def accept_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(FriendRequest).filter(
        FriendRequest.request_id == request_id,
        FriendRequest.receiver_id == current_user.user_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    today = date_type.today()
    db.add(Friendship(user_id=req.sender_id, friend_id=req.receiver_id, date_friended=today))
    db.add(Friendship(user_id=req.receiver_id, friend_id=req.sender_id, date_friended=today))

    # Clean up any reverse request too
    reverse = db.query(FriendRequest).filter(
        FriendRequest.sender_id == req.receiver_id,
        FriendRequest.receiver_id == req.sender_id,
    ).first()
    if reverse:
        db.delete(reverse)

    db.delete(req)
    db.commit()
    return {"status": "ok"}


@app.delete("/friends/requests/{request_id}", status_code=204)
def decline_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(FriendRequest).filter(
        FriendRequest.request_id == request_id,
        FriendRequest.receiver_id == current_user.user_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    db.delete(req)
    db.commit()


@app.delete("/friends/{friend_id}", status_code=204)
def remove_friend(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.user_id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.user_id),
        )
    ).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Friendship not found.")
    for row in rows:
        db.delete(row)
    db.commit()


@app.get("/friends/{friend_id}/wrapped", response_model=WrappedResponse)
def get_friend_wrapped(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _are_friends(db, current_user.user_id, friend_id):
        raise HTTPException(status_code=403, detail="Not friends.")
    return _compute_wrapped(friend_id, "all_time", db)


# ── Messages ───────────────────────────────────────────────────────────────────

@app.get("/messages/{friend_id}", response_model=list[MessageResponse])
def get_messages(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _are_friends(db, current_user.user_id, friend_id):
        raise HTTPException(status_code=403, detail="Not friends.")

    uid = current_user.user_id
    msgs = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == uid, Message.receiver_id == friend_id),
                and_(Message.sender_id == friend_id, Message.receiver_id == uid),
            )
        )
        .order_by(Message.sent_at.asc())
        .limit(200)
        .all()
    )
    return [serialize_message(m) for m in msgs]


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str):
    entry = _ws_tokens.pop(token, None)
    if not entry or entry[1] < datetime.utcnow():
        await ws.close(code=1008)
        return

    user_id = entry[0]
    await manager.connect(user_id, ws)
    db = SessionLocal()
    try:
        while True:
            data = await ws.receive_json()
            to_id = int(data.get("to", 0))
            content = str(data.get("content", "")).strip()
            if not to_id or not content:
                continue

            if not _are_friends(db, user_id, to_id):
                continue

            msg = Message(sender_id=user_id, receiver_id=to_id, content=content)
            db.add(msg)
            db.commit()
            db.refresh(msg)

            msg_dict = serialize_message(msg)
            await manager.send_to(to_id, msg_dict)
            await ws.send_json(msg_dict)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    finally:
        db.close()
