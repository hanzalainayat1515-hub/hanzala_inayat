"""Add saved notes and flashcard sets."""
from alembic import op
import sqlalchemy as sa

revision = "0002_notes_flashcards"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("study_notes", sa.Column("id", sa.String(36), nullable=False), sa.Column("user_id", sa.String(36), nullable=False), sa.Column("document_id", sa.String(36), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_study_notes_document_id", "study_notes", ["document_id"])
    op.create_index("ix_study_notes_user_id", "study_notes", ["user_id"])
    op.create_table("flashcard_sets", sa.Column("id", sa.String(36), nullable=False), sa.Column("user_id", sa.String(36), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_flashcard_sets_user_id", "flashcard_sets", ["user_id"])
    op.create_table("flashcards", sa.Column("id", sa.String(36), nullable=False), sa.Column("set_id", sa.String(36), nullable=False), sa.Column("question", sa.Text(), nullable=False), sa.Column("answer", sa.Text(), nullable=False), sa.Column("review_status", sa.String(24), nullable=False), sa.ForeignKeyConstraint(["set_id"], ["flashcard_sets.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_flashcards_set_id", "flashcards", ["set_id"])


def downgrade() -> None:
    op.drop_index("ix_flashcards_set_id", table_name="flashcards")
    op.drop_table("flashcards")
    op.drop_index("ix_flashcard_sets_user_id", table_name="flashcard_sets")
    op.drop_table("flashcard_sets")
    op.drop_index("ix_study_notes_user_id", table_name="study_notes")
    op.drop_index("ix_study_notes_document_id", table_name="study_notes")
    op.drop_table("study_notes")