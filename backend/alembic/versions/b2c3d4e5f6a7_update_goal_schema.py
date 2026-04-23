"""update_goal_schema

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("goal", "quantity", new_column_name="target_count")
    op.add_column("goal", sa.Column("end_date", sa.Date(), nullable=True))
    op.execute("UPDATE goal SET end_date = start_date + INTERVAL '30 days' WHERE end_date IS NULL")
    op.alter_column("goal", "end_date", nullable=False)


def downgrade() -> None:
    op.drop_column("goal", "end_date")
    op.alter_column("goal", "target_count", new_column_name="quantity")
