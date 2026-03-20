from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
import uuid


from dotenv import load_dotenv
load_dotenv()

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

app = FastAPI(title="RAG Document Q&A Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory session store: session_id -> { chain, chat_history }
sessions: dict = {}


class QuestionRequest(BaseModel):
    session_id: str
    question: str


class QuestionResponse(BaseModel):
    answer: str
    session_id: str


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF, chunk it, embed it into a FAISS vector store,
    and return a session_id for follow-up questions.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    session_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.pdf")

    # Save uploaded file
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Load and split
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
    )
    chunks = splitter.split_documents(documents)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

    # Embed locally using sentence-transformers — no API key needed
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )
    vector_store = FAISS.from_documents(chunks, embeddings)
    retriever = vector_store.as_retriever(search_kwargs={"k": 4})

    # Build conversational chain with Gemini 1.5 Flash
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        output_key="answer",
    )
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0,
        convert_system_message_to_human=True,
    )
    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        return_source_documents=False,
    )

    sessions[session_id] = {"chain": chain}

    return {
        "session_id": session_id,
        "filename": file.filename,
        "chunks": len(chunks),
        "message": "Document processed successfully. You can now ask questions.",
    }


@app.post("/ask", response_model=QuestionResponse)
async def ask_question(body: QuestionRequest):
    """
    Ask a question against the uploaded document.
    Maintains conversation history within the session.
    """
    session = sessions.get(body.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a document first.",
        )

    result = session["chain"].invoke({"question": body.question})
    answer = result.get("answer", "I could not find an answer in the document.")

    return QuestionResponse(answer=answer, session_id=body.session_id)


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a session and delete the uploaded file."""
    if session_id in sessions:
        del sessions[session_id]
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}.pdf")
    if os.path.exists(file_path):
        os.remove(file_path)
    return {"message": "Session cleared."}


@app.get("/health")
async def health():
    return {"status": "ok"}