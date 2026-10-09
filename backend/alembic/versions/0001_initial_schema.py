"""Create the initial StudyMind schema."""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.String(36), nullable=False), sa.Column("full_name", sa.String(120), nullable=False), sa.Column("email", sa.String(320), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("preferred_language", sa.String(32), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("documents", sa.Column("id", sa.String(36), nullable=False), sa.Column("user_id", sa.String(36), nullable=False), sa.Column("filename", sa.String(255), nullable=False), sa.Column("storage_path", sa.String(1024), nullable=False), sa.Column("file_size", sa.Integer(), nullable=False), sa.Column("page_count", sa.Integer(), nullable=False), sa.Column("processing_status", sa.String(24), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_documents_user_id", "documents", ["user_id"])
    op.create_table("chat_sessions", sa.Column("id", sa.String(36), nullable=False), sa.Column("user_id", sa.String(36), nullable=False), sa.Column("title", sa.String(160), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"])
    op.create_table("quizzes", sa.Column("id", sa.String(36), nullable=False), sa.Column("user_id", sa.String(36), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("difficulty", sa.String(16), nullable=False), sa.Column("questions", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_quizzes_user_id", "quizzes", ["user_id"])
    op.create_table("chat_messages", sa.Column("id", sa.String(36), nullable=False), sa.Column("session_id", sa.String(36), nullable=False), sa.Column("role", sa.String(16), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("citations", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])
    op.create_table("quiz_attempts", sa.Column("id", sa.String(36), nullable=False), sa.Column("quiz_id", sa.String(36), nullable=False), sa.Column("user_id", sa.String(36), nullable=False), sa.Column("score", sa.Integer(), nullable=False), sa.Column("total", sa.Integer(), nullable=False), sa.Column("responses", sa.JSON(), nullable=False), sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_quiz_attempts_quiz_id", "quiz_attempts", ["quiz_id"])
    op.create_index("ix_quiz_attempts_user_id", "quiz_attempts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_quiz_attempts_user_id", table_name="quiz_attempts")
    op.drop_index("ix_quiz_attempts_quiz_id", table_name="quiz_attempts")
    op.drop_table("quiz_attempts")
    op.drop_index("ix_chat_messages_session_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_quizzes_user_id", table_name="quizzes")
    op.drop_table("quizzes")
    op.drop_index("ix_chat_sessions_user_id", table_name="chat_sessions")
    op.drop_table("chat_sessions")
    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_table("documents")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
