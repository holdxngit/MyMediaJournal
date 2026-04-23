from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, PrimaryKeyConstraint, String
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Role(Base):
    __tablename__ = "role"

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    friend_code = Column(String(11), nullable=True, unique=True)
    avatar_url = Column(String, nullable=True)
    role_id = Column(Integer, ForeignKey("role.role_id"), nullable=True)

    role = relationship("Role", back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("ConsumptionLog", back_populates="user")
    goals = relationship("Goal", back_populates="user")



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


class FriendRequest(Base):
    __tablename__ = "friend_request"

    request_id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])


class Message(Base):
    __tablename__ = "message"

    message_id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    content = Column(String, nullable=False)
    sent_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])


class Genre(Base):
    __tablename__ = "genre"

    genre_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)

    media_items = relationship("MediaItemGenre", back_populates="genre")


class MediaItem(Base):
    __tablename__ = "media_item"

    media_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    media_type = Column(String, nullable=False)

    genres = relationship("MediaItemGenre", back_populates="media_item")
    logs = relationship("ConsumptionLog", back_populates="media_item")


class MediaItemGenre(Base):
    __tablename__ = "media_item_genre"
    __table_args__ = (PrimaryKeyConstraint("media_id", "genre_id"),)

    media_id = Column(Integer, ForeignKey("media_item.media_id"), nullable=False)
    genre_id = Column(Integer, ForeignKey("genre.genre_id"), nullable=False)

    media_item = relationship("MediaItem", back_populates="genres")
    genre = relationship("Genre", back_populates="media_items")


class ConsumptionLog(Base):
    __tablename__ = "consumption_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    media_id = Column(Integer, ForeignKey("media_item.media_id"), nullable=False)
    date_consumed = Column(Date, nullable=False)
    time_consumed = Column(Integer, nullable=False)  # total minutes

    user = relationship("User", back_populates="logs")
    media_item = relationship("MediaItem", back_populates="logs")


class Priority(Base):
    __tablename__ = "priority"

    priority_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(20), nullable=False, unique=True)

    goals = relationship("Goal", back_populates="priority")


class Goal(Base):
    __tablename__ = "goal"

    goal_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    priority_id = Column(Integer, ForeignKey("priority.priority_id"), nullable=True)
    title = Column(String, nullable=False)
    due_date = Column(Date, nullable=False)
    completed = Column(Integer, nullable=False, default=0)  # 0/1, avoids bool dialect issues

    user = relationship("User", back_populates="goals")
    priority = relationship("Priority", back_populates="goals")

