import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import ReactMarkdown from 'react-markdown'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, Check, ChevronDown, CircleHelp, Copy, FileText, GraduationCap, Layers3, Library, LoaderCircle, LogOut, Menu, MessageSquareText, NotebookPen, Plus, RotateCcw, Send, Sparkles, Trash2, UploadCloud, X } from 'lucide-react'
import { api, errorMessage } from './lib/api'
import type { Citation, DashboardData, DocumentItem, Message, User } from './types'

type AuthData = { user: User }
const authSchema = z.object({ full_name: z.string().optional(), email: z.email(), password: z.string().min(8) })
type AuthValues = z.infer<typeof authSchema>

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get<User>('/auth/me').then(({ data }) => setUser(data)).catch(() => setUser(null)).finally(() => setReady(true))
  }, [])

  function onAuth(data: AuthData) {
    setUser(data.user)
    navigate('/')
  }
  function logout() {
    void api.post('/auth/logout')
    setUser(null)
    navigate('/login')
  }

  if (!ready) return <div className="boot-screen"><div className="brand-mark"><BrainCircuit size={24} /></div><LoaderCircle className="spin" size={20} /></div>
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage onAuth={onAuth} />} />
    <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage register onAuth={onAuth} />} />
    <Route path="*" element={user ? <Workspace user={user} logout={logout} mobileNav={mobileNav} setMobileNav={setMobileNav} /> : <Navigate to="/login" replace />} />
  </Routes>
}

