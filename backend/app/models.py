from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, PrimaryKeyConstraint, String
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    friend_code = Column(String(11), nullable=True, unique=True)

    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("ConsumptionLog", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    wrapped_reports = relationship("WrappedReport", back_populates="user")


class UserSession(Base):
    __tablename__ = "user_session"

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    token_hash = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class Friendship(Base):
    __tablename__ = "friendship"
    __table_args__ = (PrimaryKeyConstraint("friend_id", "user_id"),)

    friend_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    date_friended = Column(Date, nullable=False)


class Genre(Base):
    __tablename__ = "genre"

    genre_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)

    media_items = relationship("MediaItemGenre", back_populates="genre")
    goals = relationship("Goal", back_populates="genre")


class Source(Base):
    __tablename__ = "source"

    source_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)

    media_items = relationship("MediaItemSource", back_populates="source")


class MediaItem(Base):
    __tablename__ = "media_item"

    media_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    media_type = Column(String, nullable=False)

    genres = relationship("MediaItemGenre", back_populates="media_item")
    sources = relationship("MediaItemSource", back_populates="media_item")
    logs = relationship("ConsumptionLog", back_populates="media_item")


class MediaItemGenre(Base):
    __tablename__ = "media_item_genre"
    __table_args__ = (PrimaryKeyConstraint("media_id", "genre_id"),)

    media_id = Column(Integer, ForeignKey("media_item.media_id"), nullable=False)
    genre_id = Column(Integer, ForeignKey("genre.genre_id"), nullable=False)

    media_item = relationship("MediaItem", back_populates="genres")
    genre = relationship("Genre", back_populates="media_items")


class MediaItemSource(Base):
    __tablename__ = "media_item_source"
    __table_args__ = (PrimaryKeyConstraint("media_id", "source_id"),)

    media_id = Column(Integer, ForeignKey("media_item.media_id"), nullable=False)
    source_id = Column(Integer, ForeignKey("source.source_id"), nullable=False)

    media_item = relationship("MediaItem", back_populates="sources")
    source = relationship("Source", back_populates="media_items")


class GenreSimilarity(Base):
    __tablename__ = "genre_similarity"
    __table_args__ = (PrimaryKeyConstraint("genre_id_1", "genre_id_2"),)

    genre_id_1 = Column(Integer, ForeignKey("genre.genre_id"), nullable=False)
    genre_id_2 = Column(Integer, ForeignKey("genre.genre_id"), nullable=False)


class ConsumptionLog(Base):
    __tablename__ = "consumption_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    media_id = Column(Integer, ForeignKey("media_item.media_id"), nullable=False)
    date_consumed = Column(Date, nullable=False)
    time_consumed = Column(Integer, nullable=False)  # total minutes

    user = relationship("User", back_populates="logs")
    media_item = relationship("MediaItem", back_populates="logs")


class Goal(Base):
    __tablename__ = "goal"

    goal_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    genre_id = Column(Integer, ForeignKey("genre.genre_id"), nullable=True)
    title = Column(String, nullable=False)
    media_type = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)

    user = relationship("User", back_populates="goals")
    genre = relationship("Genre", back_populates="goals")


class WrappedReport(Base):
    __tablename__ = "wrapped_report"

    report_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    most_used_media = Column(Integer, ForeignKey("media_item.media_id"), nullable=True)
    goal = Column(Integer, ForeignKey("goal.goal_id"), nullable=True)

    user = relationship("User", back_populates="wrapped_reports")
