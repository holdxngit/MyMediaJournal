"""drop_wrapped_report

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-23 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('wrapped_report')


def downgrade() -> None:
    op.create_table(
        'wrapped_report',
        sa.Column('report_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('most_used_media', sa.Integer(), nullable=True),
        sa.Column('goal', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['goal'], ['goal.goal_id']),
        sa.ForeignKeyConstraint(['most_used_media'], ['media_item.media_id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.user_id']),
        sa.PrimaryKeyConstraint('report_id'),
    )
