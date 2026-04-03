from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import get_db
from .models import MediaItem, MediaItemGenre, Genre, ConsumptionLog
from .schemas import (
    MediaItemResponse,
    ConsumptionLogCreate,
    ConsumptionLogUpdate,
    ConsumptionLogResponse,
)

app = FastAPI()

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


@app.get("/")
def read_root():
    return {"message": "Backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


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


@app.get("/logs", response_model=list[ConsumptionLogResponse])
def get_logs(user_id: int = 1, db: Session = Depends(get_db)):
    logs = (
        db.query(ConsumptionLog)
        .filter(ConsumptionLog.user_id == user_id)
        .order_by(ConsumptionLog.date_consumed.desc())
        .all()
    )
    return [serialize_log(log) for log in logs]


@app.post("/logs", response_model=ConsumptionLogResponse, status_code=201)
def create_log(payload: ConsumptionLogCreate, db: Session = Depends(get_db)):
    media_item = db.query(MediaItem).filter(MediaItem.media_id == payload.media_id).first()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media item not found")

    log = ConsumptionLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return serialize_log(log)


@app.put("/logs/{log_id}", response_model=ConsumptionLogResponse)
def update_log(log_id: int, payload: ConsumptionLogUpdate, db: Session = Depends(get_db)):
    log = db.query(ConsumptionLog).filter(ConsumptionLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    log.date_consumed = payload.date_consumed
    log.time_consumed = payload.time_consumed
    db.commit()
    db.refresh(log)
    return serialize_log(log)


@app.delete("/logs/{log_id}", status_code=204)
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(ConsumptionLog).filter(ConsumptionLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    db.delete(log)
    db.commit()
