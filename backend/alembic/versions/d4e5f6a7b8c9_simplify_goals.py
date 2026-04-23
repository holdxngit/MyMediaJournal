"""simplify_goals

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "priority",
        sa.Column("priority_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(20), nullable=False, unique=True),
        sa.PrimaryKeyConstraint("priority_id"),
    )
    op.execute("INSERT INTO priority (name) VALUES ('Low'), ('Medium'), ('High')")

    op.add_column("goal", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("goal", sa.Column("completed", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(
        "goal",
        sa.Column("priority_id", sa.Integer(), sa.ForeignKey("priority.priority_id"), nullable=True),
    )

    op.execute("UPDATE goal SET due_date = CURRENT_DATE + INTERVAL '7 days' WHERE due_date IS NULL")
    op.execute(
        "UPDATE goal SET priority_id = (SELECT priority_id FROM priority WHERE name = 'Medium')"
    )
    op.alter_column("goal", "due_date", nullable=False)

    # Drop old columns that are no longer part of the model
    for col in ("genre_id", "media_item_id", "goal_type", "media_type",
                "target_value", "target_count", "start_date", "end_date"):
        op.drop_column("goal", col)


def downgrade() -> None:
    op.drop_column("goal", "priority_id")
    op.drop_column("goal", "completed")
    op.drop_column("goal", "due_date")
    op.drop_table("priority")
