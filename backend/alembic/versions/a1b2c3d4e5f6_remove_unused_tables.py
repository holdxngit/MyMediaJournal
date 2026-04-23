"""remove_unused_tables

Revision ID: a1b2c3d4e5f6
Revises: 8b3f6a4d2c91
Create Date: 2026-04-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "8b3f6a4d2c91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("media_item_source")
    op.drop_table("genre_similarity")
    op.drop_table("source")


def downgrade() -> None:
    op.create_table(
        "source",
        sa.Column("source_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("source_id"),
    )
    op.create_table(
        "genre_similarity",
        sa.Column("genre_id_1", sa.Integer(), nullable=False),
        sa.Column("genre_id_2", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["genre_id_1"], ["genre.genre_id"]),
        sa.ForeignKeyConstraint(["genre_id_2"], ["genre.genre_id"]),
        sa.PrimaryKeyConstraint("genre_id_1", "genre_id_2"),
    )
    op.create_table(
        "media_item_source",
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["media_id"], ["media_item.media_id"]),
        sa.ForeignKeyConstraint(["source_id"], ["source.source_id"]),
        sa.PrimaryKeyConstraint("media_id", "source_id"),
    )
