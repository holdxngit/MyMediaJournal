from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import get_db, engine
from .models import Base, MediaItem
from .schemas import MediaItemCreate, MediaItemUpdate, MediaItemResponse

Base.metadata.create_all(bind=engine)

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


@app.get("/")
def read_root():
    return {"message": "Backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/media", response_model=list[MediaItemResponse])
def get_all_media(db: Session = Depends(get_db)):
    return db.query(MediaItem).order_by(MediaItem.media_id).all()


@app.post("/media", response_model=MediaItemResponse, status_code=201)
def create_media(item: MediaItemCreate, db: Session = Depends(get_db)):
    db_item = MediaItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.put("/media/{media_id}", response_model=MediaItemResponse)
def update_media(media_id: int, item: MediaItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(MediaItem).filter(MediaItem.media_id == media_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Media item not found")

    for key, value in item.model_dump().items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/media/{media_id}", status_code=204)
def delete_media(media_id: int, db: Session = Depends(get_db)):
    db_item = db.query(MediaItem).filter(MediaItem.media_id == media_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Media item not found")

    db.delete(db_item)
    db.commit()