function AuthPage({ register = false, onAuth }: { register?: boolean; onAuth: (data: AuthData) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { register: field, handleSubmit, formState: { errors } } = useForm<AuthValues>({ resolver: zodResolver(authSchema), defaultValues: { full_name: '', email: '', password: '' } })
  async function submit(values: AuthValues) {
    if (register && (values.full_name?.trim().length ?? 0) < 2) { setError('Enter your name to create an account.'); return }
    setBusy(true); setError('')
    try {
      const payload = register ? { ...values, full_name: values.full_name?.trim() } : { email: values.email, password: values.password }
      const { data } = await api.post<AuthData>(register ? '/auth/register' : '/auth/login', payload)
      onAuth(data)
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <main className="auth-page">
    <section className="auth-story">
      <Link to="/login" className="brand"><span className="brand-mark"><BrainCircuit size={23} /></span><span>studymind<span className="brand-dot">.</span></span></Link>
      <div className="story-copy"><div className="eyebrow"><span className="eyebrow-line" /> YOUR MATERIAL. YOUR MOMENTUM.</div><h1>Make every study session <em>count.</em></h1><p>Bring your course material together, ask better questions, and turn what you read into what you know.</p><div className="story-note"><div className="note-icon"><Sparkles size={17} /></div><span>One workspace for understanding, not just revision.</span></div></div>
      <div className="story-footer"><span>STUDYMIND AI</span><span>LEARN SMARTER, EVERY DAY</span></div>
      <div className="story-grid" aria-hidden="true" />
    </section>
    <section className="auth-form-side"><div className="auth-mobile-brand"><span className="brand-mark"><BrainCircuit size={22} /></span>studymind<span className="brand-dot">.</span></div><form className="auth-form" onSubmit={handleSubmit(submit)}>
      <div className="form-kicker">{register ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</div><h2>{register ? 'Start learning smarter' : 'Pick up where you left off'}</h2><p className="form-subtitle">{register ? 'Your personal study space is a few details away.' : 'Sign in to return to your study space.'}</p>
      {register && <label className="field">Full name<input autoComplete="name" required minLength={2} placeholder="Your name" {...field('full_name')} />{errors.full_name && <small>{errors.full_name.message}</small>}</label>}
      <label className="field">Email address<input autoComplete="email" type="email" placeholder="you@example.com" {...field('email')} />{errors.email && <small>{errors.email.message}</small>}</label>
      <label className="field">Password<input autoComplete={register ? 'new-password' : 'current-password'} type="password" placeholder="At least 8 characters" {...field('password')} />{errors.password && <small>{errors.password.message}</small>}</label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button button-primary auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : register ? 'Create account' : 'Sign in'}<ArrowUpRight size={17} /></button>
      <div className="auth-switch">{register ? 'Already have an account?' : 'New to StudyMind?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></div>
    </form><div className="auth-legal">Private by design <span>·</span> Your documents stay yours</div></section>
  </main>
}

function Workspace({ user, logout, mobileNav, setMobileNav }: { user: User; logout: () => void; mobileNav: boolean; setMobileNav: (value: boolean) => void }) {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [refresh, setRefresh] = useState(0)
  const [toast, setToast] = useState('')
  useEffect(() => { api.get<DocumentItem[]>('/documents').then(({ data }) => setDocs(data)).catch(() => setDocs([])) }, [refresh])
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 3600) }
  const links = [{ to: '/', label: 'Overview', icon: Library }, { to: '/documents', label: 'My library', icon: FileText }, { to: '/tutor', label: 'AI tutor', icon: MessageSquareText }, { to: '/quiz', label: 'Quiz studio', icon: BrainCircuit }, { to: '/notes', label: 'Study notes', icon: NotebookPen }, { to: '/flashcards', label: 'Flashcards', icon: Layers3 }]
  return <div className="workspace">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <Link className="brand sidebar-brand" to="/"><span className="brand-mark"><BrainCircuit size={22} /></span><span>studymind<span className="brand-dot">.</span></span></Link>
      <div className="sidebar-label">WORKSPACE</div><nav className="main-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileNav(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'AI tutor' && <span className="nav-new">AI</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-symbol"><Sparkles size={15} /></div><strong>Small steps, deep learning.</strong><span>Your material is ready when you are.</span></div><button className="profile-row" onClick={logout}><span className="avatar">{user.full_name.slice(0, 1).toUpperCase()}</span><span className="profile-text"><strong>{user.full_name}</strong><small>{user.email}</small></span><LogOut size={16} /></button></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumbs"><span>Study space</span><span>/</span><strong>{links.find((link) => location.pathname === link.to)?.label || 'Study space'}</strong></div><div className="topbar-right"><span className="status-dot" /> All progress saved <span className="topbar-divider" /><div className="top-avatar">{user.full_name.slice(0, 1).toUpperCase()}</div></div></header>
      <Routes><Route path="/" element={<Dashboard user={user} docs={docs} />} /><Route path="/documents" element={<Documents docs={docs} onChanged={() => setRefresh((value) => value + 1)} notify={notify} />} /><Route path="/tutor" element={<Tutor docs={docs} />} /><Route path="/quiz" element={<QuizStudio docs={docs} notify={notify} />} /><Route path="/notes" element={<Notes docs={docs} notify={notify} />} /><Route path="/flashcards" element={<Flashcards docs={docs} notify={notify} />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>
    </main>{toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
  </div>
}

function Dashboard({ user, docs }: { user: User; docs: DocumentItem[] }) {
  const [data, setData] = useState<DashboardData | null>(null)
  useEffect(() => { api.get<DashboardData>('/dashboard').then(({ data: result }) => setData(result)).catch(() => setData(null)) }, [])
  const metrics = [{ label: 'Study documents', value: data?.document_count ?? '—', icon: FileText, color: 'blue' }, { label: 'Questions explored', value: data?.questions_asked ?? '—', icon: MessageSquareText, color: 'lilac' }, { label: 'Quizzes completed', value: data?.quizzes_completed ?? '—', icon: GraduationCap, color: 'mint' }, { label: 'Average score', value: data ? `${data.average_score}%` : '—', icon: ArrowUpRight, color: 'gold' }]
  const chartData = data?.activity.map((item) => ({ label: item.date, activity: item.items })) || []
  const hasActivity = chartData.some((item) => item.activity > 0)
  return <div className="page-content dashboard-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR STUDY SPACE</div><h1>Good to see you, {user.full_name.split(' ')[0]}<span className="heading-period">.</span></h1><p className="page-subtitle">A little progress today adds up to a lot of understanding.</p></div><Link className="button button-primary" to="/documents"><Plus size={17} /> Add material</Link></div>
    <div className="metric-grid">{metrics.map(({ label, value, icon: Icon, color }) => <section className="metric-card" key={label}><div className={`metric-icon ${color}`}><Icon size={18} /></div><span className="metric-value">{value}</span><span className="metric-label">{label}</span></section>)}</div>
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h2>Learning activity</h2><p>Your library is the start of your study rhythm.</p></div><span className="period-pill">LAST 7 DAYS</span></div>{hasActivity ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 14, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4568db" stopOpacity={0.2} /><stop offset="100%" stopColor="#4568db" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8d96a8', fontSize: 11 }} /><YAxis hide domain={[0, 'dataMax + 1']} /><Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e6eaf1', fontSize: 12 }} /><Area type="monotone" dataKey="activity" stroke="#4568db" strokeWidth={2.4} fill="url(#activityFill)" /></AreaChart></ResponsiveContainer></div> : <div className="empty-chart"><span className="empty-chart-art"><BookOpen size={22} /></span><strong>Your study rhythm starts here</strong><span>Upload a document to begin building your library.</span><Link to="/documents">Open my library <ArrowUpRight size={14} /></Link></div>}</section>
      <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent materials</h2><p>Your latest additions</p></div><Link to="/documents" className="text-link">View all <ArrowUpRight size={14} /></Link></div>{docs.length ? <div className="recent-list">{docs.slice(0, 5).map((doc) => <div className="recent-item" key={doc.id}><div className="file-icon"><FileText size={17} /></div><div className="recent-name"><strong>{doc.filename}</strong><span>{doc.page_count} pages · {formatBytes(doc.file_size)}</span></div><span className={`processing-tag ${doc.processing_status}`}>{doc.processing_status}</span></div>)}</div> : <div className="recent-empty"><div className="empty-file"><FileText size={19} /></div><strong>No materials yet</strong><span>Add your first PDF to get started.</span><Link to="/documents" className="text-link">Go to library <ArrowUpRight size={14} /></Link></div>}</section></div>
    <section className="next-step"><div className="next-icon"><Sparkles size={20} /></div><div><span className="next-kicker">A GOOD NEXT STEP</span><strong>Ask a question about what you’re studying</strong><span>Select material and get answers with page references.</span></div><Link to="/tutor" className="button button-dark">Open AI tutor <ArrowUpRight size={16} /></Link></section>
  </div>
}

function Documents({ docs, onChanged, notify }: { docs: DocumentItem[]; onChanged: () => void; notify: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try { const form = new FormData(); form.append('file', file); await api.post('/documents', form); onChanged(); notify('PDF processed and added to your library.') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }
  async function remove(doc: DocumentItem) {
    if (!window.confirm(`Delete “${doc.filename}” and its indexed content?`)) return
    try { await api.delete(`/documents/${doc.id}`); onChanged(); notify('Document removed.') } catch (err) { setError(errorMessage(err)) }
  }
  const visible = docs.filter((doc) => doc.filename.toLowerCase().includes(query.toLowerCase()))
  return <div className="page-content"><div className="page-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR MATERIALS</div><h1>My library<span className="heading-period">.</span></h1><p className="page-subtitle">A focused home for the material you’re learning from.</p></div><button className="button button-primary" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? <LoaderCircle className="spin" size={17} /> : <UploadCloud size={17} />} Upload PDF</button><input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => upload(event.target.files?.[0])} /></div>
    <div className="library-toolbar"><div className="library-count"><strong>{docs.length}</strong> {docs.length === 1 ? 'document' : 'documents'} <span>·</span> up to 25 MB per PDF</div><label className="search-field"><span className="sr-only">Search library</span><input placeholder="Find a document..." value={query} onChange={(event) => setQuery(event.target.value)} /><CircleHelp size={15} /></label></div>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {visible.length ? <div className="document-table"><div className="document-table-head"><span>DOCUMENT</span><span>SIZE</span><span>PAGES</span><span>STATUS</span><span /></div>{visible.map((doc) => <div className="document-row" key={doc.id}><div className="document-cell"><div className="file-icon large"><FileText size={19} /></div><div><strong>{doc.filename}</strong><span>Added {new Date(doc.created_at).toLocaleDateString()}</span></div></div><span className="table-meta">{formatBytes(doc.file_size)}</span><span className="table-meta">{doc.page_count || '—'}</span><span className={`processing-tag ${doc.processing_status}`}>{doc.processing_status}</span><button className="icon-button danger-icon" title="Delete document" aria-label={`Delete ${doc.filename}`} onClick={() => remove(doc)}><Trash2 size={16} /></button></div>)}</div> : <section className="library-empty"><div className="upload-art"><div className="upload-paper"><FileText size={28} /></div><span className="upload-spark">✳</span></div><h2>{query ? 'No matching documents' : 'Your library is ready for its first chapter'}</h2><p>{query ? 'Try another title or clear your search.' : 'Add a lecture, textbook chapter, or lab manual in PDF format.'}</p>{!query && <button className="button button-primary" onClick={() => inputRef.current?.click()}><UploadCloud size={17} /> Choose a PDF</button>}</section>}
    <p className="privacy-note"><span className="privacy-lock">◈</span> Your documents are private to your account. Scanned PDFs without selectable text need OCR, which is not enabled yet.</p>
  </div>
}

function Tutor({ docs }: { docs: DocumentItem[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [sessionId, setSessionId] = useState<string>()
  const [language, setLanguage] = useState('English')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, busy])
  function toggle(id: string) { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]) }
  async function send(event: FormEvent) {
    event.preventDefault()
    if (!question.trim() || !selected.length || busy) return
    const prompt = question.trim(); setQuestion(''); setError(''); setMessages((items) => [...items, { role: 'user', content: prompt }]); setBusy(true)
    try { const { data } = await api.post<{ answer: string; session_id: string; citations: Citation[] }>('/chat', { question: prompt, document_ids: selected, session_id: sessionId, language }); setSessionId(data.session_id); setMessages((items) => [...items, { role: 'assistant', content: data.answer, citations: data.citations }]) }
    catch (err) { setError(errorMessage(err)); setMessages((items) => items.slice(0, -1)) } finally { setBusy(false) }
  }
  return <div className="tutor-page"><div className="tutor-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> STUDY WITH CONTEXT</div><h1>AI tutor<span className="heading-period">.</span></h1><p className="page-subtitle">Answers grounded in your material, with the page to check.</p></div><label className="language-select"><span>REPLY IN</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Urdu</option><option>Roman Urdu</option></select><ChevronDown size={14} /></label></div>
    <div className="tutor-layout"><aside className="source-panel"><div className="source-head"><span className="source-heading-icon"><Library size={16} /></span><div><strong>Study sources</strong><span>{selected.length} selected</span></div></div><div className="source-instruction">Choose the material for this conversation.</div>{docs.filter((doc) => doc.processing_status === 'ready').length ? <div className="source-list">{docs.filter((doc) => doc.processing_status === 'ready').map((doc) => <label className={`source-option ${selected.includes(doc.id) ? 'selected' : ''}`} key={doc.id}><input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggle(doc.id)} /><span className="source-checkbox">{selected.includes(doc.id) && <Check size={12} />}</span><FileText size={16} /><span className="source-doc-name">{doc.filename}</span></label>)}</div> : <div className="source-empty"><FileText size={20} /><span>Add a processed PDF to use it here.</span><Link to="/documents">Open library <ArrowUpRight size={13} /></Link></div>}<div className="source-foot"><span className="source-foot-dot" /> Only your documents are searched</div></aside>
      <section className="chat-panel"><div className="chat-topline"><div className="tutor-orb"><BrainCircuit size={18} /></div><div><strong>StudyMind</strong><span>Document-grounded assistant</span></div><button className="icon-button chat-reset" title="New conversation" aria-label="New conversation" onClick={() => { setMessages([]); setSessionId(undefined); setError('') }}><Plus size={18} /></button></div>
        <div className="chat-messages">{messages.length === 0 ? <div className="chat-welcome"><div className="welcome-spark"><Sparkles size={17} /></div><h2>Let’s work through it.</h2><p>Ask about a concept, a confusing passage, or how two ideas connect. Your sources will be cited by page.</p><div className="suggestion-row">{['Explain a key concept', 'Summarize the main idea', 'What should I review?'].map((text) => <button key={text} onClick={() => setQuestion(text)}>{text}<ArrowUpRight size={12} /></button>)}</div></div> : messages.map((message, index) => <article className={`message ${message.role}`} key={`${index}-${message.role}`}><div className={`message-avatar ${message.role}`}>{message.role === 'assistant' ? <BrainCircuit size={16} /> : 'Y'}</div><div className="message-body"><div className="message-author">{message.role === 'assistant' ? 'StudyMind' : 'You'}</div><div className="markdown-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>{message.citations?.length ? <div className="citation-list">{message.citations.map((citation, citationIndex) => <span className="citation-chip" key={`${citation.chunk_id}-${citationIndex}`}><FileText size={12} />{citation.document_name}<span>p. {citation.page}</span></span>)}</div> : null}</div></article>)}{busy && <div className="assistant-thinking"><span className="message-avatar assistant"><BrainCircuit size={16} /></span><span className="thinking-pips"><i /><i /><i /></span><span>Searching your material…</span></div>}{error && <div className="chat-error" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={14} /></button></div>}<div ref={endRef} /></div>
        <form className="chat-composer" onSubmit={send}><div className="composer-meta"><span><span className="composer-dot" />{selected.length ? `${selected.length} source${selected.length > 1 ? 's' : ''} in context` : 'Select a source to begin'}</span><span>Answers can be imperfect. Check the cited page.</span></div><div className="composer-input"><textarea aria-label="Ask a question" placeholder={selected.length ? 'Ask about your material...' : 'Choose a document from Study sources first'} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(event) } }} disabled={!selected.length || busy} rows={2} /><button className="send-button" disabled={!question.trim() || !selected.length || busy} aria-label="Send question"><Send size={17} /></button></div></form>
      </section></div>
  </div>
}

function QuizStudio({ docs, notify }: { docs: DocumentItem[]; notify: (text: string) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState('Medium')
  const [count, setCount] = useState(5)
  const [quiz, setQuiz] = useState<{ id: string; title: string; questions: { question: string; options: string[]; explanation?: string }[] } | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: number; total: number; percentage: number; review: { correct_answer: number; is_correct: boolean; explanation: string }[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function generate() {
    setBusy(true); setError(''); setResult(null)
    try { const { data } = await api.post('/quizzes', { document_ids: selected, title: 'Study session', difficulty, question_count: count }); setQuiz(data); setAnswers(Array(data.questions.length).fill(-1)) }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function submit() {
    if (!quiz || answers.includes(-1)) { setError('Choose an answer for every question before submitting.'); return }
    setBusy(true); setError('')
    try { const { data } = await api.post(`/quizzes/${quiz.id}/attempts`, { answers }); setResult(data); notify('Quiz attempt saved to your progress.') } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const readyDocs = docs.filter((doc) => doc.processing_status === 'ready')
  return <div className="page-content quiz-page"><div className="page-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" /> ACTIVE RECALL</div><h1>Quiz studio<span className="heading-period">.</span></h1><p className="page-subtitle">Turn your notes into a focused check of what you know.</p></div><span className="quiz-badge"><BrainCircuit size={15} /> BUILT FROM YOUR LIBRARY</span></div>
    {!quiz ? <div className="quiz-builder-grid"><section className="panel quiz-setup"><div className="setup-heading"><span className="setup-icon"><Sparkles size={17} /></span><div><h2>Build a quiz</h2><p>Choose source material and set the pace.</p></div></div><div className="setup-field"><label>Study sources <span>SELECT ONE OR MORE</span></label>{readyDocs.length ? <div className="quiz-doc-list">{readyDocs.map((doc) => <label key={doc.id} className={`quiz-doc ${selected.includes(doc.id) ? 'chosen' : ''}`}><input type="checkbox" checked={selected.includes(doc.id)} onChange={() => setSelected((list) => list.includes(doc.id) ? list.filter((id) => id !== doc.id) : [...list, doc.id])} /><span className="source-checkbox">{selected.includes(doc.id) && <Check size={12} />}</span><FileText size={16} /><span>{doc.filename}</span><small>{doc.page_count} p.</small></label>)}</div> : <div className="quiz-no-docs"><FileText size={18} /><span>No processed PDFs to quiz yet.</span><Link to="/documents">Add study material <ArrowUpRight size={13} /></Link></div>}</div><div className="quiz-options"><div className="setup-field"><label htmlFor="difficulty">Difficulty</label><select id="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div><div className="setup-field"><label htmlFor="question-count">Questions</label><select id="question-count" value={count} onChange={(event) => setCount(Number(event.target.value))}><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={15}>15 questions</option><option value={20}>20 questions</option></select></div></div>{error && <div className="inline-error" role="alert">{error}</div>}<button className="button button-primary generate-button" onClick={generate} disabled={!selected.length || busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Generate quiz <ArrowUpRight size={15} /></button></section><aside className="quiz-aside"><div className="quiz-aside-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="quiz-art-center"><GraduationCap size={31} /></div><span className="orbit-dot dot-a" /><span className="orbit-dot dot-b" /><span className="orbit-dot dot-c" /></div><div className="quiz-aside-copy"><span className="next-kicker">RETRIEVE, DON'T REREAD</span><h3>Practice brings the details into focus.</h3><p>Every question is generated from selected excerpts. Your score is checked and saved by the study workspace.</p></div><div className="quiz-points"><span><Check size={14} /> Source-based questions</span><span><Check size={14} /> Answers checked consistently</span><span><Check size={14} /> Review explanations after</span></div></aside></div> : <div className="quiz-test"><div className="quiz-test-head"><div><button className="back-link" onClick={() => { setQuiz(null); setResult(null) }}>← Quiz setup</button><h2>{quiz.title}</h2><p>{quiz.questions.length} questions <span>·</span> {difficulty}</p></div>{result && <div className="score-stamp"><strong>{result.percentage}%</strong><span>{result.score} / {result.total} correct</span></div>}</div>{quiz.questions.map((item, index) => <section className={`question-card ${result ? (result.review[index]?.is_correct ? 'correct' : 'incorrect') : ''}`} key={index}><div className="question-count">QUESTION {String(index + 1).padStart(2, '0')} <span>{quiz.questions.length}</span></div><h3>{item.question}</h3><div className="answer-options">{item.options.map((option, optionIndex) => <button key={optionIndex} disabled={Boolean(result)} className={`answer-option ${answers[index] === optionIndex ? 'selected' : ''} ${result && result.review[index]?.correct_answer === optionIndex ? 'is-correct' : ''}`} onClick={() => setAnswers((list) => list.map((answer, i) => i === index ? optionIndex : answer))}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>{option}{result && result.review[index]?.correct_answer === optionIndex && <Check size={16} />}</button>)}</div>{result && <div className="explanation"><Sparkles size={15} /><span>{result.review[index]?.explanation}</span></div>}</section>)}{!result && <button className="button button-primary submit-quiz" disabled={busy} onClick={submit}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Submit answers</button>}{result && <button className="button button-primary submit-quiz" onClick={() => { setQuiz(null); setResult(null) }}><Plus size={17} /> Create another quiz</button>}</div>}
  </div>
}

type SavedNote = { id: string; document_id: string; title: string; content: string; created_at: string }
type SavedFlashcard = { id: string; question: string; answer: string; review_status: 'learned' | 'needs_review' }
type SavedFlashcardSet = { id: string; title: string; created_at: string; cards: SavedFlashcard[] }

function Notes({ docs, notify }: { docs: DocumentItem[]; notify: (text: string) => void }) {
  const [notes, setNotes] = useState<SavedNote[]>([])
  const [documentId, setDocumentId] = useState('')
  const [style, setStyle] = useState('Revision notes')
  const [title, setTitle] = useState('Exam revision notes')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.get<SavedNote[]>('/notes').then(({ data }) => setNotes(data)).catch((err) => setError(errorMessage(err))) }, [])
  async function generate() {
    if (!documentId) return
    setBusy(true); setError('')
    try { const { data } = await api.post<SavedNote>('/notes/generate', { document_id: documentId, title, style }); setNotes((current) => [data, ...current]); notify('Source-based notes saved.') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function remove(note: SavedNote) {
    try { await api.delete(`/notes/${note.id}`); setNotes((current) => current.filter((item) => item.id !== note.id)); notify('Notes deleted.') } catch (err) { setError(errorMessage(err)) }
  }
  const readyDocs = docs.filter((doc) => doc.processing_status === 'ready')
  return <div className="page-content"><div className="page-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" /> MAKE IT STICK</div><h1>Study notes<span className="heading-period">.</span></h1><p className="page-subtitle">Turn one of your sources into a clear, saved revision guide.</p></div><span className="quiz-badge"><NotebookPen size={15} /> SOURCE-BASED</span></div>
    <section className="panel notes-builder"><div className="setup-heading"><span className="setup-icon"><Sparkles size={17} /></span><div><h2>Create from a document</h2><p>Generated content stays grounded in selected material.</p></div></div><div className="notes-controls"><label className="setup-field">Source document<select value={documentId} onChange={(event) => setDocumentId(event.target.value)}><option value="">Choose a processed document</option>{readyDocs.map((doc) => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}</select></label><label className="setup-field">Note style<select value={style} onChange={(event) => setStyle(event.target.value)}><option>Short summary</option><option>Detailed notes</option><option>Revision notes</option><option>Key concepts</option></select></label><label className="setup-field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} /></label><button className="button button-primary notes-generate" onClick={generate} disabled={!documentId || !title.trim() || busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Generate notes</button></div>{error && <div className="inline-error" role="alert">{error}</div>}{!readyDocs.length && <div className="notes-no-source">Add and process a selectable-text PDF in your library first.</div>}</section>
    <div className="saved-section-heading"><div><span className="next-kicker">YOUR SAVED WORK</span><h2>Revision shelf <span>{notes.length}</span></h2></div></div>
    {notes.length ? <div className="notes-list">{notes.map((note) => <article className="panel saved-note" key={note.id}><div className="saved-note-head"><div><div className="note-source-label"><FileText size={13} />{docs.find((doc) => doc.id === note.document_id)?.filename || 'Study source'}</div><h3>{note.title}</h3><span>{new Date(note.created_at).toLocaleDateString()}</span></div><div className="saved-note-actions"><button className="icon-button" title="Copy notes" aria-label={`Copy ${note.title}`} onClick={() => navigator.clipboard.writeText(note.content).then(() => notify('Notes copied.')).catch(() => setError('Clipboard access is unavailable.'))}><Copy size={15} /></button><button className="icon-button danger-icon" title="Delete notes" aria-label={`Delete ${note.title}`} onClick={() => void remove(note)}><Trash2 size={15} /></button></div></div><div className="note-markdown markdown-content"><ReactMarkdown>{note.content}</ReactMarkdown></div></article>)}</div> : <div className="notes-empty"><NotebookPen size={21} /><strong>Your revision shelf is empty</strong><span>Choose a source above to build your first set of notes.</span></div>}
  </div>
}

function Flashcards({ docs, notify }: { docs: DocumentItem[]; notify: (text: string) => void }) {
  const [sets, setSets] = useState<SavedFlashcardSet[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [title, setTitle] = useState('Revision cards')
  const [count, setCount] = useState(10)
  const [activeSetId, setActiveSetId] = useState('')
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.get<SavedFlashcardSet[]>('/flashcards').then(({ data }) => { setSets(data); if (data[0]) setActiveSetId(data[0].id) }).catch((err) => setError(errorMessage(err))) }, [])
  const activeSet = sets.find((item) => item.id === activeSetId)
  const card = activeSet?.cards[cardIndex]
  async function generate() {
    setBusy(true); setError('')
    try { const { data } = await api.post<SavedFlashcardSet>('/flashcards/generate', { document_ids: selectedDocs, title, card_count: count }); setSets((current) => [data, ...current]); setActiveSetId(data.id); setCardIndex(0); setFlipped(false); notify('Flashcard set saved.') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function mark(status: 'learned' | 'needs_review') {
    if (!card) return
    try { await api.patch(`/flashcards/${card.id}`, { review_status: status }); setSets((current) => current.map((set) => set.id === activeSet?.id ? { ...set, cards: set.cards.map((item) => item.id === card.id ? { ...item, review_status: status } : item) } : set)); notify(status === 'learned' ? 'Marked as learned.' : 'Added to review.') }
    catch (err) { setError(errorMessage(err)) }
  }
  const readyDocs = docs.filter((doc) => doc.processing_status === 'ready')
  function step(direction: number) { if (!activeSet?.cards.length) return; setCardIndex((current) => (current + direction + activeSet.cards.length) % activeSet.cards.length); setFlipped(false) }
  return <div className="page-content flashcards-page"><div className="page-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" /> ACTIVE RECALL</div><h1>Flashcards<span className="heading-period">.</span></h1><p className="page-subtitle">Retrieve an idea, check your understanding, then choose what to revisit.</p></div><span className="quiz-badge"><Layers3 size={15} /> SPACED PRACTICE</span></div>
    <div className="flashcard-layout"><section className="flashcard-practice"><div className="flashcard-toolbar"><div><span className="next-kicker">CURRENT SET</span><select aria-label="Current flashcard set" value={activeSetId} onChange={(event) => { setActiveSetId(event.target.value); setCardIndex(0); setFlipped(false) }}><option value="">Choose a saved set</option>{sets.map((set) => <option key={set.id} value={set.id}>{set.title} · {set.cards.length}</option>)}</select></div>{card && <span className="card-counter">{String(cardIndex + 1).padStart(2, '0')} <span>/</span> {String(activeSet?.cards.length).padStart(2, '0')}</span>}</div>
      {card ? <><button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((value) => !value)} aria-label={flipped ? 'Show question' : 'Reveal answer'}><span className="flashcard-label">{flipped ? 'ANSWER' : 'QUESTION'}</span><span className="flashcard-content">{flipped ? card.answer : card.question}</span><span className="flashcard-hint"><RotateCcw size={13} /> Tap to {flipped ? 'see question' : 'reveal answer'}</span></button><div className="flashcard-controls"><button className="icon-button" aria-label="Previous flashcard" onClick={() => step(-1)}><ArrowLeft size={17} /></button><button className={`review-button needs-review ${card.review_status === 'needs_review' ? 'marked' : ''}`} onClick={() => void mark('needs_review')}><RotateCcw size={14} /> Review again</button><button className={`review-button learned ${card.review_status === 'learned' ? 'marked' : ''}`} onClick={() => void mark('learned')}><Check size={14} /> Got it</button><button className="icon-button" aria-label="Next flashcard" onClick={() => step(1)}><ArrowRight size={17} /></button></div><div className="flashcard-progress"><span style={{ width: `${((cardIndex + 1) / (activeSet?.cards.length || 1)) * 100}%` }} /></div></> : <div className="flashcard-empty"><Layers3 size={22} /><strong>Pick a set, or make one below</strong><span>Saved flashcards stay here between study sessions.</span></div>}</section>
      <aside className="panel flashcard-builder"><div className="setup-heading"><span className="setup-icon"><Sparkles size={17} /></span><div><h2>Build a card set</h2><p>Generated from your selected material.</p></div></div><label className="setup-field">Set title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} /></label><div className="setup-field"><label>Sources <span>SELECT ONE OR MORE</span></label><div className="quiz-doc-list">{readyDocs.map((doc) => <label className={`quiz-doc ${selectedDocs.includes(doc.id) ? 'chosen' : ''}`} key={doc.id}><input type="checkbox" checked={selectedDocs.includes(doc.id)} onChange={() => setSelectedDocs((list) => list.includes(doc.id) ? list.filter((id) => id !== doc.id) : [...list, doc.id])} /><span className="source-checkbox">{selectedDocs.includes(doc.id) && <Check size={12} />}</span><FileText size={15} /><span>{doc.filename}</span><small>{doc.page_count} p.</small></label>)}</div></div><label className="setup-field">Cards<select value={count} onChange={(event) => setCount(Number(event.target.value))}><option value={5}>5 cards</option><option value={10}>10 cards</option><option value={15}>15 cards</option><option value={20}>20 cards</option></select></label>{error && <div className="inline-error" role="alert">{error}</div>}<button className="button button-primary generate-button" disabled={!selectedDocs.length || !title.trim() || busy} onClick={generate}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Generate cards <ArrowUpRight size={15} /></button></aside></div>
  </div>
}

function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB` }

export default App