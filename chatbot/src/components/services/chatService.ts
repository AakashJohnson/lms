
const jwtToken = new URLSearchParams(window.location.search).get("token");
// console.log("🔑 JWT Token from URL:", jwtToken);
// Chat service for API integration
export interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  isButton?: boolean;
  isFile?: boolean;
  fileName?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Session status types for HITL support
export type SessionStatus = 'bot_active' | 'waiting_for_support' | 'assigned_to_support' | 'resolved';

export interface EscalationResponse {
  success: boolean;
  session_id: string;
  status: SessionStatus;
  message?: string;
}

export type BackendApiResponse = {
  web_used: any[] | undefined;
  query: string;
  translated_query?: string;
  answer: string;
  predicted_questions?: string[];
  time_taken?: number;
  chunks_used?: string[];
  language?: string;
  doc_id?: string;
  rag_result?: {
    session_id?: string;
    answer?: string;
    references?: any[];
    total_chunks?: number;
    predicted_questions?: string[];
    translated_query?: string;
    language?: string;
    performance_metrics?: {
      retrieval_ms?: number;
      rerank_ms?: number;
      llm_ms?: number;
      total_ms?: number;
      chunks_retrieved?: number;
      chunks_total?: number;
      intent?: string;
      retrieval_confidence?: string;
    };
  };
  vision_used?: boolean;
  ocr_confidence?: number | null;
  ocr_language?: string | null;
  final_query?: string;
  ocr_text_length?: number;
  session_id?: string;
  // Image generation fields
  image_base64?: string;
  image_prompt?: string;
  intent?: string;
  error?: string;
  // HITL session status fields
  status?: 'bot_active' | 'waiting_for_support' | 'assigned_to_support' | 'resolved';
  messaging_disabled?: boolean;
  // Options for user selection
  options?: Array<{
    label: string;
    value: string;
  }>;
};

// ------------------------------
// 🔹 Language code mapping utility
// ------------------------------
export const getApiLanguageCode = (languageCode: string): string => {
  const languageCodeMap: { [key: string]: string } = {
    en: "en-IN",
    hi: "hi-IN",
    es: "es",
    fr: "fr",
    de: "de",
    it: "it",
    pt: "pt",
    ru: "ru",
    sa: "sa",
    ja: "ja",
    zh: "zh-Hans",
    ko: "ko",
    ar: "ar",
    bn: "bn-IN",
    ta: "ta-IN",
    te: "te-IN",
    gu: "gu-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    mr: "mr-IN",
    pa: "pa-IN",
    ur: "ur-IN",
    ne: "ne",
    or: "or-IN",
    as: "as-IN",
    brx: "brx",
    doi: "doi",
    gom: "gom",
    ks: "ks",
    mai: "mai",
    mni: "mni",
    sat: "sat",
    sd: "sd",
    ms: "ms",
  };

  return languageCodeMap[languageCode] || "en-IN";
};

// Import API configuration
const API_BASE = import.meta.env.VITE_BACKEND_URL ;

// ------------------------------
// 🔹 DOC_ID setup (from parent iframe OR session API)
// ------------------------------
let effectiveDocId = "chatbot.aicte-india.org"; // default fallback

// ✅ NEW: Function to set doc_id from session API response
export const setSessionDocId = (docId: string): void => {
  if (docId && typeof docId === "string") {
    effectiveDocId = docId;
    (window as any).chatbotDocId = docId;
    localStorage.setItem("chatbot_doc_id", docId);
    console.log("✅ [DOC_ID] Set from session API:", docId);
  }
};

// ✅ Initialize from localStorage if available
const storedDocId = localStorage.getItem("chatbot_doc_id");
if (storedDocId) {
  effectiveDocId = storedDocId;
  (window as any).chatbotDocId = storedDocId;
  console.log("📌 [DOC_ID] Restored from localStorage:", storedDocId);
}

