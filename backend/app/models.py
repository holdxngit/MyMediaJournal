from sqlalchemy import Column, Integer, String, Date, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False, unique=True)

    media_items = relationship("MediaItem", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    wrapped_reports = relationship("WrappedReport", back_populates="user")


class Friendship(Base):
    __tablename__ = "friendship"
    __table_args__ = (PrimaryKeyConstraint("friend_id", "user_id"),)

    friend_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    date_friended = Column(Date, nullable=False)


class MediaItem(Base):
    __tablename__ = "media_item"

    media_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)

    title = Column(String, nullable=False)
    media_type = Column(String, nullable=False)
    date_consumed = Column(Date, nullable=False)
    time_consumed = Column(Integer, nullable=False)  # total minutes

    user = relationship("User", back_populates="media_items")
    genres = relationship("MediaItemGenre", back_populates="media_item")
    sources = relationship("MediaItemSource", back_populates="media_item")


class Source(Base):
    __tablename__ = "source"

    source_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)

    media_items = relationship("MediaItemSource", back_populates="source")


class MediaItemSource(Base):
    __tablename__ = "media_item_source"
    __table_args__ = (PrimaryKeyConstraint("media_id", "source_id"),)

    media_id = Column(Integer, ForeignKey("media_item.media_id"), nullable=False)
    source_id = Column(Integer, ForeignKey("source.source_id"), nullable=False)

    media_item = relationship("MediaItem", back_populates="sources")
    source = relationship("Source", back_populates="media_items")


class Genre(Base):
    __tablename__ = "genre"

    genre_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)

    media_items = relationship("MediaItemGenre", back_populates="genre")
    goals = relationship("Goal", back_populates="genre")


class MediaItemGenre(Base):
    __tablename__ = "media_item_genre"
    __table_args__ = (PrimaryKeyConstraint("media_id", "genre_id"),)

    media_id = Column(Integer, ForeignKey("media_item.media_id"), nullable=False)
    genre_id = Column(Integer, ForeignKey("genre.genre_id"), nullable=False)

    media_item = relationship("MediaItem", back_populates="genres")
    genre = relationship("Genre", back_populates="media_items")


class GenreSimilarity(Base):
    __tablename__ = "genre_similarity"
    __table_args__ = (PrimaryKeyConstraint("genre_id_1", "genre_id_2"),)

    genre_id_1 = Column(Integer, ForeignKey("genre.genre_id"), nullable=False)
    genre_id_2 = Column(Integer, ForeignKey("genre.genre_id"), nullable=False)


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