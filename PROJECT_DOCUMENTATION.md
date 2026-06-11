# NCUI CEAS LMS - Comprehensive Technical Documentation & Architecture Manual

This document serves as the definitive reference manual for the National Centre for Uniformed Services (NCUI) Continuous Education & Assessment Services (CEAS) Learning Management System (LMS). It outlines the architecture, data models, service configurations, and features of the system, with a detailed breakdown of the **Smart Search** feature and its underlying AI pipelines.

---

## 1. System Architecture Overview

The NCUI CEAS LMS is structured as a modern, decoupled, three-tier web application, leveraging a microservice-based design for artificial intelligence operations:

```mermaid
graph TD
    subgraph Client Tier [Client Tier - React SPA]
        FE[React 18 / Vite 6 / Tailwind CSS]
        VoiceAPI[Voice Input API - Web Speech & MediaRecorder]
    end

    subgraph Application Gateway [Application Gateway - Express API Server]
        BE[Node.js / Express.js]
        Socket[Socket.IO - Live Sessions & Alerts]
        Redis[(Redis Caching)]
        DB[(MongoDB Database)]
    end

    subgraph AI Service Tier [AI Service Tier - Python Microservice]
        AI[FastAPI AI Service]
        V_Index[(In-memory Vector Index)]
    end

    subgraph External Services [External Cloud Services]
        NV[NVIDIA NIM Cloud API]
        Anuvadini[AICTE Anuvadini Translation & V2T API]
    end

    %% Client Interactions
    FE -->|HTTP/REST Calls| BE
    FE -->|WebSocket Events| Socket
    FE -->|Mic Audio Base64| VoiceAPI
    VoiceAPI -->|Audio Transcription| Anuvadini

    %% Gateway Interactions
    BE -->|Query/Save Data| DB
    BE -->|Session/Cache Store| Redis
    BE -->|REST Call proxy| AI

    %% AI Microservice Interactions
    AI -->|Read Vector Data| V_Index
    AI -->|Text Embeddings & LLM completions| NV
```

### Architectural Tiers

1. **Frontend Client (React 18 / Vite 6):** 
   - A single-page application (SPA) built with TypeScript.
   - Designed using a component-centric architecture (shadcn/ui + Radix UI + Lucide Icons).
   - Utilizes CSS transitions,GSAP, and Three.js shader effects for high-end, responsive animations.
   - Standardizes on dynamic viewport scaling, role-based visual layouts, and responsive components.

2. **Backend API Gateway (Express.js / Node.js):**
   - Serves as the central API gateway, handling request routing, JWT validation, database queries, and rate limiting.
   - Incorporates a global error handler, input sanitization middleware, and role-based access control (RBAC).
   - Implements live WebSockets (`Socket.io`) for instant proctoring alerts, notifications, and interactive chat.
   - Connects to Redis for session store and cache hydration to reduce MongoDB read latency.

3. **AI Service Tier (FastAPI / Python 3):**
   - A high-performance Python microservice dedicated to AI model execution, vector database management, and RAG synthesis.
   - Connects to NVIDIA NIM endpoints via official APIs to execute high-parameter model completions and embedding generations.
   - Manages a local in-memory cosine-similarity vector store synchronized from MongoDB.

---

## 2. Directory Layout & Repository Mapping

```
lms/
├── .agents/                    # Agent-specific skill configurations
├── ai-service/                 # Python AI Microservice
│   ├── app/
│   │   ├── data/
│   │   │   └── vector_index.json # Local cached vector embeddings
│   │   ├── indexer.py          # Data ingestion & Vector indexing script
│   │   └── main.py             # FastAPI Server & NVIDIA NIM endpoints
│   ├── start.js                # Node wrapper to boot venv/Uvicorn server
│   └── requirements.txt        # Python dependency manifest
├── backend/                    # Express.js Application Server
│   ├── src/
│   │   ├── config/             # DB, Logger, Redis, Socket configurations
│   │   ├── controllers/        # Request handlers (business logic)
│   │   ├── middlewares/        # Auth, Validator, Rate limiter, Error handler
│   │   ├── models/             # 33 Mongoose database schemas
│   │   ├── routes/             # REST route registrations
│   │   └── services/           # AI Gateway, Notification handlers
│   ├── server.js               # Entry point of Node server
│   └── package.json
├── src/                        # React Frontend Source Code
│   ├── app/
│   │   ├── components/         # Reusable widgets and layout panels
│   │   │   ├── admin/          # Administration panels (users, imports)
│   │   │   ├── assessment/     # Quiz, proctoring, exam session monitors
│   │   │   ├── course/         # Course views, Q&A boards, voice inputs
│   │   │   ├── dashboard/      # Widget cards, learning stats visualizers
│   │   │   ├── media/          # Video/audio streaming panels
│   │   │   ├── ui/             # shadcn/ui atoms (buttons, inputs)
│   │   │   └── SmartSearch.tsx # AI Search Frontend Interface
│   │   ├── services/           # API request services (smartSearchService.ts)
│   │   └── App.tsx             # Main container, routing, page loader
│   ├── pages/                  # Role-based landing boards (Login, Student, Trainer)
│   ├── utils/                  # axios configuration, formatting utilities
│   ├── AppRouter.tsx           # Route matching & navigation
│   └── index.css               # Core styling variables
├── index.html                  # Core HTML file
└── vite.config.ts              # Vite configurations & plugins
```

