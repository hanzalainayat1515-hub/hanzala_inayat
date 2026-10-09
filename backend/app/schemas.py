from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserView(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    preferred_language: str

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    user: UserView


class DocumentView(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int
    processing_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=8000)
    document_ids: list[str] = Field(min_length=1, max_length=30)
    session_id: str | None = None
    language: str = Field(default="English", max_length=32)


class Citation(BaseModel):
    document_id: str
    document_name: str
    page: int
    chunk_id: str


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    citations: list[Citation]


class QuizGenerateRequest(BaseModel):
    document_ids: list[str] = Field(min_length=1, max_length=30)
    title: str = Field(default="Study quiz", min_length=1, max_length=180)
    difficulty: str = Field(default="Medium", pattern="^(Easy|Medium|Hard)$")
    question_count: int = Field(default=5, ge=5, le=20, multiple_of=5)


class QuizAnswerRequest(BaseModel):
    answers: list[int] = Field(max_length=20)


class GeneratedQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1, max_length=4000)


class NoteGenerateRequest(BaseModel):
    document_id: str
    title: str = Field(min_length=1, max_length=180)
    style: str = Field(default="Revision notes", pattern="^(Short summary|Detailed notes|Revision notes|Key concepts)$")


class FlashcardGenerateRequest(BaseModel):
    document_ids: list[str] = Field(min_length=1, max_length=30)
    title: str = Field(default="Revision cards", min_length=1, max_length=180)
    card_count: int = Field(default=10, ge=5, le=20, multiple_of=5)


class GeneratedFlashcard(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=4000)


class FlashcardReviewRequest(BaseModel):
    review_status: str = Field(pattern="^(learned|needs_review)$")
