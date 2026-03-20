import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API = 'http://localhost:8000'

export default function App() {
  const [sessionId, setSessionId]     = useState(null)
  const [filename, setFilename]       = useState(null)
  const [messages, setMessages]       = useState([])
  const [question, setQuestion]       = useState('')
  const [uploading, setUploading]     = useState(false)
  const [asking, setAsking]           = useState(false)
  const [error, setError]             = useState(null)
  const [chunks, setChunks]           = useState(null)
  const fileRef                       = useRef(null)
  const bottomRef                     = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setError(null)
    setUploading(true)
    setMessages([])
    setSessionId(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await axios.post(`${API}/upload`, form)
      setSessionId(res.data.session_id)
      setFilename(res.data.filename)
      setChunks(res.data.chunks)
      setMessages([{
        role: 'system',
        text: `Document "${res.data.filename}" loaded — ${res.data.chunks} chunks indexed. Ask me anything about it.`
      }])
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Make sure the backend is running.')
    } finally {
      setUploading(false)
    }
  }

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim() || !sessionId || asking) return
    const q = question.trim()
    setQuestion('')
    setAsking(true)
    setError(null)

    setMessages(prev => [...prev, { role: 'user', text: q }])

    try {
      const res = await axios.post(`${API}/ask`, {
        session_id: sessionId,
        question: q,
      })
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.answer }])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get answer.')
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setAsking(false)
    }
  }

  async function handleClear() {
    if (sessionId) {
      await axios.delete(`${API}/session/${sessionId}`).catch(() => {})
    }
    setSessionId(null)
    setFilename(null)
    setMessages([])
    setChunks(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">RAG Q&A Agent</span>
          </div>
          <p className="header-sub">Upload a PDF — ask anything about it</p>
        </div>
      </header>

      <main className="main">
        {/* Upload panel */}
        <div className={`upload-panel ${sessionId ? 'compact' : ''}`}>
          {!sessionId ? (
            <label className="upload-zone">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">⬆</div>
              <div className="upload-label">
                {uploading ? 'Processing document...' : 'Click to upload a PDF'}
              </div>
              <div className="upload-hint">Chunks the document, embeds it, and indexes into FAISS</div>
            </label>
          ) : (
            <div className="doc-badge">
              <span className="doc-icon">📄</span>
              <div className="doc-info">
                <span className="doc-name">{filename}</span>
                <span className="doc-meta">{chunks} chunks indexed</span>
              </div>
              <button className="clear-btn" onClick={handleClear}>✕ Clear</button>
            </div>
          )}
        </div>

        {/* Chat area */}
        {messages.length > 0 && (
          <div className="chat-area">
            {messages.map((m, i) => (
              <div key={i} className={`message message-${m.role}`}>
                <div className="message-bubble">
                  {m.role === 'assistant' && <span className="msg-icon">◈</span>}
                  <span className="msg-text">{m.text}</span>
                </div>
              </div>
            ))}
            {asking && (
              <div className="message message-assistant">
                <div className="message-bubble">
                  <span className="msg-icon">◈</span>
                  <span className="typing">
                    <span></span><span></span><span></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {error && <div className="error-bar">{error}</div>}

        {/* Input */}
        {sessionId && (
          <form className="input-row" onSubmit={handleAsk}>
            <input
              className="question-input"
              type="text"
              placeholder="Ask a question about your document..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={asking}
              autoFocus
            />
            <button
              className="send-btn"
              type="submit"
              disabled={!question.trim() || asking}
            >
              {asking ? '...' : '→'}
            </button>
          </form>
        )}

        {!sessionId && !uploading && (
          <div className="empty-state">
            <div className="empty-steps">
              <div className="step-item"><span className="step-num">1</span>Upload a PDF document</div>
              <div className="step-arrow">→</div>
              <div className="step-item"><span className="step-num">2</span>Document gets chunked &amp; embedded</div>
              <div className="step-arrow">→</div>
              <div className="step-item"><span className="step-num">3</span>Ask questions in natural language</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
