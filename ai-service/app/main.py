from __future__ import annotations

import os
import json
import asyncio
import re
import base64
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv, dotenv_values

# Load env using absolute paths so it works regardless of current working directory.
APP_DIR = Path(__file__).resolve().parent
AI_SERVICE_DIR = APP_DIR.parent
REPO_ROOT = AI_SERVICE_DIR.parent

# Load lowest-precedence env first, then override with ai-service/.env so AI model
# selections here are deterministic even when parent shells export old values.
load_dotenv(REPO_ROOT / ".env", override=False)
load_dotenv(REPO_ROOT / "backend" / ".env", override=False)
load_dotenv(AI_SERVICE_DIR / ".env", override=True)

# Force local ai-service env values to win for NVIDIA runtime config.
_AI_ENV = dotenv_values(AI_SERVICE_DIR / ".env")

def _cfg(key: str, default: str = "") -> str:
    return str(_AI_ENV.get(key) or os.getenv(key) or default)

app = FastAPI(title="CEAS LMS AI Service", version="2.0.0")

# ─── Core Config ──────────────────────────────────────────────────
NVIDIA_API_KEY = _cfg("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = _cfg("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = _cfg("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")
NVIDIA_MODEL_FAST = _cfg("NVIDIA_MODEL_FAST", "meta/llama-3.1-8b-instruct")
NVIDIA_PARALLEL_MODELS = [
    m.strip() for m in _cfg("NVIDIA_PARALLEL_MODELS", f"{NVIDIA_MODEL_FAST},{NVIDIA_MODEL}").split(",") if m.strip()
]
AI_TIMEOUT_MS = int(_cfg("AI_SERVICE_TIMEOUT_MS", "30000"))
AI_FAST_TIMEOUT_MS = int(_cfg("AI_FAST_TIMEOUT_MS", "12000"))
AI_REASONING_TIMEOUT_MS = int(_cfg("AI_REASONING_TIMEOUT_MS", "45000"))
NVIDIA_MODEL_EMBEDDING = _cfg("NVIDIA_MODEL_EMBEDDING", "nvidia/nv-embedqa-e5-v5")
VECTOR_INDEX_PATH = AI_SERVICE_DIR / "app" / "data" / "vector_index.json"
VECTOR_INDEX = []
if VECTOR_INDEX_PATH.exists():
    try:
        with open(VECTOR_INDEX_PATH, "r") as f:
            VECTOR_INDEX = json.load(f)
        print(f"Loaded {len(VECTOR_INDEX)} documents into vector index.")
    except Exception as e:
        print(f"Error loading vector index: {e}")
else:
    print(f"Vector index not found at {VECTOR_INDEX_PATH}")

# ─── Task-Specific Models ────────────────────────────────────────
NVIDIA_MODEL_TUTOR = _cfg("NVIDIA_MODEL_TUTOR", NVIDIA_MODEL)
NVIDIA_MODEL_NOTES = _cfg("NVIDIA_MODEL_NOTES", NVIDIA_MODEL)
NVIDIA_MODEL_FLASHCARDS = _cfg("NVIDIA_MODEL_FLASHCARDS", NVIDIA_MODEL_FAST)
NVIDIA_MODEL_SEARCH = _cfg("NVIDIA_MODEL_SEARCH", NVIDIA_MODEL_FAST)
NVIDIA_MODEL_REASONING = _cfg("NVIDIA_MODEL_REASONING", "deepseek/deepseek-r1")
NVIDIA_MODEL_CREATIVE = _cfg("NVIDIA_MODEL_CREATIVE", "google/gemma-3-27b-it")

# ─── Fallback Chain (ordered) ────────────────────────────────────
NVIDIA_FALLBACK_CHAIN = [
    m.strip() for m in _cfg(
        "NVIDIA_FALLBACK_CHAIN",
        f"{NVIDIA_MODEL},{NVIDIA_MODEL_CREATIVE},mistralai/mistral-small-24b-instruct,{NVIDIA_MODEL_FAST}",
    ).split(",") if m.strip()
]

# ─── Model Registry (for /v1/models endpoint) ────────────────────
MODEL_REGISTRY: List[Dict[str, Any]] = [
    {"id": "meta/llama-3.1-70b-instruct", "provider": "Meta", "size": "70B", "strength": "Deep explanations, analysis", "tasks": ["tutor", "notes"]},
    {"id": "meta/llama-3.1-8b-instruct", "provider": "Meta", "size": "8B", "strength": "Fast responses, simple tasks", "tasks": ["flashcards", "search"]},
    {"id": "deepseek/deepseek-r1", "provider": "DeepSeek", "size": "685B-MoE", "strength": "Math, code, step-by-step reasoning", "tasks": ["reasoning"]},
    {"id": "google/gemma-3-27b-it", "provider": "Google", "size": "27B", "strength": "Creative analogies, multilingual", "tasks": ["creative", "notes"]},
    {"id": "mistralai/mistral-small-24b-instruct", "provider": "Mistral", "size": "24B", "strength": "Balanced quality/speed, JSON output", "tasks": ["flashcards", "notes", "search"]},
]


class TutorChatRequest(BaseModel):
    message: str
    courseId: Optional[str] = None
    lessonId: Optional[str] = None
    userRole: Optional[str] = "student"
    context: Dict[str, Any] = Field(default_factory=dict)


class LessonQuestionAnswerRequest(BaseModel):
    question: str
    task: Optional[str] = ""
    language: Optional[str] = "auto"
    currentTimestamp: Optional[float] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    contextAvailability: Dict[str, Any] = Field(default_factory=dict)
    courseTitle: Optional[str] = ""
    sectionTitle: Optional[str] = ""
    lessonTitle: Optional[str] = ""
    transcript: str = ""
    transcriptAvailable: bool = False
    transcriptChunks: List[Dict[str, Any]] = Field(default_factory=list)
    summary: Optional[str] = ""
    allowGlobalKnowledge: bool = True


class NotesGenerateRequest(BaseModel):
    mode: str = "short"
    lessonTitle: str
    courseTitle: Optional[str] = ""
    globalContext: Optional[str] = ""
    lessonContent: str = ""
    sourceType: Optional[str] = ""
    lessonQuestions: List[Dict[str, Any]] = Field(default_factory=list)
    lessonResources: List[Dict[str, Any]] = Field(default_factory=list)


class TranscriptAnalyzeCleanRequest(BaseModel):
    rawTranscript: str
    provider: Optional[str] = "nvidia"
    model: Optional[str] = None
    systemPrompt: Optional[str] = ""
    detectedLanguage: Optional[str] = "auto"
    languageHint: Optional[str] = "auto"
    finalOutputLanguage: Optional[str] = "en"
    mainTopicHint: Optional[str] = ""
    courseTitle: Optional[str] = ""


class SummaryGenerateRequest(BaseModel):
    cleanedTranscript: str
    transcriptAnalysis: Dict[str, Any] = Field(default_factory=dict)
    summaryType: str = "short"
    provider: Optional[str] = "nvidia"
    model: Optional[str] = None
    outputLanguage: Optional[str] = "en"
    prompt: Optional[str] = ""


class FlashcardsGenerateRequest(BaseModel):
    mode: str = "short"
    lessonTitle: str
    courseTitle: Optional[str] = ""
    lessonContent: str = ""
    lessonQuestions: List[Dict[str, Any]] = Field(default_factory=list)


class SemanticSearchRequest(BaseModel):
    query: str
    keywords: List[str] = Field(default_factory=list)
    topCourses: List[Dict[str, Any]] = Field(default_factory=list)
    topLessons: List[Dict[str, Any]] = Field(default_factory=list)
    topNotes: List[Dict[str, Any]] = Field(default_factory=list)


class VectorSearchRequest(BaseModel):
    query: str
    top_k: int = 5
    threshold: float = 0.2


class RagSearchRequest(BaseModel):
    query: str
    context: List[Dict[str, Any]] = Field(default_factory=list)


class ExpandSearchRequest(BaseModel):
    query: str


async def nvidia_chat(
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 600,
    model: Optional[str] = None,
    timeout_ms: Optional[int] = None,
) -> Dict[str, Any]:
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=500, detail="NVIDIA_API_KEY is not configured")

    payload = {
        "model": model or NVIDIA_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    actual_timeout_ms = timeout_ms or AI_TIMEOUT_MS
    async with httpx.AsyncClient(timeout=actual_timeout_ms / 1000.0) as client:
        resp = await client.post(
            f"{NVIDIA_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"NVIDIA API error: {resp.text[:300]}")
        data = resp.json()

    msg = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return {"content": msg, "usage": usage}


async def nvidia_chat_with_fallback_chain(
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 400,
    primary_model: Optional[str] = None,
    timeout_ms: Optional[int] = None,
) -> Dict[str, Any]:
    """Try the primary model, then walk the fallback chain until one succeeds."""
    chain = [primary_model or NVIDIA_MODEL] + [
        m for m in NVIDIA_FALLBACK_CHAIN if m != (primary_model or NVIDIA_MODEL)
    ]
    last_error: Optional[Exception] = None
    for idx, model_name in enumerate(chain):
        try:
            current_timeout = (timeout_ms or 22000) if idx == 0 else 10000
            result = await nvidia_chat(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                model=model_name,
                timeout_ms=current_timeout,
            )
            result["model"] = model_name
            return result
        except (httpx.TimeoutException, httpx.ReadTimeout) as exc:
            last_error = exc
            continue
        except HTTPException as exc:
            if exc.status_code == 502:
                last_error = exc
                continue
            raise
    raise last_error or HTTPException(status_code=504, detail="All models in fallback chain failed")


# Keep backwards-compatible alias
async def nvidia_chat_with_fast_fallback(
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 400,
) -> Dict[str, Any]:
    return await nvidia_chat_with_fallback_chain(messages, temperature=temperature, max_tokens=max_tokens)


async def nvidia_chat_parallel_race(
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 300,
) -> Dict[str, Any]:
    if not NVIDIA_PARALLEL_MODELS:
        return await nvidia_chat_with_fast_fallback(messages, temperature=temperature, max_tokens=max_tokens)

    tasks = [
        asyncio.create_task(
            nvidia_chat(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                model=model_name,
                timeout_ms=AI_FAST_TIMEOUT_MS,
            )
        )
        for model_name in NVIDIA_PARALLEL_MODELS
    ]
    task_to_model = {task: model for task, model in zip(tasks, NVIDIA_PARALLEL_MODELS)}

    errors: List[str] = []
    try:
        while tasks:
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for d in done:
                model_name = task_to_model[d]
                try:
                    result = d.result()
                    result["model"] = model_name
                    for p in pending:
                        p.cancel()
                    if pending:
                        await asyncio.gather(*pending, return_exceptions=True)
                    return result
                except Exception as exc:
                    errors.append(f"{model_name}: {exc}")
            tasks = list(pending)
    finally:
        for t in tasks:
            t.cancel()

    raise HTTPException(status_code=504, detail="All parallel model requests failed or timed out")


def safe_json_parse(content: str) -> Dict[str, Any]:
    text = content.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").replace("\r", " ").replace("\n", " ").split())


def clean_plain_tutor_output(value: str) -> str:
    """Keep tutor responses readable in UIs that render plain text."""
    text = str(value or "")
    text = re.sub(r"```[a-zA-Z]*\n?", "", text).replace("```", "")
    text = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", text)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"__(.*?)__", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    text = re.sub(r"(?m)^\s*[-*]\s+", "- ", text)
    return text.strip()


def build_notes_context(req: NotesGenerateRequest) -> str:
    is_video_summary = req.sourceType in {"video-asr", "transcript", "manual-transcript", "youtube-captions"}
    parts: List[str] = []
    if req.courseTitle:
        parts.append(f"Course: {clean_text(req.courseTitle)}")
    if req.lessonTitle:
        parts.append(f"Lesson: {clean_text(req.lessonTitle)}")
    if req.globalContext:
        parts.append("Global context:\n" + clean_text(req.globalContext))
    if req.lessonContent:
        parts.append(clean_text(req.lessonContent))
    if req.lessonQuestions and not is_video_summary:
        lines = []
        for idx, item in enumerate(req.lessonQuestions[:20]):
            question = clean_text(item.get("question", ""))
            answer = clean_text(item.get("correctAnswer", ""))
            explanation = clean_text(item.get("explanation", ""))
            lines.append(f"Q{idx + 1}: {question} Answer: {answer} Explanation: {explanation}")
        parts.append("Embedded questions:\n" + "\n".join(lines))
    if req.lessonResources and not is_video_summary:
        lines = []
        for item in req.lessonResources[:10]:
            title = clean_text(item.get("title") or item.get("type") or "resource")
            url = clean_text(item.get("url", ""))
            lines.append(f"- {title}: {url}")
        parts.append("Resources:\n" + "\n".join(lines))
    return "\n\n".join([p for p in parts if p]).strip()


def extract_lecture_body(context: str) -> str:
    markers = ["Video transcript:", "Lecture content:", "Lesson content:"]
    for marker in markers:
        if marker in context:
            body = context.split(marker, 1)[1]
            for next_marker in ["\n\nTopic Questions:", "\n\nResources:"]:
                if next_marker in body:
                    body = body.split(next_marker, 1)[0]
            return body.strip()
    return context.strip()


def has_meaningful_lecture_body(context: str) -> bool:
    if not any(marker in context for marker in ["Video transcript:", "Lecture content:", "Lesson content:"]):
        return False
    body = clean_text(extract_lecture_body(context))
    if len(body) < 80:
        return False
    words = [word.strip(".,:;()[]{}\"'").lower() for word in body.split()]
    unique = {word for word in words if len(word) > 2}
    return len(unique) >= 15


def local_notes_from_context(req: NotesGenerateRequest, context: str) -> Dict[str, Any]:
    text = extract_lecture_body(context)
    if not any(marker in context for marker in ["Video transcript:", "Lecture content:", "Lesson content:"]) or len(clean_text(text)) < 80:
        return {
            "summary": f"I could not generate a reliable video lecture summary for \"{req.lessonTitle}\" because automatic transcription did not return enough meaningful spoken content.",
            "keyTakeaways": [
                "The AI needs enough spoken lecture transcript text to build accurate notes.",
                "This video currently has insufficient extracted speech content for reliable summary generation.",
                "Check the lecture audio quality and regenerate.",
            ],
            "mindMap": {"root": req.lessonTitle or "Video lecture", "branches": [{"label": "Transcription Issue", "items": ["clear audio", "spoken lecture", "automatic transcript", "regenerate"]}]},
            "interviewQuestions": [
                {
                    "question": "Why did this lecture summary not generate fully?",
                    "answer": "Automatic speech-to-text did not capture enough meaningful lecture content, so the system avoided hallucinated notes.",
                    "difficulty": "easy",
                }
            ],
            "examples": ["Use a lecture video with clear spoken narration, then regenerate AI Notes."],
            "revisionMaterial": "Check the lecture audio quality, ensure speech is clear, and regenerate AI Notes.",
        }

    sentences = [s.strip() for s in text.replace("?", ".").replace("!", ".").split(".") if len(s.strip()) > 12]
    stopwords = {
        "course", "lesson", "content", "with", "this", "that", "from", "into", "your", "will",
        "about", "there", "their", "what", "when", "where", "which", "resources", "embedded",
    }
    words = [
        token.strip(".,:;()[]{}\"'").lower()
        for token in text.split()
        if 4 <= len(token.strip(".,:;()[]{}\"'")) <= 24
    ]
    keywords: List[str] = []
    for word in words:
        if word not in stopwords and word not in keywords:
            keywords.append(word)
        if len(keywords) >= (10 if req.mode == "detailed" else 7):
            break

    is_detailed = req.mode == "detailed"
    summary_count = 4 if is_detailed else 2
    summary = ". ".join(sentences[:summary_count]).strip()
    if summary:
        summary = summary + "."
    else:
        summary = f"This video lecture explains {req.lessonTitle} and highlights the main ideas students should revise."

    takeaways = sentences[summary_count:summary_count + (7 if req.mode == "detailed" else 5)]
    if not takeaways:
        takeaways = [f"Understand {kw} and how it connects to {req.lessonTitle}." for kw in keywords[:5]]
    if not takeaways:
        takeaways = [
            f"Review the purpose of {req.lessonTitle}.",
            "Connect the lesson topic with the course objectives.",
            "Practice explaining the topic in your own words.",
        ]

    branches = [
        {"label": "Core Concepts", "items": keywords[:3] or [req.lessonTitle]},
        {"label": "Practice Focus", "items": keywords[3:6] or ["examples", "questions", "revision"]},
        {"label": "Revision", "items": keywords[6:9] or ["summary", "key points", "self check"]},
    ]

    interview_questions = [
        {
            "question": f"Explain {kw} in the context of {req.lessonTitle}.",
            "answer": f"{kw} is one of the important ideas to revise from this lesson. Relate it back to the lesson summary and examples.",
            "difficulty": "easy" if idx < 2 else "medium",
        }
        for idx, kw in enumerate((keywords or [req.lessonTitle])[:6])
    ]

    global_context = clean_text(req.globalContext) or f"{req.lessonTitle} belongs to {req.courseTitle or 'this course'} and should be understood as part of the broader learning path."
    detailed_summary = "\n".join([
        "Global Context",
        global_context,
        "",
        "Detailed Lecture Summary",
        summary,
        "",
        "Execution Flow",
        *[f"{idx + 1}. {item}" for idx, item in enumerate(takeaways[:8])],
    ]) if is_detailed else ""

    return {
        "summary": summary,
        "detailedSummary": detailed_summary,
        "keyTakeaways": takeaways[:8],
        "mindMap": {"root": req.lessonTitle or "Lesson", "branches": branches},
        "interviewQuestions": interview_questions,
        "examples": [f"Apply {kw} to a practical course scenario and explain the result." for kw in (keywords or ["this topic"])[:4]],
        "revisionMaterial": "\n".join([
            "Revision Checklist",
            "1. Read the summary once.",
            "2. Revise each key takeaway.",
            "3. Answer the interview questions without looking at the answers.",
            "4. Revisit weak points before the quiz.",
        ]),
    }


def normalize_notes_payload(data: Dict[str, Any], req: NotesGenerateRequest, context: str) -> Dict[str, Any]:
    fallback = local_notes_from_context(req, context)
    if not isinstance(data, dict):
        return fallback
    mind_map = data.get("mindMap") if isinstance(data.get("mindMap"), dict) else fallback["mindMap"]
    return {
        "summary": clean_text(data.get("summary")) or fallback["summary"],
        "detailedSummary": data.get("detailedSummary") if isinstance(data.get("detailedSummary"), str) and data.get("detailedSummary").strip() else fallback.get("detailedSummary", ""),
        "keyTakeaways": data.get("keyTakeaways") if isinstance(data.get("keyTakeaways"), list) and data.get("keyTakeaways") else fallback["keyTakeaways"],
        "mindMap": {
            "root": clean_text(mind_map.get("root")) or req.lessonTitle or "Lesson",
            "branches": mind_map.get("branches") if isinstance(mind_map.get("branches"), list) and mind_map.get("branches") else fallback["mindMap"]["branches"],
        },
        "interviewQuestions": data.get("interviewQuestions") if isinstance(data.get("interviewQuestions"), list) and data.get("interviewQuestions") else fallback["interviewQuestions"],
        "examples": data.get("examples") if isinstance(data.get("examples"), list) and data.get("examples") else fallback["examples"],
        "revisionMaterial": data.get("revisionMaterial") if isinstance(data.get("revisionMaterial"), str) and data.get("revisionMaterial").strip() else fallback["revisionMaterial"],
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "success": True,
        "service": "ai-service",
        "version": "2.0.0",
        "nvidiaConfigured": bool(NVIDIA_API_KEY),
        "models": {
            "primary": NVIDIA_MODEL,
            "fast": NVIDIA_MODEL_FAST,
            "tutor": NVIDIA_MODEL_TUTOR,
            "notes": NVIDIA_MODEL_NOTES,
            "flashcards": NVIDIA_MODEL_FLASHCARDS,
            "search": NVIDIA_MODEL_SEARCH,
            "reasoning": NVIDIA_MODEL_REASONING,
            "creative": NVIDIA_MODEL_CREATIVE,
        },
        "parallelModels": NVIDIA_PARALLEL_MODELS,
        "fallbackChain": NVIDIA_FALLBACK_CHAIN,
    }


@app.get("/v1/models")
async def list_models() -> Dict[str, Any]:
    """List all registered models and their task assignments."""
    return {
        "success": True,
        "data": {
            "registry": MODEL_REGISTRY,
            "taskAssignments": {
                "tutor": NVIDIA_MODEL_TUTOR,
                "notes": NVIDIA_MODEL_NOTES,
                "flashcards": NVIDIA_MODEL_FLASHCARDS,
                "search": NVIDIA_MODEL_SEARCH,
                "reasoning": NVIDIA_MODEL_REASONING,
                "creative": NVIDIA_MODEL_CREATIVE,
            },
            "fallbackChain": NVIDIA_FALLBACK_CHAIN,
            "parallelRacePool": NVIDIA_PARALLEL_MODELS,
        },
    }


@app.post("/v1/tutor/chat")
async def tutor_chat(req: TutorChatRequest) -> Dict[str, Any]:
    attachment_content = clean_text((req.context or {}).get("attachmentContent", ""))
    attachment_name = clean_text((req.context or {}).get("attachmentName", ""))
    lesson_content = clean_text((req.context or {}).get("lessonContent", ""))
    tutor_mode_from_client = clean_text((req.context or {}).get("tutorMode", ""))
    recent_messages = (req.context or {}).get("recentMessages", [])
    recent_text = clean_text(json.dumps(recent_messages, ensure_ascii=False))[:2000]
    
    # Detect question complexity and type
    question_lower = req.message.lower()
    is_deep_question = any(word in question_lower for word in [
        "explain", "why", "how does", "what is", "difference between", "compare",
        "detail", "elaborate", "understand", "concept", "theory", "principle"
    ])
    is_example_request = any(word in question_lower for word in [
        "example", "demonstrate", "show me", "illustrate", "sample", "instance"
    ])
    is_step_by_step = any(word in question_lower for word in [
        "step", "process", "procedure", "how to", "guide", "tutorial"
    ])
    is_reasoning_question = any(word in question_lower for word in [
        "solve", "calculate", "math", "code", "program", "algorithm", "equation",
        "derive", "prove", "logic", "debug", "function", "formula", "compute"
    ])
    is_creative_question = any(word in question_lower for word in [
        "analogy", "story", "metaphor", "imagine", "creative", "fun way",
        "simple terms", "eli5", "like i'm 5", "real life"
    ])
    is_hindi_query = bool(re.search(r"[\u0900-\u097F]", req.message or ""))
    is_confused_signal = any(word in question_lower for word in [
        "samajh nahi", "samjh nahi", "confused", "don't understand", "not clear",
        "difficult", "hard", "samjhao", "easy way", "simple way", "dubara"
    ])
    requested_mode = "Adaptive Mentor Mode"
    if any(word in question_lower for word in ["interview", "viva", "job question"]):
        requested_mode = "Interview Mode"
    elif any(word in question_lower for word in ["exam", "marks", "important questions", "pyq", "test prep"]):
        requested_mode = "Exam Preparation Mode"
    elif any(word in question_lower for word in ["quick", "revise", "revision", "short notes", "summary"]):
        requested_mode = "Quick Revision Mode"
    elif any(word in question_lower for word in ["deep", "detail", "in depth", "advanced"]):
        requested_mode = "Deep Dive Mode"
    elif any(word in question_lower for word in ["code", "debug", "program", "algorithm", "function"]):
        requested_mode = "Coding Mode"
    elif any(word in question_lower for word in ["real life", "real-world", "example", "use case"]):
        requested_mode = "Real-Life Example Mode"
    elif any(word in question_lower for word in ["beginner", "basic", "simple", "easy"]):
        requested_mode = "Beginner Mode"
    elif any(word in question_lower for word in ["socratic", "question by question", "don't tell directly"]):
        requested_mode = "Socratic Learning Mode"
    if tutor_mode_from_client:
        requested_mode = tutor_mode_from_client
    cleaned_msg = (req.message or "").strip().lower()
    is_greeting_or_smalltalk = bool(
        re.fullmatch(
            r"(hi|hello|hey|hii+|hola|namaste|kaise ho\??|kya haal\??|how are you\??|good (morning|afternoon|evening))",
            cleaned_msg,
        )
    )

    # Enhanced system prompt for depth and quality
    system = (
        "You are CEAS LMS Premium AI Tutor: a personal teacher, mentor, and learning companion. "
        "Teach like a real educator sitting beside the student.\n\n"
        "NON-NEGOTIABLE BEHAVIOR:\n"
        "1. Be friendly, patient, supportive, motivational, and conversational.\n"
        "2. Always use available LMS context automatically: course/module/lesson/byte/transcript/notes/quiz/assignment/progress.\n"
        "3. Do NOT repeatedly ask for course details if context is already present.\n"
        "4. If SELECTED COURSE RAG CONTEXT is provided, answer from that selected course first and mention the relevant lesson/lecture naturally.\n"
        "5. Use student progress context to adapt the answer: simpler for not-started lessons, revision-oriented for completed lessons.\n"
        "6. Explain in structured, step-by-step teaching format.\n"
        "7. Use beginner-friendly language first, then deeper insight.\n"
        "8. Include practical examples/analogies whenever useful.\n"
        "9. Detect confusion and simplify further automatically.\n"
        "10. Recommend next study step, weak-area focus, and revision direction.\n"
        "11. If asked in Hindi/Hinglish, respond naturally in Hindi/Hinglish. If asked in English, respond in English.\n"
        "12. Use LEARNER PROFILE context to personalize difficulty, motivation, next action, and examples.\n"
        "13. Never sound like a generic chatbot. Sound like a mentor who remembers learner progress and coaches mastery.\n\n"
        "HUMAN-LIKE TEACHING STYLE:\n"
        "- Start with a direct answer in 1-3 lines.\n"
        "- Then teach from simple level to intermediate level to advanced insight when the question needs depth.\n"
        "- Use analogies, real-world examples, practical use cases, diagrams described in words, and mini practice checks.\n"
        "- If the learner is confused or weak in a topic, simplify automatically and reduce jargon.\n"
        "- If the learner seems strong, add challenge questions or deeper insight.\n"
        "- End learning answers with one useful Next best action from the learner profile when available.\n\n"
        f"CURRENT TEACHING MODE: {requested_mode}\n"
        "Mode behavior:\n"
        "- Beginner Mode: simple words, tiny steps, one analogy.\n"
        "- Exam Preparation Mode: key points, likely questions, scoring tips.\n"
        "- Interview Mode: interviewer-style questions with model answers.\n"
        "- Quick Revision Mode: concise notes, must-remember points, no long lecture.\n"
        "- Deep Dive Mode: layered explanation, edge cases, advanced connections.\n"
        "- Coding Mode: line-by-line reasoning, examples, debugging hints.\n"
        "- Real-Life Example Mode: practical scenarios and use cases.\n"
        "- Socratic Learning Mode: ask one guided question at a time before revealing the full answer.\n\n"
        "PLAIN TEXT FORMATTING RULE:\n"
        "Do not use markdown headings like # or ##. Do not use **bold**, __underline__, markdown tables, or decorative symbols. "
        "Use clean plain-text section titles like Summary:, Key points:, Example:, Steps:, and Next step:. "
        "Use simple bullets with - and numbered steps only when they improve readability. "
        "Only use code fences when the student explicitly asks for code.\n\n"
        "DEFAULT ANSWER SHAPE (for learning questions):\n"
        "- Direct concept answer\n"
        "- Step-by-step explanation\n"
        "- Real-world example\n"
        "- Key takeaways / quick revision points\n"
        "- What to study next\n\n"
        "WHEN RELEVANT, ALSO PROVIDE:\n"
        "- short summary, revision notes, interview questions, practice MCQs\n"
        "- flashcards, assignment/quiz preparation tips tied to current lesson context\n"
        "- one micro-challenge or reflective question after the explanation when useful\n"
    )
    system += (
        "\nLANGUAGE RULE:\n"
        "Always reply in the same language as the student's question. "
        "If student asks in Hindi (or Hinglish), reply in natural Hindi/Hinglish. "
        "If student asks in English, reply in English."
    )

    if lesson_content:
        system += (
            "\n\nSELECTED COURSE MODE:\n"
            "- The student selected a course in the LMS. Treat COURSE/LESSON CONTEXT as the source of truth.\n"
            "- Answer from the selected course context first. Do not invent syllabus items, source numbers, videos, forums, or schedules.\n"
            "- If the exact answer is not present, say that the selected course content does not include that detail, then summarize the closest available course points.\n"
            "- Prefer numbered points or concise bullets for course-specific answers.\n"
            "- When asked about first lecture/lesson, use Lesson 1 from the provided course context.\n"
        )
    
    if attachment_content:
        system += (
            "\n\nDOCUMENT CONTEXT:\n"
            "A trainer or student has uploaded study material. Treat it like the primary textbook for this chat. "
            "Use the uploaded material first before general knowledge. If the document has RAG retrieved excerpts, "
            "answer from those excerpts first. If the user asks for summary, notes, revision, MCQs, interview questions, "
            "chapter-wise explanation, examples, simple explanation, Hindi/Hinglish explanation, or smart search, generate "
            "the requested educational output directly from the uploaded content. Do not say you cannot access the file; "
            "the extracted document content is already provided in the prompt. If something is not present in the uploaded "
            "material, say that clearly and then optionally add a small general note."
            "\n\nDOCUMENT TEACHING MODES:\n"
            "- short-summary: concise overview + 5 key points\n"
            "- detailed-summary: structured explanation with sections and examples\n"
            "- beginner: simple language, analogy, and step-by-step explanation\n"
            "- revision: bullet notes, key takeaways, likely exam/interview points\n"
            "- quiz: practice MCQs with answer and explanation\n"
            "- flashcards: Q/A flashcards for quick revision\n"
            "- interview: interview/viva questions with model answers\n"
            "- chapter-wise: explain by detected chapter/slide/section order\n"
            "- technical: precise explanation with terms, process, and examples\n"
            "- qa: answer the question using relevant document excerpts first"
        )

    # Keep greetings/casual check-ins ultra short and direct.
    if is_greeting_or_smalltalk:
        system += (
            "\nGREETING MODE:\n"
            "If the user message is a greeting or casual check-in, reply in ONE short line only. "
            "Do not explain concepts. Keep it warm and direct."
        )
    elif is_confused_signal:
        system += (
            "\nCONFUSION MODE:\n"
            "Student seems confused. Use extra-simple explanation, shorter steps, and one easy analogy."
        )

    # Build enhanced user prompt with context
    user_parts = [f"STUDENT QUESTION: {req.message}"]
    
    if lesson_content:
        user_parts.append(f"\nCOURSE/LESSON CONTEXT:\n{lesson_content[:8000]}")
    
    if attachment_content:
        user_parts.append(f"\nUPLOADED DOCUMENT: {attachment_name}")
        user_parts.append(f"DOCUMENT CONTENT AND RETRIEVED CONTEXT:\n{attachment_content[:45000]}")
    
    if recent_messages and len(recent_messages) > 1:
        user_parts.append(f"\nCONVERSATION HISTORY:\n{recent_text}")
    
    # Add guidance based on question type
    if is_reasoning_question:
        user_parts.append("\nThink step-by-step. Show your reasoning clearly. For code, include working examples.")
    elif is_creative_question:
        user_parts.append("\nUse creative analogies, stories, and real-life examples to make this engaging and memorable.")
    elif is_deep_question:
        user_parts.append("\nProvide a comprehensive, in-depth explanation with examples and analogies.")
    elif is_example_request:
        user_parts.append("\nProvide multiple clear examples with explanations.")
    elif is_step_by_step:
        user_parts.append("\nProvide a detailed step-by-step guide with explanations for each step.")
    else:
        user_parts.append("\nProvide a clear, thorough answer that helps the student understand deeply.")

    if lesson_content:
        user_parts.append(
            "\nImportant: Answer specifically for the selected course above. Use numbered points. "
            "Avoid generic phrases like 'typically covers' unless the course context is missing that detail."
        )
    
    user = "\n".join(user_parts)

    # ─── Smart Model Selection based on question type ─────────────
    if is_reasoning_question:
        selected_model = NVIDIA_MODEL_REASONING
        selected_timeout = AI_REASONING_TIMEOUT_MS
        max_tokens = 1024
        use_parallel_race = False
    elif is_creative_question:
        selected_model = NVIDIA_MODEL_CREATIVE
        selected_timeout = AI_TIMEOUT_MS
        max_tokens = 800
        use_parallel_race = False
    elif is_deep_question or is_step_by_step:
        selected_model = NVIDIA_MODEL_TUTOR
        selected_timeout = AI_TIMEOUT_MS
        max_tokens = 800
        use_parallel_race = False
    elif is_example_request:
        selected_model = NVIDIA_MODEL_TUTOR
        selected_timeout = AI_TIMEOUT_MS
        max_tokens = 700
        use_parallel_race = False
    else:
        selected_model = NVIDIA_MODEL_TUTOR
        selected_timeout = AI_TIMEOUT_MS
        max_tokens = 600
        use_parallel_race = True

    try:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

        # For general tutoring, race multiple models and return first valid answer.
        if use_parallel_race:
            result = await nvidia_chat_parallel_race(
                messages,
                temperature=0.35 if is_hindi_query else 0.4,
                max_tokens=max_tokens,
            )
        else:
            # For deep/reasoning/creative queries, use selected model + fallback chain.
            result = await nvidia_chat_with_fallback_chain(
                messages,
                temperature=0.35 if is_hindi_query else 0.4,
                max_tokens=max_tokens,
                primary_model=selected_model,
                timeout_ms=selected_timeout,
            )
    except (httpx.TimeoutException, httpx.ReadTimeout, HTTPException):
        return {
            "success": True,
            "data": {
                "message": "I'm experiencing high load right now. Please try asking a more specific question or try again in a moment.",
                "sources": [],
            },
            "meta": {"model": "fallback", "tokens": {"prompt": 0, "completion": 0, "total": 0}},
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI tutor failed: {str(exc)[:180]}")

    return {
        "success": True,
        "data": {
            "message": clean_plain_tutor_output(result["content"]),
            "sources": [],
        },
        "meta": {
            "model": result.get("model", NVIDIA_MODEL),
            "tokens": {
                "prompt": result["usage"].get("prompt_tokens", 0),
                "completion": result["usage"].get("completion_tokens", 0),
                "total": result["usage"].get("total_tokens", 0),
            },
        },
    }


@app.post("/v1/lesson-question/answer")
async def lesson_question_answer(req: LessonQuestionAnswerRequest) -> Dict[str, Any]:
    ctx = req.context or {}
    transcript_obj = ctx.get("transcript", {}) if isinstance(ctx.get("transcript", {}), dict) else {}
    transcript_chunks = transcript_obj.get("chunks") or req.transcriptChunks or []

    chunk_lines = []
    for idx, chunk in enumerate(transcript_chunks[:6]):
        label = clean_text(chunk.get("label") or f"Transcript source {idx + 1}")
        text = clean_text(chunk.get("text") or chunk.get("summary") or "")
        start = chunk.get("start", 0)
        end = chunk.get("end", 0)
        time_label = f" ({start}-{end}s)" if start or end else ""
        if text:
            chunk_lines.append(f"[{idx + 1}] {label}{time_label}: {text[:1200]}")

    transcript_context = "\n\n".join(chunk_lines)
    if not transcript_context and (transcript_obj.get("text") or req.transcript):
        transcript_context = clean_text(transcript_obj.get("text") or req.transcript)[:5000]

    course = ctx.get("course", {}) if isinstance(ctx.get("course", {}), dict) else {}
    section = ctx.get("section", {}) if isinstance(ctx.get("section", {}), dict) else {}
    lesson = ctx.get("lesson", {}) if isinstance(ctx.get("lesson", {}), dict) else {}
    summary = ctx.get("summary", {}) if isinstance(ctx.get("summary", {}), dict) else {}
    availability = req.contextAvailability or ctx.get("availability", {}) or {}

    course_title = clean_text(course.get("title") or req.courseTitle)
    section_title = clean_text(section.get("title") or req.sectionTitle)
    lesson_title = clean_text(lesson.get("title") or req.lessonTitle)

    if not transcript_context and req.transcript:
        transcript_context = clean_text(req.transcript)[:5000]

    def lines_from_items(items: List[Dict[str, Any]], max_items: int = 12) -> str:
        lines: List[str] = []
        for idx, item in enumerate((items or [])[:max_items]):
            if not isinstance(item, dict):
                continue
            compact = json.dumps(item, ensure_ascii=False)[:1500]
            if compact:
                lines.append(f"[{idx + 1}] {compact}")
        return "\n".join(lines)

    summary_text = "\n".join([
        f"Short summary: {clean_text(summary.get('summary') or req.summary)[:1800]}",
        f"Detailed summary: {clean_text(summary.get('detailedSummary'))[:2200]}",
        "Key points: " + "; ".join([clean_text(x) for x in (summary.get("keyTakeaways") or [])[:15]]),
        f"Revision material: {clean_text(summary.get('revisionMaterial'))[:1200]}",
    ]).strip()

    resource_lines = lines_from_items(ctx.get("resources", []), 12)
    flashcard_lines = lines_from_items(ctx.get("flashcards", []), 18)
    qa_lines = lines_from_items(ctx.get("questionAnswers", []), 18)
    knowledge_check_lines = lines_from_items(ctx.get("knowledgeChecks", []), 18)
    student_note_lines = lines_from_items(ctx.get("studentNotes", []), 10)

    system = (
        "You are a lesson learning assistant. Answer the student's question using the complete lesson context, "
        "not only the transcript. Use teacher-provided notes/resources first, then knowledge checks or popup questions, "
        "summary, transcript, flashcards, generated Q&A, and finally general explanation only when lesson context is missing. "
        "If an answer comes from an uploaded image/resource, mention that it is based on an uploaded lesson resource. "
        "If an answer comes from a popup or knowledge check question, mention it as from the lesson knowledge check. "
        "If information is not available in the provided lesson material, say that clearly; add a helpful general explanation only if useful. "
        "Do not hallucinate specific lesson facts, timestamps, trainer statements, or resource contents. "
        "Use the same language as the student's question, including Hindi/Hinglish when the student asks that way. "
        "Keep the answer student-friendly and direct."
    )

    user = (
        f"Task: {clean_text(req.task or 'lesson_ask_ai')}\n"
        f"Course: {course_title}\n"
        f"Course description: {clean_text(course.get('description'))[:1800]}\n"
        f"Section: {section_title}\n"
        f"Lesson: {lesson_title}\n"
        f"Lesson type: {clean_text(lesson.get('type'))}\n"
        f"Lesson description: {clean_text(lesson.get('description'))[:2400]}\n"
        f"Current video timestamp: {req.currentTimestamp}\n"
        f"Available context: {json.dumps(availability, ensure_ascii=False)}\n\n"
        f"Summary context:\n{summary_text or 'No summary provided.'}\n\n"
        f"Teacher uploaded resources/images/links/docs:\n{resource_lines or 'No resources provided.'}\n\n"
        f"Knowledge check / popup questions:\n{knowledge_check_lines or 'No knowledge checks provided.'}\n\n"
        f"Generated Q&A:\n{qa_lines or 'No generated Q&A provided.'}\n\n"
        f"Flashcards:\n{flashcard_lines or 'No flashcards provided.'}\n\n"
        f"Student notes:\n{student_note_lines or 'No student notes provided.'}\n\n"
        f"Relevant transcript chunks:\n{transcript_context or 'No relevant transcript chunks provided.'}\n\n"
        f"Student question: {clean_text(req.question)}\n\n"
        "Give a direct answer using the ranked lesson context. Combine sources when they agree."
    )

    try:
        result = await nvidia_chat_with_fallback_chain(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.35,
            max_tokens=850,
            primary_model=NVIDIA_MODEL_TUTOR,
            timeout_ms=AI_TIMEOUT_MS,
        )
    except (httpx.TimeoutException, httpx.ReadTimeout, HTTPException):
        return {
            "success": True,
            "data": {
                "answer": (
                    "I could not generate a full AI answer right now. "
                    "Please try again in a moment."
                ),
                "sources": transcript_chunks[:4],
            },
            "meta": {"model": "fallback", "tokens": {"prompt": 0, "completion": 0, "total": 0}},
        }

    return {
        "success": True,
        "data": {
            "answer": clean_plain_tutor_output(result["content"]),
            "sources": transcript_chunks[:4],
        },
        "meta": {
            "model": result.get("model", NVIDIA_MODEL),
            "tokens": {
                "prompt": result["usage"].get("prompt_tokens", 0),
                "completion": result["usage"].get("completion_tokens", 0),
                "total": result["usage"].get("total_tokens", 0),
            },
        },
    }


@app.post("/v1/notes/generate")
async def notes_generate(req: NotesGenerateRequest) -> Dict[str, Any]:
    context = build_notes_context(req)
    if not has_meaningful_lecture_body(context):
        return {
            "success": True,
            "data": local_notes_from_context(req, context),
            "meta": {"model": "fallback", "tokens": {"prompt": 0, "completion": 0, "total": 0}},
        }

    lecture_body = extract_lecture_body(context)
    prompt = (
        "Generate JSON only with keys: summary, detailedSummary, keyTakeaways (array), mindMap (object with root and branches), "
        "interviewQuestions (array of {question,answer,difficulty}), examples (array), revisionMaterial (string). "
        "Use the lecture transcript as the source of truth for what happened in the video. "
        "Use globalContext only to introduce background, prerequisites, course objective alignment, and real-world relevance; "
        "do not invent lecture claims from globalContext. "
        "For detailed mode, detailedSummary must start with a 'Global Context' section, then 'Detailed Lecture Summary', then 'Execution Flow'. "
        "For short mode, keep detailedSummary empty. "
        "Do not summarize resource URLs, timestamp labels, or placeholder values as if they were lecture content. "
        f"Mode: {req.mode}. Lesson: {req.lessonTitle}. GlobalContext: {clean_text(req.globalContext)[:1800]}. Transcript: {lecture_body[:9000]}"
    )
    try:
        result = await nvidia_chat_with_fallback_chain(
            [
                {"role": "system", "content": "You create structured educational notes in strict JSON. Summarize the actual video lecture transcript/content, not metadata labels."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=1400 if req.mode == "detailed" else 700,
            primary_model=NVIDIA_MODEL_NOTES,
        )
    except (httpx.TimeoutException, httpx.ReadTimeout):
        return {
            "success": True,
            "data": local_notes_from_context(req, context),
            "meta": {"model": "fallback", "tokens": {"prompt": 0, "completion": 0, "total": 0}},
        }
    except HTTPException:
        return {
            "success": True,
            "data": local_notes_from_context(req, context),
            "meta": {"model": "fallback", "tokens": {"prompt": 0, "completion": 0, "total": 0}},
        }
    try:
        parsed = normalize_notes_payload(safe_json_parse(result["content"]), req, context)
    except Exception:
        parsed = local_notes_from_context(req, context)

    return {
        "success": True,
        "data": parsed,
        "meta": {
            "model": result.get("model", NVIDIA_MODEL),
            "tokens": {
                "prompt": result["usage"].get("prompt_tokens", 0),
                "completion": result["usage"].get("completion_tokens", 0),
                "total": result["usage"].get("total_tokens", 0),
            },
        },
    }


def robust_extract_clean_result(content: str) -> Dict[str, Any]:
    import ast
    # 1. Try standard safe_json_parse
    try:
        parsed = safe_json_parse(content)
        if isinstance(parsed, dict) and "cleanedTranscript" in parsed:
            return parsed
    except Exception:
        pass

    text = content.strip().replace("```json", "").replace("```", "").strip()
    
    # 2. Try closing quotes and brackets to repair truncated JSON
    for suffix in ['"}', '"}}', '}', '}}']:
        try:
            parsed = json.loads(text + suffix)
            if isinstance(parsed, dict) and "cleanedTranscript" in parsed:
                return parsed
        except Exception:
            pass

    # 3. Use ast.literal_eval fallback
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        json_candidate = text[start : end + 1]
        try:
            cleaned_candidate = json_candidate.replace("true", "True").replace("false", "False").replace("null", "None")
            val = ast.literal_eval(cleaned_candidate)
            if isinstance(val, dict) and "cleanedTranscript" in val:
                return val
        except Exception:
            pass

    # 4. Regex-based extraction of cleanedTranscript
    cleaned_transcript = ""
    match = re.search(r'"cleanedTranscript"\s*:\s*"(.*?)"', text, re.DOTALL)
    if match:
        raw_val = match.group(1)
        if raw_val.endswith('\\'):
            raw_val = raw_val[:-1]
        cleaned_transcript = raw_val
    else:
        # Fallback manual string scan
        idx = text.find('"cleanedTranscript"')
        if idx >= 0:
            sub = text[idx + len('"cleanedTranscript"'):].strip()
            if sub.startswith(':') or sub.startswith('='):
                sub = sub[1:].strip()
            if sub.startswith('"'):
                buf = []
                escaped = False
                for char in sub[1:]:
                    if escaped:
                        buf.append(char)
                        escaped = False
                    elif char == '\\':
                        escaped = True
                    elif char == '"':
                        break
                    else:
                        buf.append(char)
                cleaned_transcript = "".join(buf)

    if cleaned_transcript.strip():
        # Extracted something! Construct analysis dict
        main_topics = []
        topic_match = re.search(r'"mainTopics"\s*:\s*\[(.*?)\]', text, re.DOTALL)
        if topic_match:
            topics_str = topic_match.group(1)
            main_topics = [t.strip().strip('"').strip("'") for t in topics_str.split(',') if t.strip()]

        lang_match = re.search(r'"detectedLanguageStyle"\s*:\s*"(.*?)"', text)
        lang = lang_match.group(1) if lang_match else "english"

        size_match = re.search(r'"estimatedLectureSize"\s*:\s*"(.*?)"', text)
        size = size_match.group(1) if size_match else "medium"

        return {
            "cleanedTranscript": cleaned_transcript,
            "analysis": {
                "wordCount": len(cleaned_transcript.split()),
                "estimatedLectureSize": size,
                "detectedLanguageStyle": lang,
                "mainTopics": main_topics,
                "recommendedSummaryLength": size
            }
        }

    raise ValueError("Could not parse or extract cleanedTranscript from response")


def python_fallback_analysis(raw_transcript: str) -> Dict[str, Any]:
    cleaned = clean_text(raw_transcript)
    words = cleaned.split()
    count = len(words)
    
    stopwords = {"this", "that", "with", "from", "have", "will", "lecture", "lesson", "video", "about", "there", "their", "student", "teacher", "you", "your", "they", "them", "what", "when", "where", "which"}
    word_counts = {}
    for w in words:
        w_clean = re.sub(r'[^a-zA-Z0-9]', '', w).lower()
        if len(w_clean) >= 4 and w_clean not in stopwords:
            word_counts[w_clean] = word_counts.get(w_clean, 0) + 1
            
    sorted_topics = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    main_topics = [w for w, c in sorted_topics[:8]]
    
    size = "small" if count < 900 else "medium" if count < 3200 else "long"
    
    return {
        "cleanedTranscript": cleaned,
        "analysis": {
            "wordCount": count,
            "estimatedLectureSize": size,
            "detectedLanguageStyle": "mixed",
            "mainTopics": main_topics,
            "recommendedSummaryLength": size
        }
    }


@app.post("/v1/transcript/analyze-clean")
async def transcript_analyze_clean(req: TranscriptAnalyzeCleanRequest) -> Dict[str, Any]:
    raw = clean_text(req.rawTranscript)
    if len(raw) < 40:
        raise HTTPException(status_code=400, detail="Raw transcript is empty or too short")

    model = req.model or _cfg("TRANSCRIPT_ANALYSIS_MODEL", _cfg("TRANSCRIPT_CLEANER_MODEL", NVIDIA_MODEL_NOTES))
    system_prompt = req.systemPrompt or (
        "You are an expert educational transcript analyst for an LMS platform. "
        "Clean the transcript into English-only educational content and return strict JSON."
    )
    user_prompt = (
        "Analyze and clean this raw lecture transcript. Remove non-educational classroom talk, filler, repetition, "
        "background noise, greetings, jokes, and unrelated content. Translate Hindi/Hinglish/Indian-language educational "
        "content into clear English. Do not summarize or invent information. Preserve lecture order.\n"
    )
    if req.mainTopicHint:
        user_prompt += f"Primary Topic Hint: {req.mainTopicHint}\n"
    if req.courseTitle:
        user_prompt += f"Course Title: {req.courseTitle}\n"
    if req.detectedLanguage and req.detectedLanguage != 'auto':
        user_prompt += f"Source language is detected as: {req.detectedLanguage}\n"
        
    user_prompt += (
        "\nReturn strict JSON only with this shape:\n"
        "{\"cleanedTranscript\":\"...\",\"analysis\":{\"wordCount\":0,\"estimatedLectureSize\":\"small|medium|long\","
        "\"detectedLanguageStyle\":\"english|hinglish|hindi|indian_language|mixed\",\"mainTopics\":[],"
        "\"recommendedSummaryLength\":\"short|medium|long\"}}\n\n"
        f"Raw Transcript:\n{req.rawTranscript[:18000]}"
    )

    try:
        result = await nvidia_chat_with_fallback_chain(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.15,
            max_tokens=2200,
            primary_model=model,
            timeout_ms=AI_REASONING_TIMEOUT_MS,
        )
        
        parsed = robust_extract_clean_result(result["content"])
        cleaned = clean_text(parsed.get("cleanedTranscript", ""))
        words = len(cleaned.split())
        
        # If words is extremely short but raw is not, check if we need to fall back
        if words < 10 and len(raw.split()) > 30:
            print("[TRANSCRIPT-ANALYSIS] Model returned too few words, falling back to rule-based analysis")
            parsed = python_fallback_analysis(req.rawTranscript)
            cleaned = parsed["cleanedTranscript"]
            
        analysis = parsed.get("analysis") or {}
        analysis["wordCount"] = int(analysis.get("wordCount") or words)
        analysis["estimatedLectureSize"] = analysis.get("estimatedLectureSize") or ("small" if words < 900 else "medium" if words < 3200 else "long")
        if analysis["estimatedLectureSize"] not in {"small", "medium", "long"}:
            analysis["estimatedLectureSize"] = "small" if words < 900 else "medium" if words < 3200 else "long"
        analysis["recommendedSummaryLength"] = analysis.get("recommendedSummaryLength") or analysis["estimatedLectureSize"]
        analysis["mainTopics"] = analysis.get("mainTopics") if isinstance(analysis.get("mainTopics"), list) else []

        return {
            "success": True,
            "data": {
                "cleanedTranscript": cleaned,
                "analysis": analysis,
                "model": result.get("model", model),
            },
            "meta": {
                "model": result.get("model", model),
                "tokens": {
                    "prompt": result["usage"].get("prompt_tokens", 0),
                    "completion": result["usage"].get("completion_tokens", 0),
                    "total": result["usage"].get("total_tokens", 0),
                },
            },
        }

    except Exception as exc:
        print(f"[TRANSCRIPT-ANALYSIS] Endpoint exception: {str(exc)}. Falling back to safe python analysis.")
        fallback_data = python_fallback_analysis(req.rawTranscript)
        return {
            "success": True,
            "data": {
                "cleanedTranscript": fallback_data["cleanedTranscript"],
                "analysis": fallback_data["analysis"],
                "model": "rule-based-fallback",
            },
            "meta": {
                "model": "rule-based-fallback",
                "tokens": {"prompt": 0, "completion": 0, "total": 0},
            },
        }


@app.post("/v1/summary/generate")
async def summary_generate(req: SummaryGenerateRequest) -> Dict[str, Any]:
    cleaned = clean_text(req.cleanedTranscript)
    if len(cleaned) < 40:
        raise HTTPException(status_code=400, detail="Cleaned transcript is empty or too short")

    summary_type = req.summaryType if req.summaryType in {"short", "detailed"} else "short"
    model = req.model or _cfg("SUMMARY_MODEL", NVIDIA_MODEL_NOTES)
    prompt = req.prompt or (
        f"Create an English-only {summary_type} student-facing markdown summary from this cleaned lecture transcript. "
        f"Transcript analysis: {json.dumps(req.transcriptAnalysis, ensure_ascii=False)}\n\n"
        f"Cleaned transcript:\n{req.cleanedTranscript[:22000]}"
    )

    result = await nvidia_chat_with_fallback_chain(
        [
            {"role": "system", "content": "You create student-facing LMS lecture summaries in English-only markdown. Follow the requested structure exactly."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.25 if summary_type == "detailed" else 0.2,
        max_tokens=3200 if summary_type == "detailed" else 1600,
        primary_model=model,
        timeout_ms=AI_REASONING_TIMEOUT_MS,
    )

    summary = str(result.get("content") or "").strip()
    if len(summary) < 80:
        raise HTTPException(status_code=502, detail="Summary generation returned too little content")

    return {
        "success": True,
        "data": {
            "summary": summary,
            "summaryType": summary_type,
            "summaryLanguage": req.outputLanguage or "en",
            "model": result.get("model", model),
        },
        "meta": {
            "model": result.get("model", model),
            "tokens": {
                "prompt": result["usage"].get("prompt_tokens", 0),
                "completion": result["usage"].get("completion_tokens", 0),
                "total": result["usage"].get("total_tokens", 0),
            },
        },
    }


@app.post("/v1/flashcards/generate")
async def flashcards_generate(req: FlashcardsGenerateRequest) -> Dict[str, Any]:
    prompt = (
        "Create JSON only: {cards:[{front,back,difficulty,tags}]} from the lesson content. "
        f"Mode: {req.mode}. Lesson: {req.lessonTitle}. Content: {req.lessonContent[:7000]}"
    )
    try:
        result = await nvidia_chat_with_fallback_chain(
            [
                {"role": "system", "content": "You generate flashcards in strict JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=650,
            primary_model=NVIDIA_MODEL_FLASHCARDS,
        )
    except (httpx.TimeoutException, httpx.ReadTimeout):
        return {
            "success": True,
            "data": {"cards": []},
            "meta": {"model": "fallback", "tokens": {"prompt": 0, "completion": 0, "total": 0}},
        }

    try:
        parsed = safe_json_parse(result["content"])
    except Exception:
        parsed = {"cards": []}
    cards = parsed.get("cards", []) if isinstance(parsed, dict) else []

    return {
        "success": True,
        "data": {"cards": cards},
        "meta": {
            "model": result.get("model", NVIDIA_MODEL),
            "tokens": {
                "prompt": result["usage"].get("prompt_tokens", 0),
                "completion": result["usage"].get("completion_tokens", 0),
                "total": result["usage"].get("total_tokens", 0),
            },
        },
    }


@app.post("/v1/search/semantic")
async def semantic_search(req: SemanticSearchRequest) -> Dict[str, Any]:
    prompt = (
        "From query and candidate results, return JSON only with keys suggestions (array of strings) "
        "and trending (array of {label,reason}). Keep max 6 suggestions and max 4 trending. "
        f"Query: {req.query}. Keywords: {req.keywords}."
    )
    try:
        result = await nvidia_chat_with_fallback_chain(
            [
                {"role": "system", "content": "You are an LMS semantic search assistant. Return strict JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=260,
            primary_model=NVIDIA_MODEL_SEARCH,
        )
    except (httpx.TimeoutException, httpx.ReadTimeout):
        return {
            "success": True,
            "data": {
                "suggestions": req.keywords[:6],
                "trending": [{"label": k, "reason": "Related term"} for k in req.keywords[:4]],
            },
            "meta": {"model": "fallback", "tokens": {"prompt": 0, "completion": 0, "total": 0}},
        }

    try:
        parsed = safe_json_parse(result["content"])
    except Exception:
        parsed = {}
    return {
        "success": True,
        "data": {
            "suggestions": parsed.get("suggestions", req.keywords[:6]),
            "trending": parsed.get("trending", [{"label": k, "reason": "Related term"} for k in req.keywords[:4]]),
        },
        "meta": {
            "model": result.get("model", NVIDIA_MODEL),
            "tokens": {
                "prompt": result["usage"].get("prompt_tokens", 0),
                "completion": result["usage"].get("completion_tokens", 0),
                "total": result["usage"].get("total_tokens", 0),
            },
        },
    }


# ── VALID LMS CATEGORY NAMES (used in expand prompt) ──────────────────────
_LMS_CATEGORIES = [
    "courses", "lessons", "notes", "aiNotes", "discussions",
    "quizzes", "flashcards", "media", "certificates",
    "liveSessions", "users"
]

@app.post("/v1/search/expand")
async def expand_search(req: ExpandSearchRequest) -> Dict[str, Any]:
    """
    Accepts any plain-language search query and returns:
      - corrected_query: spelling-corrected version of the query (or original if correct)
      - expanded_keywords: 6-10 semantically related terms the LMS might store
      - primary_intent_category: which LMS module best matches the intent
      - is_aggregate_query: true when the user is asking for a count/number
      - aggregate_key: standardised key (e.g. STUDENT_COUNT) when applicable
    """
    categories_str = ", ".join(_LMS_CATEGORIES)
    prompt = (
        f"You are an LMS search intent analyser and spelling corrector. For the query \"{req.query}\" return ONLY strict JSON with these keys:\n"
        "- corrected_query: the query string with any spelling mistakes/typos corrected. If the query has no spelling mistakes, return the original query.\n"
        "- expanded_keywords: array of 6-10 lowercase synonyms and related LMS concept words\n"
        f"- primary_intent_category: one of [{categories_str}] that best matches the query intent\n"
        "- is_aggregate_query: boolean true if the user is asking for a count/total/number\n"
        "- aggregate_key: if is_aggregate_query is true, one of [STUDENT_COUNT, TRAINER_COUNT, COURSE_COUNT, PENDING_APPROVALS, CERTIFICATE_COUNT, LIVE_SESSION_COUNT], else null\n"
        "Examples:\n"
        "  query='how to get degree' -> corrected_query='how to get degree', expanded_keywords=['degree','certificate','diploma','graduation','award','credential','completion'], primary_intent_category='certificates', is_aggregate_query=false, aggregate_key=null\n"
        "  query='numbr of studnts registerd' -> corrected_query='number of students registered', expanded_keywords=['student','learner','user','enroll','registered'], primary_intent_category='users', is_aggregate_query=true, aggregate_key='STUDENT_COUNT'\n"
        "  query='exms' -> corrected_query='exams', expanded_keywords=['exam','assessment','quiz','test','question','evaluation','attempt'], primary_intent_category='quizzes', is_aggregate_query=false, aggregate_key=null\n"
        "  query='instrctr teching' -> corrected_query='instructor teaching', expanded_keywords=['instructor','trainer','teacher','faculty','tutor','lecturer','mentor'], primary_intent_category='courses', is_aggregate_query=false, aggregate_key=null\n"
        "Return JSON only, no explanation."
    )
    try:
        result = await nvidia_chat_with_fallback_chain(
            [
                {"role": "system", "content": "You are a strict JSON-only LMS search intent analyser. Never add prose or markdown."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=300,
            primary_model=NVIDIA_MODEL_SEARCH,
        )
        parsed = safe_json_parse(result["content"])
    except (httpx.TimeoutException, httpx.ReadTimeout):
        parsed = {}
    except Exception:
        parsed = {}

    # Sensible fallback
    corrected = parsed.get("corrected_query") or req.query
    expanded = parsed.get("expanded_keywords") if isinstance(parsed.get("expanded_keywords"), list) else []
    category = parsed.get("primary_intent_category") if parsed.get("primary_intent_category") in _LMS_CATEGORIES else None
    is_agg = bool(parsed.get("is_aggregate_query", False))
    agg_key = parsed.get("aggregate_key") if is_agg else None

    return {
        "success": True,
        "data": {
            "corrected_query": corrected,
            "expanded_keywords": expanded,
            "primary_intent_category": category,
            "is_aggregate_query": is_agg,
            "aggregate_key": agg_key,
        },
    }


async def nvidia_embeddings(texts: List[str], model: str = NVIDIA_MODEL_EMBEDDING) -> List[List[float]]:
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=500, detail="NVIDIA_API_KEY is not configured")
    
    payload = {
        "input": texts,
        "model": model,
        "input_type": "query",
        "encoding_format": "float"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{NVIDIA_BASE_URL}/embeddings",
            headers={
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"NVIDIA Embeddings API error: {resp.text[:300]}")
        data = resp.json()
    
    return [item["embedding"] for item in data.get("data", [])]


@app.post("/v1/search/vector")
async def vector_search(req: VectorSearchRequest) -> Dict[str, Any]:
    if not VECTOR_INDEX:
        return {"success": False, "results": [], "error": "Vector index not loaded"}
    
    try:
        query_emb = (await nvidia_embeddings([req.query]))[0]
    except Exception as e:
        return {"success": False, "results": [], "error": f"Embedding failed: {str(e)}"}

    q_vec = np.array(query_emb)
    q_norm = np.linalg.norm(q_vec)
    if q_norm == 0:
        return {"success": True, "results": []}

    results = []
    for doc in VECTOR_INDEX:
        doc_vec = np.array(doc["embedding"])
        d_norm = np.linalg.norm(doc_vec)
        if d_norm == 0:
            continue
        
        sim = np.dot(q_vec, doc_vec) / (q_norm * d_norm)
        if sim >= req.threshold:
            results.append({
                "score": float(sim),
                "metadata": doc["metadata"],
                "content": doc["content"]
            })
            
    results.sort(key=lambda x: x["score"], reverse=True)
    return {
        "success": True,
        "results": results[:req.top_k]
    }


@app.post("/v1/search/rag")
async def rag_search(req: RagSearchRequest) -> Dict[str, Any]:
    context_str = ""
    if req.context:
        context_str = "\n---\n".join([
            f"SOURCE: {c.get('metadata', {}).get('title', 'Unknown')}\nCONTENT: {c.get('content', '')}"
            for c in req.context[:8]
        ])
    
    print(f"RAG Request: query='{req.query}', context_len={len(req.context) if req.context else 0}")
    
    system = (
        "You are an expert AI Educational Assistant for the CEAS LMS platform. "
        "First, prioritize using the provided LMS context to accurately answer the user's query. "
        "If the context is empty or does not contain the answer, seamlessly use your general educational knowledge to provide a highly accurate and helpful answer. "
        "Format your answer clearly using Markdown: use bullet points or numbered lists for steps, and bolding for key terms. Keep it concise and well-structured."
    )
    prompt = f"LMS Context (if any):\n{context_str}\n\nQuery: {req.query}"
    
    try:
        result = await nvidia_chat_with_fallback_chain(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=400,
            primary_model=NVIDIA_MODEL_SEARCH,
        )
    except Exception as e:
        return {"success": False, "answer": "", "error": str(e)}

    return {
        "success": True,
        "answer": result["content"].strip(),
        "meta": {
            "model": result.get("model", NVIDIA_MODEL),
            "tokens": {
                "prompt": result["usage"].get("prompt_tokens", 0),
                "completion": result["usage"].get("completion_tokens", 0),
                "total": result["usage"].get("total_tokens", 0),
            },
        },
    }


# ─── ASR / Transcription Endpoint ─────────────────────────────────────────────

NVIDIA_ASR_SERVER = _cfg("NVIDIA_ASR_SERVER", "grpc.nvcf.nvidia.com:443")
NVIDIA_ASR_FUNCTION_ID = _cfg("NVIDIA_ASR_FUNCTION_ID", "b702f636-f60c-4a3d-a6f4-f3568c13bd7d")
NVIDIA_ASR_LANGUAGE = _cfg("NVIDIA_ASR_LANGUAGE", "en")


class TranscribeRequest(BaseModel):
    """Accept either a base64-encoded WAV or a local file path."""
    audioBase64: Optional[str] = None
    audioPath: Optional[str] = None
    language: Optional[str] = None


def _riva_transcribe(audio_bytes: bytes, sample_rate: int, language: str) -> str:
    """Run NVIDIA Riva ASR offline recognition on raw PCM audio bytes."""
    import riva.client as rc

    api_key = NVIDIA_API_KEY
    if not api_key:
        raise ValueError("NVIDIA_API_KEY is not configured for ASR")

    auth = rc.Auth(
        uri=NVIDIA_ASR_SERVER,
        use_ssl=True,
        metadata_args=[
            ["function-id", NVIDIA_ASR_FUNCTION_ID],
            ["authorization", f"Bearer {api_key}"],
        ],
    )
    asr_service = rc.ASRService(auth)
    config = rc.RecognitionConfig(
        encoding=rc.AudioEncoding.LINEAR_PCM,
        sample_rate_hertz=sample_rate,
        language_code=language or NVIDIA_ASR_LANGUAGE or "en",
        max_alternatives=1,
        enable_automatic_punctuation=True,
    )

    response = asr_service.offline_recognize(audio_bytes, config)
    chunks: list[str] = []
    for result in response.results:
        if result.alternatives:
            text = result.alternatives[0].transcript.strip()
            if text:
                chunks.append(text)

    return " ".join(chunks)


@app.post("/v1/transcribe")
async def transcribe_audio(req: TranscribeRequest) -> Dict[str, Any]:
    """
    Transcribe a WAV audio file using NVIDIA Riva ASR.

    Accepts either:
      - audioBase64: base64-encoded WAV file content
      - audioPath: absolute path to a WAV file on disk (for same-machine calls)
    """
    language = req.language or NVIDIA_ASR_LANGUAGE or "en"

    # Resolve audio bytes
    audio_data: Optional[bytes] = None
    sample_rate: int = 16000

    if req.audioBase64:
        try:
            raw = base64.b64decode(req.audioBase64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 audio data: {e}")
        # Write to temp file to parse as WAV
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name
        try:
            with wave.open(tmp_path, "rb") as wf:
                sample_rate = wf.getframerate()
                audio_data = wf.readframes(wf.getnframes())
        finally:
            os.unlink(tmp_path)

    elif req.audioPath:
        audio_path = Path(req.audioPath)
        if not audio_path.exists():
            raise HTTPException(status_code=400, detail=f"Audio file not found: {req.audioPath}")
        with wave.open(str(audio_path), "rb") as wf:
            sample_rate = wf.getframerate()
            audio_data = wf.readframes(wf.getnframes())

    else:
        raise HTTPException(status_code=400, detail="Either audioBase64 or audioPath is required")

    if not audio_data or len(audio_data) < 1024:
        raise HTTPException(status_code=400, detail="Audio data is empty or too small for transcription")

    # Run Riva ASR in a thread pool to avoid blocking the event loop
    try:
        text = await asyncio.to_thread(_riva_transcribe, audio_data, sample_rate, language)
    except Exception as exc:
        error_msg = str(exc)
        print(f"[TRANSCRIBE] Riva ASR failed: {error_msg}")
        return {
            "success": False,
            "text": "",
            "error": error_msg,
            "provider": "riva",
        }

    word_count = len(text.split()) if text else 0
    print(f"[TRANSCRIBE] Success: {word_count} words, language={language}")

    return {
        "success": bool(text),
        "text": text,
        "wordCount": word_count,
        "language": language,
        "provider": "riva",
    }


# ─── Multi-provider ASR System (IndicConformer & Whisper) ─────────────────────

_whisper_models = {}
_indic_model = None
_indic_processor = None

def get_whisper_model(model_size: str, device: str = "auto", compute_type: str = "default"):
    if device == "cpu" and compute_type == "default":
        compute_type = "int8"
    elif device == "auto" and compute_type == "default":
        compute_type = "auto"

    key = f"{model_size}:{device}:{compute_type}"
    if key not in _whisper_models:
        print(f"[ASR] Loading Whisper model {model_size} (device={device}, compute_type={compute_type})...")
        from faster_whisper import WhisperModel
        _whisper_models[key] = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(f"[ASR] Whisper model {model_size} loaded successfully.")
    return _whisper_models[key]

def get_indic_conformer():
    global _indic_model, _indic_processor
    if _indic_model is None:
        print("[ASR] Loading IndicConformer model (ai4bharat/indic-conformer-600m-multilingual)...")
        try:
            import torch
            from transformers import AutoProcessor, AutoModelForCTC
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            _indic_processor = AutoProcessor.from_pretrained("ai4bharat/indic-conformer-600m-multilingual")
            _indic_model = AutoModelForCTC.from_pretrained("ai4bharat/indic-conformer-600m-multilingual").to(device)
            print("[ASR] IndicConformer model loaded successfully.")
        except ImportError as e:
            print("[ASR] Failed to import torch/transformers for IndicConformer. Please install torch and transformers.")
            raise RuntimeError("IndicConformer packages (torch, transformers) are not installed in the python environment.") from e
        except Exception as e:
            print(f"[ASR] Error loading IndicConformer: {str(e)}")
            raise e
    return _indic_model, _indic_processor

def transcribe_indic_conformer(audio_path: str) -> str:
    import torch
    import numpy as np
    
    model, processor = get_indic_conformer()
    device = next(model.parameters()).device
    
    try:
        import librosa
        speech, sr = librosa.load(audio_path, sr=16000)
    except ImportError:
        import soundfile as sf
        speech, sr = sf.read(audio_path)
        if sr != 16000:
            raise ValueError(f"IndicConformer expects 16kHz audio, got {sr}Hz.")
            
    input_values = processor(speech, sampling_rate=16000, return_tensors="pt").input_values.to(device)
    with torch.no_grad():
        logits = model(input_values).logits
    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(predicted_ids)[0]
    return transcription

class AsrTranscribeRequest(BaseModel):
    audioPath: str
    provider: str = "whisper_large_v3"
    language: Optional[str] = "auto"
    languageHint: Optional[str] = "auto"
    chunking: Optional[bool] = False
    returnSegments: Optional[bool] = True

@app.post("/v1/asr/transcribe")
async def asr_transcribe(req: AsrTranscribeRequest) -> Dict[str, Any]:
    audio_path = req.audioPath
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {audio_path}")

    provider = req.provider or "whisper_large_v3"
    language = req.language if req.language != "auto" else None
    
    if not language and req.languageHint and req.languageHint != "auto":
        language = req.languageHint

    provider = provider.lower()

    try:
        if provider == "indic_conformer":
            text = await asyncio.to_thread(transcribe_indic_conformer, audio_path)
            import soundfile as sf
            info = sf.info(audio_path)
            duration = info.duration
            return {
                "success": True,
                "provider": "indic_conformer",
                "language": "hi",
                "text": text,
                "segments": [{"start": 0.0, "end": round(duration, 2), "text": text}],
                "confidence": 0.9,
                "duration": round(duration, 2),
                "warnings": []
            }

        elif provider in ("whisper_large_v3", "whisper_turbo"):
            device = _cfg("WHISPER_DEVICE", "auto")
            compute_type = _cfg("WHISPER_COMPUTE_TYPE", "default")
            if provider == "whisper_large_v3":
                model_size = _cfg("WHISPER_LARGE_MODEL", "large-v3")
            elif device == "cpu":
                model_size = _cfg("WHISPER_TURBO_CPU_MODEL", "small")
            else:
                model_size = _cfg("WHISPER_TURBO_MODEL", "large-v3-turbo")
            
            model = get_whisper_model(model_size, device=device, compute_type=compute_type)
            
            def _whisper_run():
                beam_size = 1 if provider == "whisper_turbo" else int(_cfg("WHISPER_BEAM_SIZE", "5"))
                segments, info = model.transcribe(audio_path, beam_size=beam_size, language=language)
                
                transcript_segments = []
                text_chunks = []
                for segment in list(segments):
                    text_chunks.append(segment.text)
                    if req.returnSegments:
                        transcript_segments.append({
                            "start": round(segment.start, 2),
                            "end": round(segment.end, 2),
                            "text": segment.text
                        })
                return " ".join(text_chunks).strip(), transcript_segments, info

            try:
                full_text, transcript_segments, info = await asyncio.to_thread(_whisper_run)
            except asyncio.CancelledError:
                print("[ASR] Transcription request cancelled while Whisper was running.")
                return {
                    "success": False,
                    "error": "ASR request was cancelled. Keep the AI service running and retry transcription.",
                    "warnings": ["The AI service stopped while transcription was running."]
                }
            
            return {
                "success": True,
                "provider": provider,
                "language": info.language,
                "confidence": round(info.language_probability, 4),
                "text": full_text,
                "segments": transcript_segments,
                "duration": round(info.duration, 2),
                "warnings": []
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported ASR provider: {provider}")

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(exc),
            "warnings": []
        }

@app.get("/v1/asr/health")
async def asr_health() -> Dict[str, Any]:
    device = "cpu"
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        pass
        
    loaded = list(_whisper_models.keys())
    if _indic_model is not None:
        loaded.append("indic_conformer")
        
    return {
        "providers": {
            "indic_conformer": True,
            "whisper_large_v3": True,
            "whisper_turbo": True,
            "riva": True
        },
        "device": device,
        "loadedModels": loaded
    }


class ByteLearningGenerateRequest(BaseModel):
    courseId: str
    content: str
    difficulty: Optional[str] = "medium"
    targetLanguage: Optional[str] = "en"
    mode: Optional[str] = "auto"


def generate_fallback_bytes_from_content(content: str, difficulty: str = "medium") -> List[Dict[str, Any]]:
    # Split content by paragraphs
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [content]
        
    title = paragraphs[0][:40] + "..." if len(paragraphs[0]) > 40 else paragraphs[0]
    desc = paragraphs[0][:100] + "..." if len(paragraphs[0]) > 100 else paragraphs[0]
    
    return [
        {
            "title": title or "Introductory Byte",
            "description": desc or "Introduction to this learning module.",
            "learningObjective": "Understand the main principles of this topic.",
            "estimatedMinutes": 3,
            "difficulty": difficulty,
            "content": content,
            "keyPoints": [
                "Key topic introduced in the lesson materials.",
                "Real world application and context of this concept.",
                "Review of fundamentals and practical relevance."
            ],
            "flashcards": [
                {
                    "front": "What is the primary topic of this byte?",
                    "back": title,
                    "topic": "Overview"
                }
            ],
            "quiz": [
                {
                    "question": f"Which of the following describes: {title}?",
                    "options": [
                        "It is the main subject explained in the lesson.",
                        "An unrelated secondary detail.",
                        "A legacy placeholder value.",
                        "None of the above."
                    ],
                    "correctAnswer": 0,
                    "explanation": "The text clearly focuses on this topic as the primary theme."
                }
            ]
        }
    ]


@app.post("/v1/byte-learning/generate")
async def generate_byte_learning(req: ByteLearningGenerateRequest) -> Dict[str, Any]:
    prompt = (
        "Analyze the following content and generate 1-3 highly structured, premium micro-learning bytes (lessons) "
        "adapted for student consumption. The output must be valid JSON matching this schema:\n"
        "{\n"
        "  \"bytes\": [\n"
        "    {\n"
        "      \"title\": \"Engaging Lesson Title\",\n"
        "      \"description\": \"Brief summary of what this byte covers (max 30 words)\",\n"
        "      \"learningObjective\": \"Key objective of this byte (max 15 words)\",\n"
        "      \"estimatedMinutes\": 3,\n"
        "      \"difficulty\": \"medium\",\n"
        "      \"content\": \"Deep, comprehensive explanation in 3-5 rich paragraphs (300-500 words). Include clear headers, terms, or lists for formatting.\",\n"
        "      \"keyPoints\": [\"Core takeaway point 1\", \"Core takeaway point 2\", \"Core takeaway point 3\"],\n"
        "      \"flashcards\": [\n"
        "        { \"front\": \"Flashcard question/term\", \"back\": \"Flashcard answer/definition\", \"topic\": \"Overview\" }\n"
        "      ],\n"
        "      \"quiz\": [\n"
        "        {\n"
        "          \"question\": \"Multiple choice question statement\",\n"
        "          \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
        "          \"correctAnswer\": 0,\n"
        "          \"explanation\": \"Detailed explanation of why the correct option is correct\"\n"
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}"
        f"\n\nDifficulty Level: {req.difficulty}\n"
        f"Target Language: {req.targetLanguage}\n"
        f"Mode: {req.mode}\n"
        f"Source Content to analyze:\n{req.content}"
    )

    try:
        messages = [
            {"role": "system", "content": "You are a professional educational curriculum designer. You split course content into bite-sized lessons and generate associated learning aids (flashcards, quiz questions, explanations) in strict JSON format."},
            {"role": "user", "content": prompt}
        ]
        result = await nvidia_chat_with_fallback_chain(
            messages,
            temperature=0.3,
            max_tokens=2500,
            primary_model=NVIDIA_MODEL_NOTES
        )
        parsed = safe_json_parse(result["content"])
        
        # Validate structure
        if "bytes" not in parsed or not isinstance(parsed["bytes"], list):
            raise ValueError("AI response does not contain 'bytes' list")
            
        return {
            "success": True,
            "data": parsed,
            "meta": {
                "model": result.get("model", NVIDIA_MODEL),
                "tokens": {
                    "prompt": result["usage"].get("prompt_tokens", 0),
                    "completion": result["usage"].get("completion_tokens", 0),
                    "total": result["usage"].get("total_tokens", 0)
                }
            }
        }
    except Exception as e:
        fallback_bytes = generate_fallback_bytes_from_content(req.content, req.difficulty)
        return {
            "success": True,
            "data": { "bytes": fallback_bytes },
            "meta": {
                "model": "fallback",
                "tokens": {"prompt": 0, "completion": 0, "total": 0},
                "error": str(e)
            }
        }