---

## 3. Database Schema Architecture

The platform runs on MongoDB (via Mongoose ODM) with 33 core models. Below are details of the schemas crucial to the platform's core flow and search system:

```mermaid
erDiagram
    USER ||--o{ ENROLLMENT : registers
    USER ||--o{ LESSON_NOTE : writes
    USER ||--o{ COURSE_QUERY : asks
    USER ||--o{ CERTIFICATE : receives
    COURSE ||--o{ ENROLLMENT : lists
    COURSE ||--o{ ASSESSMENT : contains
    COURSE ||--o{ LIVE_SESSION : schedules
    COURSE ||--o{ LESSON_NOTE : tags
    ASSESSMENT ||--o{ ASSESSMENT_ATTEMPT : monitors
```

### Key Schemas Detailed

#### 1. User Schema (`User.model.js`)
Stores authentication data, role profiles, departments, batches, and system flags:
- `firstName` & `lastName`: String, required.
- `email`: String, unique, indexed.
- `password`: String, hashed using `bcrypt` (rounds = 10).
- `role`: Enum `['student', 'trainer', 'administrator']`, default: `student`.
- `department`: ObjectId reference to `Department`.
- `batch`: ObjectId reference to `Batch`.
- `isApproved`: Boolean, controls trainer and student admin authorization.
- `status`: Enum `['active', 'inactive']`.

#### 2. Course Schema (`Course.model.js`)
Represents the educational syllabus:
- `title` & `description`: String, required.
- `thumbnail`: String, path to static image.
- `instructor`: ObjectId reference to `User` (role = trainer).
- `tags`: Array of Strings, indexed for search.
- `visibility`: Enum `['public', 'private']`.
- `status`: Enum `['active', 'draft']`.
- `sections`: Array of sections, where each section contains:
  - `title`: String.
  - `lessons`: Array of lessons, where each lesson has:
    - `_id`: ObjectId.
    - `title` & `content`: String.
    - `type`: Enum `['video', 'document', 'quiz']`.
    - `url`: String.

#### 3. Course Query Schema (`CourseQuery.model.js`)
Powers course discussion forums and QMS integrations:
- `course`: ObjectId reference to `Course`.
- `student`: ObjectId reference to `User`.
- `question`: String, containing user query.
- `isPublic`: Boolean, controls visibility in search indices.
- `status`: Enum `['open', 'resolved']`.
- `replies`: Array of:
  - `user`: ObjectId reference to `User`.
  - `reply`: String.
  - `createdAt`: Date.

#### 4. AI Lesson Note Schema (`AiLessonNote.model.js`)
Holds AI-synthesized summaries and review questions:
- `student`: ObjectId reference to `User`.
- `course`: ObjectId reference to `Course`.
- `lesson`: String (lesson title).
- `generated`: Object:
  - `summary`: String.
  - `keyTakeaways`: Array of Strings.
  - `mindMap`: Nested JSON representing root and branches.
  - `interviewQuestions`: Array of `{ question, answer, difficulty }`.
  - `examples`: Array of Strings.
  - `revisionMaterial`: String.

---

## 4. End-to-End System-Wide Flows

