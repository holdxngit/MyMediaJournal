from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class MediaItem(Base):
    __tablename__ = "media_item"

    media_id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    media_type = Column(String, nullable=False)