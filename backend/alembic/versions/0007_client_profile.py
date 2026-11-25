"""Client profile fields for per-client deployments. Additive only.

- services.segment: residential | commercial | industrial (NULL = all customers)
- businesses.assistant_instructions: company-approved extra instructions for the AI
  (never override the fixed safety or honesty rules)
- businesses.appointment_policy: how appointments work, read to callers on request

Revision ID: 0007
Revises: 0006
"""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("services", sa.Column("segment", sa.String(20)))
    op.add_column("businesses", sa.Column("assistant_instructions", sa.String(1500)))
    op.add_column("businesses", sa.Column("appointment_policy", sa.String(500)))


def downgrade() -> None:
    op.drop_column("businesses", "appointment_policy")
    op.drop_column("businesses", "assistant_instructions")
    op.drop_column("services", "segment")