// ------------------------------
// 🔹 Wait for parent doc_id via Promise (FALLBACK ONLY)
// ------------------------------
const waitForParentDocId = new Promise<void>((resolve) => {
  const handler = (event: MessageEvent) => {
    try {
      // Allow any origin that embeds the widget
      const data = event.data || {};
      if (data?.type === "INIT_PARENT_INFO" || data?.type === "SET_DOC_ID") {
        const docIdCandidate = data.docId || new URL(data.parentUrl).hostname;
        if (docIdCandidate && typeof docIdCandidate === "string") {
          effectiveDocId = docIdCandidate;
          (window as any).chatbotDocId = effectiveDocId;
          // console.log("✅ [DOC_ID_RECEIVED] Parent doc_id applied:", effectiveDocId);

          // Send ACK
          window.parent.postMessage({ type: "DOC_ID_ACK", docId: effectiveDocId }, "*");

          window.removeEventListener("message", handler);
          resolve();
        }
      }
    } catch (err) {
      console.warn("⚠️ [DOC_ID_WAIT_ERROR]", err);
      resolve();
    }
  };

  window.addEventListener("message", handler);
});

(window as any).chatbotDocId = effectiveDocId;

// console.log("📌 [INIT] Default chatbot doc_id:", effectiveDocId);

// Helper: safely extract hostname from URL or string
const extractHostFrom = (maybeUrlOrHost?: string) => {
  if (!maybeUrlOrHost) return undefined;
  try {
    return new URL(
      maybeUrlOrHost.startsWith("http")
        ? maybeUrlOrHost
        : `https://${maybeUrlOrHost}`
    ).hostname;
  } catch {
    return maybeUrlOrHost;
  }
};

// 🕒 Add slight delay so parent iframe postMessage is not missed
setTimeout(() => {
  window.addEventListener("message", (event) => {
    try {
      // Allow any origin that embeds the widget
      const data = event.data || {};

      if (data?.type === "INIT_PARENT_INFO" || data?.type === "SET_DOC_ID") {
        const parentUrl = data.parentUrl;
        const docIdCandidate = data.docId || extractHostFrom(parentUrl);
        const parentHost = extractHostFrom(docIdCandidate);

        if (parentHost) {
          effectiveDocId = parentHost;
          (window as any).chatbotDocId = effectiveDocId;
          // console.log("📩 [DOC_ID_RECEIVED] Updated effectiveDocId:", effectiveDocId);
          // console.log("🌐 From parent URL:", parentUrl);

          try {
            window.parent.postMessage(
              { type: "DOC_ID_ACK", docId: effectiveDocId },
              event.origin
            );
            // console.log("📤 [DOC_ID_ACK] Sent acknowledgment to parent.");
          } catch (err) {
            console.warn("⚠️ [DOC_ID_ACK] Failed to send acknowledgment:", err);
          }
        } else {
          console.warn("⚠️ [DOC_ID_WARNING] Invalid docId, keeping default:", effectiveDocId);
        }
      }
    } catch (err) {
      console.warn("⚠️ [DOC_ID_ERROR] Error processing parent message:", err);
    }
  });
}, 1000);

// ✅ Notify parent that chatbot is ready so it can send doc_id
try {
  window.parent.postMessage({ type: "CHATBOT_READY" }, "*");
  // console.log("📤 [READY] Sent CHATBOT_READY to parent (waiting for doc_id)");
} catch (err) {
  console.warn("⚠️ [READY] Failed to send CHATBOT_READY:", err);
}

// ------------------------------
// ✅ Getter for doc_id
// ------------------------------
export const getEffectiveDocId = () =>
  (window as any).chatbotDocId || effectiveDocId;

// ------------------------------
// 🔹 Session ID Management
// ------------------------------
// Generate or retrieve persistent session ID
const getOrCreateSessionId = (): string => {
  // Try to get existing session ID from localStorage
  let sessionId = localStorage.getItem('chatbot_session_id');

  if (!sessionId) {
    // Generate new session ID if none exists
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatbot_session_id', sessionId);
    // console.log('📝 [SESSION] Created new session ID:', sessionId);
  } else {
    // console.log('📝 [SESSION] Using existing session ID:', sessionId);
  }

  return sessionId;
};

// Clear session ID (call when user explicitly ends conversation)
export const clearSessionId = (): void => {
  localStorage.removeItem('chatbot_session_id');
  // console.log('🗑️ [SESSION] Cleared session ID');
};

// Get current session ID without creating new one
export const getCurrentSessionId = (): string | null => {
  return localStorage.getItem('chatbot_session_id');
};

