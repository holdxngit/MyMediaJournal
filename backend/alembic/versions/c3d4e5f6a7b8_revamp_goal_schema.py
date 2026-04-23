"""revamp_goal_schema

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("goal", sa.Column("goal_type", sa.String(), nullable=True))
    op.execute("UPDATE goal SET goal_type = 'count'")
    op.alter_column("goal", "goal_type", nullable=False)

    op.add_column("goal", sa.Column("target_value", sa.Integer(), nullable=True))
    op.execute("UPDATE goal SET target_value = target_count")

    op.add_column(
        "goal",
        sa.Column(
            "media_item_id",
            sa.Integer(),
            sa.ForeignKey("media_item.media_id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("goal", "media_item_id")
    op.drop_column("goal", "target_value")
    op.drop_column("goal", "goal_type")
