import os
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

os.environ["DATABASE_URL"] = f"sqlite:///./test-data/{uuid4()}.db"
os.environ["DATA_DIR"] = "./test-data"
os.environ["UPLOAD_DIR"] = "./test-data/uploads"
os.environ["CHROMA_DIR"] = "./test-data/chroma"
os.environ["OPENAI_API_KEY"] = "test-key"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.models import Document, Quiz
from app.rag import pipeline
from app import main as api_module


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def register(client: TestClient, email: str):
    response = client.post("/api/auth/register", json={"full_name": "Test Student", "email": email, "password": "a-secure-pass-123"})
    assert response.status_code == 201
    return response.json()


def test_registration_login_and_password_hashing():
    with TestClient(app) as client:
        auth = register(client, "student@example.com")
        assert auth["user"]["email"] == "student@example.com"
        assert "password" not in auth["user"]
        assert "studymind_session" in client.cookies
        session_cookie = next(cookie for cookie in client.cookies.jar if cookie.name == "studymind_session")
        assert session_cookie.has_nonstandard_attr("HttpOnly")
        login = client.post("/api/auth/login", json={"email": "student@example.com", "password": "a-secure-pass-123"})
        assert login.status_code == 200
        assert client.get("/api/auth/me").status_code == 200
        assert client.post("/api/auth/login", json={"email": "student@example.com", "password": "wrong-password"}).status_code == 401


def test_document_listing_is_user_scoped():
    with TestClient(app) as client:
        first = register(client, "first@example.com")
        with __import__("app.database", fromlist=["SessionLocal"]).SessionLocal() as db:
            db.add(Document(user_id=first["user"]["id"], filename="private.pdf", storage_path="", file_size=1, page_count=1, processing_status="ready"))
            db.commit()
        first_docs = client.get("/api/documents")
        with TestClient(app) as second_client:
            register(second_client, "second@example.com")
            second_docs = second_client.get("/api/documents")
            assert second_client.delete(f"/api/documents/{first_docs.json()[0]['id']}").status_code == 404
        assert [item["filename"] for item in first_docs.json()] == ["private.pdf"]
        assert second_docs.json() == []


def test_document_endpoints_require_authentication():
    with TestClient(app) as client:
        assert client.get("/api/documents").status_code == 401


def test_upload_rejects_non_pdf_files():
    with TestClient(app) as client:
        register(client, "upload@example.com")
        response = client.post("/api/documents", files={"file": ("notes.txt", b"not a PDF", "text/plain")})
        assert response.status_code == 415


def test_pdf_extraction_preserves_owner_page_and_chunk_metadata(tmp_path: Path, monkeypatch):
    import pymupdf as fitz

    pdf_path = tmp_path / "lecture.pdf"
    with fitz.open() as pdf:
        page = pdf.new_page()
        page.insert_text((72, 72), "A study document contains this important concept." * 30)
        pdf.save(pdf_path)

    class RecordingStore:
        documents = []
        ids = []

        def add_documents(self, documents, ids):
            self.documents = documents
            self.ids = ids

    store = RecordingStore()
    monkeypatch.setattr(pipeline, "vector_store", lambda: store)
    page_count = pipeline.ingest_pdf(pdf_path, "doc-1", "user-1", "lecture.pdf")

    assert page_count == 1
    assert store.documents
    assert all(item.metadata["user_id"] == "user-1" for item in store.documents)
    assert all(item.metadata["document_id"] == "doc-1" for item in store.documents)
    assert all(item.metadata["page"] == 1 for item in store.documents)
    assert [item.metadata["chunk_id"] for item in store.documents] == store.ids


