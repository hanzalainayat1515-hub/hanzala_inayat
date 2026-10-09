export type User = { id: string; full_name: string; email: string; preferred_language: string }
export type DocumentItem = { id: string; filename: string; file_size: number; page_count: number; processing_status: string; created_at: string }
export type Citation = { document_id: string; document_name: string; page: number; chunk_id: string }
export type Message = { role: 'user' | 'assistant'; content: string; citations?: Citation[] }
export type DashboardData = { document_count: number; questions_asked: number; quizzes_completed: number; average_score: number; recent_documents: DocumentItem[]; activity: { date: string; items: number }[] }
