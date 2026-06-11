
import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any
from pymongo import MongoClient
from dotenv import load_dotenv
import httpx

# Load paths
APP_DIR = Path(__file__).resolve().parent
AI_SERVICE_DIR = APP_DIR.parent
REPO_ROOT = AI_SERVICE_DIR.parent
load_dotenv(AI_SERVICE_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")
load_dotenv(REPO_ROOT / "backend" / ".env")

# Config
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL_EMBEDDING = os.getenv("NVIDIA_MODEL_EMBEDDING", "nvidia/nv-embedqa-e5-v5")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ceas-lms")
VECTOR_INDEX_PATH = AI_SERVICE_DIR / "app" / "data" / "vector_index.json"

async def get_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts: return []
    payload = {
        "input": texts,
        "model": NVIDIA_MODEL_EMBEDDING,
        "input_type": "passage",
        "encoding_format": "float"
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{NVIDIA_BASE_URL}/embeddings",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        return [item["embedding"] for item in resp.json()["data"]]

def fetch_data() -> List[Dict[str, Any]]:
    client = MongoClient(MONGODB_URI)
    db = client.get_database()
    docs = []

    # 1) Courses
    for c in db.courses.find({"status": "active"}):
        docs.append({
            "content": f"Course: {c['title']}. {c.get('description', '')}. Tags: {', '.join(c.get('tags', []))}",
            "metadata": {"type": "course", "id": str(c['_id']), "title": c['title']}
        })
        # 2) Lessons
        for sec in c.get('sections', []):
            for l in sec.get('lessons', []):
                docs.append({
                    "content": f"Lesson in {c['title']}: {l['title']}. Content: {l.get('content', '')}",
                    "metadata": {"type": "lesson", "id": str(l.get('_id', '')), "courseId": str(c['_id']), "title": l['title']}
                })

    # 3) AI Notes
    for n in db.ailessonnotes.find():
        gen = n.get('generated', {})
        content = f"AI Note for {n.get('lesson', 'Unknown')}: {gen.get('summary', '')}. Key Points: {', '.join(gen.get('keyTakeaways', []))}"
        docs.append({
            "content": content,
            "metadata": {"type": "ai_note", "id": str(n['_id']), "title": n.get('lesson', 'AI Note')}
        })

    # 4) Discussions
    for d in db.coursequeries.find({"isPublic": True}):
        docs.append({
            "content": f"Discussion: {d['question']}. Replies: {' '.join([r['reply'] for r in d.get('replies', [])])}",
            "metadata": {"type": "discussion", "id": str(d['_id']), "title": d['question'][:50]}
        })

    # 5) Assessments
    for a in db.assessments.find({"isPublished": True}):
        q_text = " ".join([q['questionText'] for q in a.get('questions', [])])
        docs.append({
            "content": f"Assessment: {a['title']}. Questions cover: {q_text}",
            "metadata": {"type": "assessment", "id": str(a['_id']), "title": a['title']}
        })

    client.close()
    return docs

async def main():
    print("Fetching data from MongoDB...")
    docs = fetch_data()
    print(f"Found {len(docs)} documents to index.")

    indexed_data = []
    batch_size = 15
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i+batch_size]
        texts = [d["content"] for d in batch]
        print(f"Generating embeddings for batch {i//batch_size + 1}...")
        try:
            embeddings = await get_embeddings(texts)
            for doc, emb in zip(batch, embeddings):
                doc["embedding"] = emb
                indexed_data.append(doc)
        except Exception as e:
            print(f"Error in batch {i//batch_size + 1}: {e}")

    os.makedirs(os.path.dirname(VECTOR_INDEX_PATH), exist_ok=True)
    with open(VECTOR_INDEX_PATH, "w") as f:
        json.dump(indexed_data, f)
    print(f"Successfully indexed {len(indexed_data)} documents to {VECTOR_INDEX_PATH}")

if __name__ == "__main__":
    asyncio.run(main())
