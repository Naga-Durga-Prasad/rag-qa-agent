# RAG Document Q&A Agent

A full-stack AI application that lets you upload any PDF and ask natural language questions about its content. Built with LangChain, FAISS, FastAPI, and React.js.

![RAG Architecture](https://i.imgur.com/placeholder.png)

## How It Works

```
PDF Upload → Text Extraction → Chunking → Embedding (OpenAI) → FAISS Index
                                                                      ↓
User Question → Embedding → Similarity Search → Top-K Chunks → LLM (GPT-3.5) → Answer
```

1. **Upload** — PDF is loaded and split into overlapping chunks (1000 tokens, 150 overlap)
2. **Embed** — Each chunk is embedded using OpenAI's `text-embedding-ada-002`
3. **Index** — Embeddings stored in a FAISS vector store for fast similarity search
4. **Retrieve** — User question is embedded and top-4 most relevant chunks are retrieved
5. **Generate** — GPT-3.5-turbo generates an answer grounded in the retrieved context
6. **Memory** — Conversation history is maintained per session using LangChain's `ConversationBufferMemory`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 18, Vite, Axios |
| Backend | Python, FastAPI, Uvicorn |
| AI / LLM | LangChain, OpenAI GPT-3.5-turbo |
| Embeddings | OpenAI text-embedding-ada-002 |
| Vector Store | FAISS (Facebook AI Similarity Search) |
| PDF Parsing | PyPDF |

## Project Structure

```
rag-qa-agent/
├── backend/
│   ├── main.py              # FastAPI app — upload, ask, session endpoints
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Styling
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- OpenAI API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run the server
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload` | Upload PDF, returns `session_id` |
| `POST` | `/ask` | Ask a question with `session_id` |
| `DELETE` | `/session/{id}` | Clear session and delete file |
| `GET` | `/health` | Health check |

### Example API usage

```bash
# Upload a document
curl -X POST http://localhost:8000/upload \
  -F "file=@document.pdf"

# Ask a question
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"session_id": "your-session-id", "question": "What is the main topic?"}'
```

## Key Concepts Demonstrated

- **Retrieval-Augmented Generation (RAG)** — grounding LLM responses in document content
- **Vector similarity search** — using FAISS for efficient nearest-neighbour retrieval
- **Conversational memory** — maintaining context across multi-turn conversations with LangChain
- **Document chunking strategy** — recursive character splitting with overlap for context preservation
- **REST API design** — session-based stateful API with FastAPI
- **Full-stack integration** — React frontend communicating with Python backend

## Author

**Uppalapati Naga Durga Prasad**  
Senior Full Stack Engineer | AI/LLM Integration  
[LinkedIn](https://www.linkedin.com/in/naga-durga-prasad-uppalapati) · [GitHub](https://github.com/Naga-Durga-Prasad)