### 4.1 Authentication & Authorization Flow
```mermaid
sequenceDiagram
    participant Student as Student Dashboard
    participant API as Express Server (server.js)
    participant Auth as Auth Middleware (protect.js)
    participant DB as MongoDB

    Student->>API: POST /api/v1/auth/login { email, password }
    API->>DB: User.findOne({ email })
    DB-->>API: Return user doc + hashed password
    Note over API: Compare password via bcrypt
    API-->>Student: Set HTTP-Only Cookie (JWT token) + User Meta JSON

    Note over Student: Submitting a request to a protected page...
    Student->>API: GET /api/v1/courses (Cookie attached)
    API->>Auth: Validate JWT Signature
    Auth->>DB: User.findById(decoded.id)
    DB-->>Auth: Return user role details
    Note over Auth: Verify role permissions matches route config
    Auth-->>API: Grant access (next())
    API-->>Student: Return 200 OK + Course data
```

### 4.2 Proctoring & Anti-Cheat Exam Flow
```mermaid
sequenceDiagram
    participant Student as Student Exam Screen
    participant FE as React Event Listeners
    participant WS as Socket.IO Connection
    participant BE as Express Backend
    participant Admin as Proctor Monitor Panel

    Student->>FE: Starts assessment (Exam UI locked in Fullscreen)
    FE->>FE: Listener active: document.visibilityState
    Note over FE: Student switches browser tabs
    FE->>WS: Emit "proctor:tab-switch" { examId, attemptId }
    WS->>BE: Log infraction in ExamSession db
    WS->>Admin: Broad-cast Event: "proctor:alert" to trainer/admin room
    Admin-->>Admin: Pop alert notification on proctor grid UI
    BE->>WS: Check severity thresholds
    Note over BE: If infractions > Max Limit
    BE->>WS: Emit "exam:terminate-session"
    WS->>FE: Force close exam screen & auto-submit
```

---

## 5. Smart Search Architecture (Detailed breakdown)

The **Smart Search** system provides unified, semantic, and lexical search capabilities across 11 distinct categories: Courses, Lessons, Personal Notes, AI Notes, Discussions (Forum), Assessments, Flashcards, Media, Certificates, Live Sessions, and Users.

### 5.1 Smart Search Sequence Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Student/User
    participant FE as React Frontend (SmartSearch.tsx)
    participant BE as Express Backend (smartSearch.controller.js)
    participant AI as FastAPI AI Service (main.py)
    participant NV as NVIDIA NIM API (Embeddings & LLMs)
    database DB as MongoDB (Mongoose)

    User->>FE: Input search query (or Speech via Mic)
    Note over FE: If speech: Records audio -> sends to AICTE Anuvadini V2T -> Transcribes
    FE->>BE: POST /api/v1/smart-search { query, filters, limit }
    
    rect rgb(230, 240, 255)
        Note over BE, AI: AI Auto-correction
        BE->>AI: POST /v1/tutor/chat (Correct query)
        AI->>NV: Chat Completion Request
        NV-->>AI: Corrected query word(s)
        AI-->>BE: Return corrected query (e.g. "streak points")
    end

    rect rgb(240, 255, 240)
        Note over BE, DB: Parallel Execution (Lexical & Vector)
        BE->>DB: MongoDB Find (regex search) in Courses, Notes, Q&A, Quizzes, etc.
        BE->>AI: POST /v1/search/vector { query }
        AI->>NV: POST /embeddings (NV-EmbedQA-E5-v5)
        NV-->>AI: Query Vector Embedding
        Note over AI: Cosine Similarity match against vector_index.json
        AI-->>BE: Top K Semantically matching documents
        DB-->>BE: Lexically matching documents
    end

    Note over BE: Data Hydration: Fetch missing documents by ID
    Note over BE: Scoring: Relevance = LexicalScore + (VectorScore * 10)
    Note over BE: Ranking: Sort by combined relevance scores

    rect rgb(255, 240, 240)
        Note over BE, AI: RAG Synthesis (AI Overview)
        BE->>AI: POST /v1/search/rag { query, context: top results }
        AI->>NV: POST /chat/completions (meta/llama-3.1-8b-instruct)
        NV-->>AI: Synthesized Answer
        AI-->>BE: Return AI RAG Answer
    end

    rect rgb(255, 255, 230)
        Note over BE, AI: Query Suggestions & Trending topics
        BE->>AI: POST /v1/search/semantic { query }
        AI-->>BE: Suggestions & Trending labels
    end

    BE-->>FE: Return JSON Response with structured results & AI RAG Answer
    FE->>User: Render tabbed UI, AI Overview & category redirections
