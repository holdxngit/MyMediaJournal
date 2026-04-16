"""add_account_auth

Revision ID: 8b3f6a4d2c91
Revises: 05fa35fbe2b7
Create Date: 2026-04-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8b3f6a4d2c91"
down_revision: Union[str, Sequence[str], None] = "05fa35fbe2b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("name", sa.String(), nullable=True), if_not_exists=True)
    op.add_column("user", sa.Column("password_hash", sa.String(), nullable=True), if_not_exists=True)
    op.add_column(
        "user",
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        if_not_exists=True,
    )

    op.create_table(
        "user_session",
        sa.Column("session_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.user_id"]),
        sa.PrimaryKeyConstraint("session_id"),
        sa.UniqueConstraint("token_hash"),
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table("user_session")
    op.drop_column("user", "created_at")
    op.drop_column("user", "password_hash")
    op.drop_column("user", "name")
