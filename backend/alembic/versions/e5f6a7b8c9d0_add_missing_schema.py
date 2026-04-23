"""add_missing_schema

Covers everything that was previously only created by ensure_dev_schema() at
runtime — role table, friend_request, message, and the extra user columns.
Uses if_not_exists / ON CONFLICT everywhere so it is safe to run against
databases that were already patched by the ensure_* helpers.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── role ──────────────────────────────────────────────────────────────────
    op.create_table(
        "role",
        sa.Column("role_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.PrimaryKeyConstraint("role_id"),
        sa.UniqueConstraint("name"),
        if_not_exists=True,
    )
    op.execute("INSERT INTO role (name) VALUES ('user')  ON CONFLICT DO NOTHING")
    op.execute("INSERT INTO role (name) VALUES ('admin') ON CONFLICT DO NOTHING")

    # ── user extra columns ────────────────────────────────────────────────────
    op.add_column("user", sa.Column("friend_code", sa.String(11), nullable=True), if_not_exists=True)
    op.add_column("user", sa.Column("avatar_url",  sa.String(),   nullable=True), if_not_exists=True)
    op.add_column(
        "user",
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("role.role_id"), nullable=True),
        if_not_exists=True,
    )

    # Backfill role_id for existing users
    op.execute(
        'UPDATE "user" SET role_id = (SELECT role_id FROM role WHERE name = \'user\') '
        "WHERE role_id IS NULL"
    )

    # ── friend_request ────────────────────────────────────────────────────────
    op.create_table(
        "friend_request",
        sa.Column("request_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sender_id",   sa.Integer(), nullable=False),
        sa.Column("receiver_id", sa.Integer(), nullable=False),
        sa.Column("created_at",  sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["sender_id"],   ["user.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["receiver_id"], ["user.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("request_id"),
        sa.UniqueConstraint("sender_id", "receiver_id"),
        if_not_exists=True,
    )

    # ── message ───────────────────────────────────────────────────────────────
    op.create_table(
        "message",
        sa.Column("message_id",  sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sender_id",   sa.Integer(), nullable=False),
        sa.Column("receiver_id", sa.Integer(), nullable=False),
        sa.Column("content",     sa.Text(),    nullable=False),
        sa.Column("sent_at",     sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["sender_id"],   ["user.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["receiver_id"], ["user.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("message_id"),
        if_not_exists=True,
    )

    # ── indexes ───────────────────────────────────────────────────────────────
    op.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS ix_user_friend_code '
        'ON "user" (friend_code) WHERE friend_code IS NOT NULL'
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_user_session_token_hash "
        "ON user_session (token_hash)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_consumption_log_user_id "
        "ON consumption_log (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_consumption_log_media_id "
        "ON consumption_log (media_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_message_sender_receiver "
        "ON message (sender_id, receiver_id)"
    )

    # ── legacy goal column defaults (existing DBs only) ───────────────────────
    # These columns were dropped for fresh installs in d4e5f6a7b8c9, but may
    # still exist on databases that bypassed the migration chain. Adding a
    # default prevents NOT NULL violations on INSERT.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'goal' AND column_name = 'start_date' AND is_nullable = 'NO'
            ) THEN
                ALTER TABLE goal ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'goal' AND column_name = 'target_count' AND is_nullable = 'NO'
            ) THEN
                ALTER TABLE goal ALTER COLUMN target_count SET DEFAULT 1;
            END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'goal' AND column_name = 'goal_type' AND is_nullable = 'NO'
            ) THEN
                ALTER TABLE goal ALTER COLUMN goal_type SET DEFAULT 'count';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_table("message")
    op.drop_table("friend_request")
    op.drop_column("user", "role_id")
    op.drop_column("user", "avatar_url")
    op.drop_column("user", "friend_code")
    op.drop_table("role")