```

### 5.2 Deep-Dive: Smart Search Execution Pipeline

#### Step 1: Query Input (Text & Voice Capture)
A user enters a search query in `SmartSearch.tsx`. The query is captured in the React component's local state. Alternatively, the user can click the microphone icon to initiate voice search:
- **Speech-to-Text Integration:** The `voiceInputService.ts` calls `navigator.mediaDevices.getUserMedia` to start recording. It uses the browser's `MediaRecorder` API to capture webm audio chunks.
- Upon stopping, the chunks are compiled into a single `Blob`, read as a Base64 string, and sent to the **AICTE Anuvadini Voice Services API** (`https://anuvadini-services.aicte-india.org/api/voice-to-text`):
  ```javascript
  const res = await fetch('https://anuvadini-services.aicte-india.org/api/voice-to-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer z1x2c3v4b5n6m7a8s9d0f1g2h3j4k5l6`
    },
    body: JSON.stringify({ audioBuffer: base64Audio, audioLanguage: 'en-IN' })
  });
  const data = await res.json();
  const transcription = data.transcription;
  ```
- The transcription is saved to the search query input state and used to trigger the search.

#### Step 2: Query Auto-Correction via AI Gateway
When the Node backend receives `POST /api/v1/smart-search`, it makes a fast LLM request to clean and auto-correct grammatical errors and typos:
- It issues a POST request via the internal `aiGateway.service.js` to the FastAPI AI Service `/v1/tutor/chat`:
  ```json
  {
    "message": "Output ONLY the corrected single search term for: \"strk points\". No conversational text, no explanations. Just the raw corrected word(s)."
  }
  ```
- The FastAPI server utilizes its fast model (`meta/llama-3.1-8b-instruct`) and returns the corrected term (e.g. `"streak points"`).
- If the auto-corrected string is different from the original and within valid length parameters, it overrides the query variable `q` used for the search, keeping the `originalQuery` in metadata.

#### Step 3: Stopword Filtering & Lexical Database Search
The backend extracts lookup keywords and builds text match conditions:
1. **Keyword Extraction:** The query is normalized (lowercase, punctuation stripped) and split into tokens. Stopwords (like *"the", "and", "or", "for", "with"*) are removed to ensure search quality. Words of length 3 to 24 are kept.
2. **Regex Compilation:** An OR-joined regular expression is built from the remaining tokens:
   ```javascript
   const keywordRegex = new RegExp(keywords.map(k => escapeRegex(k)).join('|'), 'i');
   ```
3. **Parallel Database Queries (`Promise.all`):**
   Mongoose runs parallel index-based regex searches against multiple collections:
   - **Courses:** Titles, descriptions, sections, tag lists matching the keyword regex. Includes visibility filtering (students can only search active/public courses or courses they are enrolled in).
   - **Personal Notes:** Filters by `studentId` and performs text checks.
   - **AI Notes:** Summaries, takeaways, and lessons matching the query.
   - **Forum/Discussions:** Public discussions and question headers matching the query.
   - **Assessments / Quizzes:** Matches title and questions.
   - **Media:** Title, tags, and description search.
   - **Certificates, Live Sessions, Users:** Matching relevant text properties.

#### Step 4: Vector Semantic Search
In parallel with the MongoDB lexical search, the Node backend triggers an asynchronous semantic vector search on the Python AI Service `/v1/search/vector`:
1. **FastAPI Embeddings Generation:** The Python backend takes the query string and calls the **NVIDIA NIM Embeddings API** using the `nvidia/nv-embedqa-e5-v5` model to generate a high-dimension vector float array.
2. **Local Cosine Similarity Search:**
   FastAPI loops through the pre-computed document vector embeddings loaded into memory from `vector_index.json`:
   $$\text{Similarity} = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\| \|\mathbf{d}\|}$$
   - Where $\mathbf{q}$ is the query vector and $\mathbf{d}$ represents the vector of the indexed document.
   - If the similarity score is greater than or equal to the configurable threshold (default `0.1` or `0.2`), the document metadata and content are added to the vector results list.
   - The results are returned sorted by similarity score descending.

#### Step 5: Data Fusion & Relevance Ranking
Once Node receives both database lexical matches and semantic vector matches:
1. **Document Hydration:** Documents found in the vector search that are missing from the lexical database search results are dynamically fetched (hydrated) from MongoDB and added to the results pool.
2. **Scoring Engine:** A composite ranking score is calculated for each document:
   $$\text{Score} = \text{Lexical Score} + (\text{Vector Similarity Score} \times 10)$$
   - Lexical Score: Employs a match count. A match in title/description adds `3.0` points for each matching keyword.
   - Vector Score: Scaled similarity score (since Cosine similarity lies between 0 and 1, scaling it by 10 aligns it with lexical relevance weights).
3. **Sorting:** The combined lists of Courses, Lessons, AI Notes, Discussions, and Assessments are sorted by their composite scores.

#### Step 6: AI RAG Overview Synthesis
To provide a consolidated summary of the results, the system generates an AI overview:
1. **Context Extraction:** The top 3 courses, top 3 lessons, top 2 discussions, and top 2 quizzes from the search results are bundled as text contexts.
2. **RAG API Call:** The Node backend calls FastAPI's `/v1/search/rag` with:
   ```json
   {
     "query": "streak points",
     "context": [
       { "content": "Course: Game-Based Learning. Learn how streak points reward continuous logging.", "metadata": { "title": "Game-Based Learning" } }
     ]
   }
   ```
3. **LLM Generation:** The FastAPI AI Service forwards this context to the NVIDIA NIM LLM endpoint (`meta/llama-3.1-8b-instruct`). The LLM is directed to answer using the provided context. If the context is empty or lacks information, it falls back to general educational knowledge.
4. **Answer Delivery:** The Markdown-formatted synthesized answer is returned as `aiAnswer`.

#### Step 7: Suggestions & Trending Topics
FastAPI's `/v1/search/semantic` compiles query suggestions and trending terms using the LLM based on candidate keywords.

#### Step 8: Frontend Rendering & Fallbacks
The React frontend handles the search results:
- **Correction Banner:** Displays an alert if the query was auto-corrected (e.g. *“Auto-corrected from 'strk points' to 'streak points'”*).
- **AI Overview Card:** Renders the `aiAnswer` using a custom Markdown parser that renders bold tags (`**`) as styled HTML tags, and converts bullet/numbered lists into custom component lists.
- **Tab Layout & Empty Category Redirections:** Results are grouped under tab controls (Courses, Lessons, Notes, AI Notes, etc.).
- **Category Match Fallback:** If the search results in a category are empty, but the query contains keyword indicators for that category (e.g. *"quiz"* or *"test"*), the system injects a **"Go to..."** navigation card:
  ```javascript
  const isCategoryMatch = query && CATEGORY_KEYWORDS[tab].some(k => query.includes(k));
  if (isCategoryMatch && dbItems.length === 0) {
    // Injects a dummy card redirecting the user to the actual section page
  }
  ```

---

## 6. AI Engine, NVIDIA NIM & Fallback Architecture

The AI features (tutor chat, summary generation, flashcard creation, search) are powered by the FastAPI service running in `ai-service/app/main.py`.

### 6.1 Model Configurations
The system defines task-specific LLMs using environment variables:
- **Primary LLM:** `meta/llama-3.1-70b-instruct` (deep explanations, structural analysis).
- **Fast LLM:** `meta/llama-3.1-8b-instruct` (suggestions, flashcards, quick query cleaning).
- **Reasoning Model:** `deepseek/deepseek-r1` (math, code reasoning, step-by-step logic).
- **Creative Model:** `google/gemma-3-27b-it` (analogies, creative text synthesis).
- **Embedding Model:** `nvidia/nv-embedqa-e5-v5` (sentence embeddings for vector searches).

### 6.2 High-Availability: Parallel Race & Fallback Chain

```mermaid
graph TD
    subgraph Parallel Race Mode
        PR[Parallel Race Request] -->|Parallel call| M_Fast[Llama-3.1 8B]
        PR -->|Parallel call| M_Mistral[Mistral 24B]
        M_Fast -->|Returns First| RaceSuccess[Return Result & Cancel Remaining]
        M_Mistral -->|Late/Error| RaceCancel[Canceled]
    end

    subgraph Sequential Fallback Mode
        SF[Primary Model Llama-3.1 70B] -->|Success| ReturnResponse[Return Response]
        SF -->|Timeout / 502 Bad Gateway| FB1[Fallback 1: Google Gemma 3 27B]
        FB1 -->|Success| ReturnResponse
        FB1 -->|Failure/Timeout| FB2[Fallback 2: Mistral Small 24B]
        FB2 -->|Success| ReturnResponse
        FB2 -->|Failure| FBError[Return Placeholder Warning]
    end