def test_rag_retrieval_filters_by_owner_and_selected_document(monkeypatch):
    class FakeStore:
        query = None

        def similarity_search(self, query, **kwargs):
            self.query = (query, kwargs)
            return [SimpleNamespace(page_content="Mitosis divides a cell.", metadata={"document_id": "doc-1", "document_name": "biology.pdf", "page": 4, "chunk_id": "chunk-1"})]

    def fake_chat(_prompt):
        return SimpleNamespace(content="Mitosis divides a cell.")

    store = FakeStore()
    monkeypatch.setattr(pipeline, "vector_store", lambda: store)
    monkeypatch.setattr(pipeline, "_providers", lambda: (None, fake_chat))

    answer, citations = pipeline.answer_question("What is mitosis?", ["doc-1"], "user-1", "English")

    assert answer == "Mitosis divides a cell."
    assert store.query[1]["filter"] == {"$and": [{"user_id": "user-1"}, {"document_id": {"$in": ["doc-1"]}}]}
    assert citations == [{"document_id": "doc-1", "document_name": "biology.pdf", "page": 4, "chunk_id": "chunk-1"}]


def test_quiz_submission_is_graded_and_saved_by_backend():
    with TestClient(app) as client:
        register(client, "quiz@example.com")
        with __import__("app.database", fromlist=["SessionLocal"]).SessionLocal() as db:
            owner = db.query(__import__("app.models", fromlist=["User"]).User).filter_by(email="quiz@example.com").one()
            quiz = Quiz(user_id=owner.id, title="Basics", difficulty="Easy", questions=[{"question": "One?", "options": ["A", "B", "C", "D"], "correct_answer": 1, "explanation": "B is correct."}, {"question": "Two?", "options": ["A", "B", "C", "D"], "correct_answer": 3, "explanation": "D is correct."}])
            db.add(quiz)
            db.commit()
            quiz_id = quiz.id

        response = client.post(f"/api/quizzes/{quiz_id}/attempts", json={"answers": [1, 0]})
        assert response.status_code == 200
        assert response.json()["score"] == 1
        assert response.json()["total"] == 2
        assert response.json()["review"][0]["is_correct"] is True
        assert response.json()["review"][1]["correct_answer"] == 3


def test_quiz_size_accepts_only_supported_values():
    with TestClient(app) as client:
        register(client, "size@example.com")
        response = client.post("/api/quizzes", json={"document_ids": ["missing"], "question_count": 6})
        assert response.status_code == 422


def test_notes_and_flashcards_are_saved_with_owned_review_status(monkeypatch):
    class FakeStore:
        def similarity_search(self, *_args, **_kwargs):
            return [SimpleNamespace(page_content="Mitosis is cell division that produces two daughter cells.", metadata={"page": 2})]

    class FakeModel:
        def invoke(self, prompt):
            if "flashcards as JSON" in prompt:
                return SimpleNamespace(content=json.dumps([{"question": f"Question {index}?", "answer": f"Answer {index}."} for index in range(5)]))
            return SimpleNamespace(content="# Mitosis\n- Cell division produces two daughter cells.")

    monkeypatch.setattr(api_module, "vector_store", lambda: FakeStore())
    monkeypatch.setattr(api_module, "_providers", lambda: (None, FakeModel()))
    with TestClient(app) as client:
        owner = register(client, "notes@example.com")
        with __import__("app.database", fromlist=["SessionLocal"]).SessionLocal() as db:
            document = Document(user_id=owner["user"]["id"], filename="biology.pdf", storage_path="", file_size=10, page_count=2, processing_status="ready")
            db.add(document)
            db.commit()
            document_id = document.id

        note_response = client.post("/api/notes/generate", json={"document_id": document_id, "title": "Cell revision", "style": "Revision notes"})
        assert note_response.status_code == 201
        assert "daughter cells" in note_response.json()["content"]
        assert len(client.get("/api/notes").json()) == 1

        cards_response = client.post("/api/flashcards/generate", json={"document_ids": [document_id], "title": "Cell cards", "card_count": 5})
        assert cards_response.status_code == 201
        cards = cards_response.json()["cards"]
        assert len(cards) == 5
        updated = client.patch(f"/api/flashcards/{cards[0]['id']}", json={"review_status": "learned"})
        assert updated.json()["review_status"] == "learned"
        assert client.get("/api/flashcards").json()[0]["cards"][0]["review_status"] == "learned"

        with TestClient(app) as another_client:
            register(another_client, "other-notes@example.com")
            assert another_client.patch(f"/api/flashcards/{cards[0]['id']}", json={"review_status": "needs_review"}).status_code == 404
            assert another_client.get("/api/notes").json() == []