// ------------------------------
// 🔹 API call with image support
// ------------------------------
export const sendMessageToAPI = async (
  message: string,
  context?: string,
  langCode?: string,
  imageFile?: File | null // ⭐ NEW: image optional
): Promise<BackendApiResponse> => {
  try {
    // 🕒 Wait until doc_id is available (or timeout after 2 seconds)
    const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
    await Promise.race([waitForParentDocId, timeout]);

    const parentDocId = getEffectiveDocId(); // ✅ Use the updated value
    // console.log("🚀 [API] Attempting to send message with doc_id:", parentDocId);
    // console.log("🔗 [API] Backend URL:", API_BASE);

    // Get or create persistent session ID
    const sessionId = getOrCreateSessionId();

    // ⭐ ALL REQUESTS USE FORM DATA (as required by the backend)
    const form = new FormData();
    form.append("query", message || "");
    form.append("lang_code", langCode || "en-IN");
    form.append("doc_id", parentDocId);
    form.append("session_id", sessionId);
    form.append("top_k", "12");

    // Add image if provided
    if (imageFile && imageFile instanceof File) {
      form.append("image", imageFile);
      // console.log("📤 [API] Adding image file:", imageFile.name, "Size:", imageFile.size);
    }

    const apiUrl = `${API_BASE.replace(/\/$/, "")}/api/proxy/query`;
    console.log("📤 [API] Sending request to:", apiUrl);
    console.log("📤 [API] Message text:", message || "");
    console.log("📤 [API] Language code:", langCode || "en-IN");
    console.log("📤 [API] Doc ID:", parentDocId);
    console.log("📤 [API] Session ID:", sessionId);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [API] HTTP Error:", response.status, response.statusText);
      console.error("❌ [API] Error response body:", errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data: BackendApiResponse = await response.json();
    // Normalize: backend may return 'response' instead of 'answer'
    if (!data.answer && (data as any).response) {
      data.answer = (data as any).response;
    }
    // console.log("✅ [API_SUCCESS] Backend responded successfully with doc_id:", parentDocId);
    return data;
  } catch (error) {
    console.error("❌ [API_ERROR] Failed to send message:", error);

    const fallbackDocId = "chatbot.aicte-india.org";
    // console.log("⚠️ [API_FALLBACK] Using fallback doc_id:", fallbackDocId);

    const fallbackAnswer = generateSmartResponse(message, context);

    return {
      query: message,
      translated_query: message,
      answer:
        typeof fallbackAnswer === "string"
          ? fallbackAnswer
          : String(fallbackAnswer),
      predicted_questions: [
        "Can you explain more?",
        "Show an example.",
        "Give me related topics.",
      ],
      time_taken: 0,
      chunks_used: [],
      language: langCode || "en-IN",
      web_used: undefined,
      doc_id: fallbackDocId,
    };
  }
};

// ------------------------------
// 🔹 Smart Fallback Response Generator
// ------------------------------
const generateSmartResponse = (
  userMessage: string,
  _context?: string
): string => {
  const message = userMessage.toLowerCase();

  if (
    message.includes("hello") ||
    message.includes("hi") ||
    message.includes("hey")
  )
    return "Hi there! 👋 How can I support you today? You can ask me about health, fitness, diet, medications, or upload documents for analysis.";

  if (
    message.includes("health") ||
    message.includes("report") ||
    message.includes("medical")
  )
    return "Sure! I can assist you with health-related topics like:\n• Analyzing medical reports\n• Providing health recommendations\n• Tracking symptoms\nHow can I help you today? 🩺";

  if (
    message.includes("symptom") ||
    message.includes("pain") ||
    message.includes("fever")
  )
    return "I understand you're not feeling well. Can you describe your symptoms in more detail?";

  if (
    message.includes("medication") ||
    message.includes("medicine") ||
    message.includes("pill")
  )
    return "Let's talk medications! 💊 You can ask about drug usage, interactions, or side effects.";

  if (
    message.includes("appointment") ||
    message.includes("doctor") ||
    message.includes("hospital")
  )
    return "While I can't book appointments directly, I can help you prepare for doctor visits or remind you of appointments.";

  if (
    message.includes("diet") ||
    message.includes("nutrition") ||
    message.includes("food")
  )
    return "Looking for healthy eating tips? 🥗 I can assist with balanced diets, meal planning, and nutrition facts.";

  if (
    message.includes("exercise") ||
    message.includes("workout") ||
    message.includes("fitness")
  )
    return "Fitness time! 💪 I can offer workout suggestions, routines, or health benefits.";

  if (
    message.includes("stress") ||
    message.includes("mental") ||
    message.includes("anxiety") ||
    message.includes("sleep")
  )
    return "Mental well-being matters! 🧘 I can guide you with breathing exercises, sleep tips, or managing stress.";

  if (
    message.includes("reminder") ||
    message.includes("alarm") ||
    message.includes("notification")
  )
    return "Want to set a reminder? ⏰ I can help you remember to take meds or go for a walk.";

  if (
    message.includes("name") ||
    message.includes("who are you") ||
    message.includes("anuvadini")
  )
    return "I'm Anuvadini 🤖 — your AI-powered multilingual health assistant.";

  if (message.includes("thank") || message.includes("thanks"))
    return "You're very welcome! 😊";

  if (message.includes("bye") || message.includes("goodbye"))
    return "Goodbye! Take care and stay healthy. 👋";

  const defaultResponses = [
    "That’s a good question! Could you please give me a bit more detail?",
    "I'm listening. Tell me more so I can assist you better!",
    "Hmm, interesting! Could you clarify what you're looking for?",
    "I didn’t quite catch that. Want to rephrase it slightly?",
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

// ------------------------------
// 🔹 HITL Support - Escalation API
// ------------------------------
export const escalateToHuman = async (sessionId: string): Promise<EscalationResponse> => {
  try {
    const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const jwtToken = new URLSearchParams(window.location.search).get("token") ||
      localStorage.getItem("chatbot_jwt");

    if (!sessionId) {
      throw new Error('Session ID is required for escalation');
    }

    const apiUrl = `${API_BASE.replace(/\/$/, "")}/sessions/${sessionId}/handoff`;

    console.log("[ESCALATION] Calling escalation API:", apiUrl);
    console.log("[ESCALATION] Session ID:", sessionId);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ESCALATION] HTTP Error:", response.status, errorText);
      throw new Error(`Escalation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[ESCALATION] Success:", data);

    return {
      success: data.success || true,
      session_id: data.session_id || sessionId,
      status: 'waiting_for_support',
      message: data.message || 'Successfully escalated to human support'
    };

  } catch (error) {
    console.error("[ESCALATION] Error:", error);

    return {
      success: false,
      session_id: sessionId,
      status: 'bot_active',
      message: error instanceof Error ? error.message : 'Failed to escalate to human support'
    };
  }
};// ------------------------------
// 🔹 Document Upload to RAG Server (via backend proxy)
// ------------------------------
export interface DocumentUploadResponse {
  message?: string;
  documents?: Array<{ id: number; name: string; status: string }>;
  skipped?: Array<string>;
  error?: string;
}

export const uploadDocumentToRAG = async (
  file: File,
  sessionId?: string | null,
  domain?: string | null,
): Promise<DocumentUploadResponse> => {
  try {
    const UPLOAD_URL = `${(import.meta.env.VITE_BACKEND_URL).replace(/\/$/, '')}/api/proxy/upload-document`;

    const form = new FormData();
    form.append("file", file);
    form.append("source_name", file.name);
    if (sessionId) {
      form.append("chat_session_id", sessionId);
    }
    if (domain) {
      form.append("domain", domain);
    }

    console.log("📤 [RAG_UPLOAD] Uploading document:", file.name, "Size:", file.size);
    console.log("📤 [RAG_UPLOAD] Upload URL:", UPLOAD_URL);

    const jwtToken = new URLSearchParams(window.location.search).get("token");

    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [RAG_UPLOAD] HTTP Error:", response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data: DocumentUploadResponse = await response.json();
    console.log("✅ [RAG_UPLOAD] Document uploaded successfully:", data);
    return data;
  } catch (error) {
    console.error("❌ [RAG_UPLOAD] Upload error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
};

// ------------------------------
// 🔹 File Processing (simulated)
// ------------------------------
export const processFile = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileType = file.type;
      const fileName = file.name;

      if (fileType.includes("image")) {
        resolve(`I've analyzed your image "${fileName}".`);
      } else if (fileType.includes("pdf") || fileType.includes("document")) {
        resolve(`I've received your document "${fileName}".`);
      } else {
        resolve(`I've received your file "${fileName}".`);
      }
    }, 2000);
  });
};