```

#### 1. Sequential Fallback Chain
For complex reasoning or tutor requests, the system calls models sequentially:
- If the primary model (e.g. `meta/llama-3.1-70b-instruct`) times out or returns a `502 Bad Gateway`, the system catches the exception and falls back to `google/gemma-3-27b-it`.
- If that fails, it cascades to `mistralai/mistral-small-24b-instruct`, then to `meta/llama-3.1-8b-instruct`.
- Only if all models in the fallback chain fail does it raise a timeout/gateway exception.

#### 2. Parallel Race Pool
For standard tutor queries where speed is critical, the backend utilizes `nvidia_chat_parallel_race`:
- It initiates concurrent API requests to multiple models configured in `NVIDIA_PARALLEL_MODELS` (e.g. `meta/llama-3.1-8b-instruct` and `meta/llama-3.1-70b-instruct`).
- It monitors the completions and returns the response from whichever model completes first.
- The remaining pending requests are immediately canceled to conserve bandwidth and API rate limits.

---

## 7. How the Vector Index is Generated (`indexer.py`)

The vector index (`vector_index.json`) is maintained using a scheduled or manually triggered indexing script `ai-service/app/indexer.py`:

1. **Ingest Pipeline:** The script establishes a connection to MongoDB using the configured `MONGODB_URI`.
2. **Document Fetching:** It queries and processes database records into text chunks:
   - **Courses:** Concatenates course titles, descriptions, and tags.
   - **Lessons:** Concatenates parent course title, lesson title, and lesson text content.
   - **AI Notes:** Concatenates lesson title, summaries, and key takeaways.
   - **Discussions:** Extracts public questions along with replies.
   - **Assessments:** Extracts title and question text lists.
3. **NVIDIA Embeddings API Integration:**
   - The compiled text list is partitioned into batches of 15.
   - Each batch is sent to the NVIDIA Embeddings NIM API using the `nvidia/nv-embedqa-e5-v5` model.
4. **Export Index:** The returned vector floats are mapped back to their respective document objects (`content` + `metadata` + `embedding`). The resulting array is written to `ai-service/app/data/vector_index.json`.

---

## 8. Configuration & Environment Variables

### 8.1 API Gateway Backend Environment (`backend/.env`)
```ini
PORT=5000
NODE_ENV=development
API_VERSION=v1
MONGODB_URI=mongodb://localhost:27017/ceas-lms
REDIS_URI=redis://localhost:6379
JWT_SECRET=your-jwt-auth-secret-key-64-bytes-recommended
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_FALLBACK_URLS=http://localhost:8010
AI_SERVICE_TIMEOUT_MS=30000
AI_SERVICE_RETRIES=1
```

### 8.2 AI Service Environment (`ai-service/.env`)
```ini
PORT=8000
NVIDIA_API_KEY=nvapi-your-nvidia-nim-token-here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
NVIDIA_MODEL_FAST=meta/llama-3.1-8b-instruct
NVIDIA_MODEL_EMBEDDING=nvidia/nv-embedqa-e5-v5
AI_SERVICE_TIMEOUT_MS=30000
AI_FAST_TIMEOUT_MS=12000
AI_REASONING_TIMEOUT_MS=45000
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

