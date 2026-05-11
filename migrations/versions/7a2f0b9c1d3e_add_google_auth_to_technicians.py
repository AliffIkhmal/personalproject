"""Add Google auth identity to technicians

Revision ID: 7a2f0b9c1d3e
Revises: e0be7ef51aba
Create Date: 2026-05-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7a2f0b9c1d3e'
down_revision = 'e0be7ef51aba'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('technicians', schema=None) as batch_op:
        batch_op.add_column(sa.Column('google_sub', sa.String(length=255), nullable=True))
        batch_op.create_index('ix_technicians_google_sub', ['google_sub'], unique=True)


def downgrade():
    with op.batch_alter_table('technicians', schema=None) as batch_op:
        batch_op.drop_index('ix_technicians_google_sub')
        batch_op.drop_column('google_sub')