### 8.3 Frontend Environment (`.env`)
```ini
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 9. Development Setup & Execution

### Prerequisites
- Node.js (v18+)
- Python (v3.10+ with `pip` and virtualenv)
- MongoDB running locally or a MongoDB Atlas URI configured in `.env`
- NVIDIA NIM API Key (`nvapi-...`)

### Installation & Setup

1. **Install Root Node Dependencies:**
   ```bash
   npm install
   ```

2. **Set Up the Python Virtual Environment & AI Services:**
   Run the setup script which automatically sets up a python virtual environment, installs the requirements, and configures configurations:
   ```bash
   npm run ai:setup
   ```

3. **Generate the Vector Index:**
   Before using the semantic smart search, populate the vector cache by running the indexer script:
   ```bash
   cd ai-service
   # Activate virtual environment
   # On Windows:
   .venv\Scripts\activate
   # On Linux/macOS:
   source .venv/bin/activate
   
   python app/indexer.py
   ```

4. **Run the Application:**
   Run the servers in separate terminal panes:
   - **Run the AI Microservice:**
     ```bash
     npm run ai
     ```
   - **Run the Express API Gateway Server:**
     ```bash
     cd backend
     npm install
     npm run start
     ```
   - **Run the Vite Frontend Client Dev Server:**
     ```bash
     npm run dev
     ```

---
*End of technical documentation.*
