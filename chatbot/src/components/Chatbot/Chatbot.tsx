import React, { useState, useRef, useEffect } from "react";
import aiAvatarImg from "../../assets/Adobe Express - file.png";
import {
  X,
  Send,
  Search,
  Paperclip,
  Mic,
  Globe,
  Palette,
  Type,
  Sun,
  MessageSquare,
  Settings,
  Keyboard,
  HelpCircle,
  Trash2,
  Volume2,
  // Mic2,hii
  //AnupM
  Users,
  Download,
  Share2,
  Eye,
  Copy,
  Check,
  UserPlus, // For Human Support button
  ChevronDown, // For dropdown arrow
  Square,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { BsSoundwave } from "react-icons/bs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { motion, AnimatePresence } from "framer-motion";
import { sendMessageToAPI, getApiLanguageCode, setSessionDocId as updateChatServiceDocId } from "../services/chatService";
import { voiceRecordingService } from "../services/voiceService";
import { handleVoiceInteraction } from "../services/voiceService";
import ConversationManager, {
  type FontSettings,
  type ThemeSettings,
  type GreetingSettings,
} from "../services/conversationManager";
import { textToSpeech } from "../services/ttsService";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import ColorPaletteModal from "./ColorPaletteModal";
import FontCustomizer from "./FontCustomizer";
import ThemeCustomizer from "./ThemeCustomizer";
import GreetingCustomizer from "./GreetingCustomizer";
import "./Chatbot.css";
import VirtualKeyboard from "./VirtualKeyboard";
import { translationService } from "../services/translationService";
import { useMessageTranslation } from "../../hooks/useMessageTranslation";

// Import the logo directly so Vite processes it correctly for the widget build
import anuvadiniLogoPath from "../../assets/anuvadini-icon.png";

import MultilingualFAQ from "./MultilingualFAQ";
import { useLanguage } from "../services/languageContext";
import { useAbuseFilter } from "./useAbuseFilter";
import { useLocation } from "react-router-dom";
import FormDialog from "./FormDialog";
import FeedbackModal from "./FeedbackModal";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot"; // Restrict sender to only these two values
  timestamp: Date;
  isFile?: boolean;
  fileName?: string;
  webUsed?: Array<{ url: string; title?: string }>;
  file?: File; // Add file property to Message interface
  image?: string; // Add image property for image preview
  originalText?: string; // Store original text before translation
  originalLanguage?: string; // Store original language code
  targetLanguage?: string; // Store target language for translation
  generatedImage?: string; // Add property for AI-generated images (base64)
  imagePrompt?: string; // Store the prompt used to generate the image
  intent?: string; // Store the intent type (e.g., IMAGE_GENERATION)
}

const Chatbot: React.FC = () => {
  const location = useLocation();
  const hiddenRoutes = [
    "/customer-admin",
    "/detailed-company-info",
    "/customer-feedback",
    "/super-admin/enquiry",
    "/super-admin/users",
    "/super-admin/companies",
    "/super-admin",
  ]; // add all  the location to hide  chat bot //

  const micButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);

  // Streaming typewriter effect state
  const [streamingTexts, setStreamingTexts] = useState<Record<number, string>>({});
  const streamingIntervalsRef = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  // PHASE 7: Human-in-the-loop state
  const [chatMode, setChatMode] = useState<"bot" | "human" | "disabled">(() => {
    // PHASE 9: Restore chat mode from localStorage
    // NOTE: Do NOT restore 'disabled' mode - if user refreshes, start fresh with bot mode
    const saved = localStorage.getItem("chatbot_mode");
    if (saved === "disabled") {
      // Clear old disabled state - user should be able to start a new conversation
      localStorage.removeItem("chatbot_mode");
      localStorage.removeItem("chatbot_session_id");
      return "bot";
    }
    return (saved === "human" ? "human" : "bot") as "bot" | "human" | "disabled";
  });
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // PHASE 9: Restore session ID from localStorage
    return localStorage.getItem("chatbot_session_id");
  });
  const socketRef = useRef<Socket | null>(null);
  const [isConnectingToHuman, setIsConnectingToHuman] = useState(false);
  const isInitializedRef = useRef(false); // Prevent duplicate initialization
  const processedMessageIds = useRef<Set<string>>(new Set()); // Track processed message IDs

  const { currentLanguage, setCurrentLanguage } = useLanguage();

  // Use translation hook to translate messages based on user's selected language
  const { translatedMessages } = useMessageTranslation(
    messages,
    currentLanguage,
  );

  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [virtualKeyboardOpen, setVirtualKeyboardOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(
    null,
  );
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null,
  );
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceInputAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isSearchRecording, setIsSearchRecording] = useState(false);
  const [showMicWarning, setShowMicWarning] = useState(false);
  const [recordingTimeout, setRecordingTimeout] = useState<number | null>(null);

  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [fontCustomizerOpen, setFontCustomizerOpen] = useState(false);
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [greetingCustomizerOpen, setGreetingCustomizerOpen] = useState(false);
  const [isSoundwaveRecording, setIsSoundwaveRecording] = useState(false);
  const [isSpeakLocked, setSpeakLocked] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // New state for selected file
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // New features state
  const [incognitoMode, setIncognitoMode] = useState(false);

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [chatStartTime, setChatStartTime] = useState<number | null>(null);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

  const conversationManager = ConversationManager.getInstance();
  // Always call hooks at the top level, never conditionally
  // Removed unused 'context' state
  const chatbotRef = useRef<HTMLDivElement>(null);

  const [userPreferences, setUserPreferences] = useState(() =>
    conversationManager.getPreferences(),
  );
  const [showInitialGreeting, setShowInitialGreeting] = useState(true);
  const [embedParentHost, setEmbedParentHost] = useState<string | null>(null);

  // Custom UI configuration from backend
  const [customAgentName, setCustomAgentName] = useState<string>('AI Assistant');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [customGreeting, setCustomGreeting] = useState<any>(null);

  // Public session config — fetched on every chatbot load/reload
  const [sessionConfig, setSessionConfig] = useState<Record<string, unknown> | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionDocId, setSessionDocId] = useState<string | null>(null);

  // Temporarily disabled abuse filter to prevent typing lag
  // const {
  //   filteredMessage,
  //   isAbusive,
  //   violationCount,
  //   incrementViolation,
  //   isBanned,
  // } = useAbuseFilter(inputValue, 4);
  
  const filteredMessage = inputValue;
  const isAbusive = false;
  const violationCount = 0;
  const incrementViolation = () => {};
  const isBanned = false;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation context on mount
  useEffect(() => {
    // console.log("[Chatbot] Initializing conversation context...");

    // Get or create a context for the current user
    const userId = "default-user"; // You can make this dynamic based on JWT or session
    const context = conversationManager.getContext(userId);
    // console.log("[Chatbot] Context initialized:", {
    //   contextId: context.id,
    //   userId: context.userId,
    //   messageCount: context.messages.length,
    // });

    const history = conversationManager.getHistory();
    // console.log("[Chatbot] Retrieved history:", {
    //   historyLength: history.length,
    //   messages: history.map((m) => ({
    //     id: m.id,
    //     sender: m.sender,
    //     text: m.text.substring(0, 50),
    //   })),
    // });

    if (history.length === 0) {
      // console.log("[Chatbot] No history found, showing greeting message");
      setTimeout(() => {
        // Use custom greeting if available, otherwise use default
        const greetingText = customGreeting?.message || userPreferences.greetingSettings.message;
        const greetingDelay = customGreeting?.delay || userPreferences.greetingSettings.delay;

        const greetingMessage: Message = {
          id: Date.now(),
          text: greetingText,
          sender: "bot",
          timestamp: new Date(),
          targetLanguage: currentLanguage,
        };

        setMessages([greetingMessage]);
        conversationManager.addMessage(greetingMessage);
        setShowInitialGreeting(false);
      }, customGreeting?.delay || userPreferences.greetingSettings.delay);
    } else {
      // console.log(
      //   "[Chatbot] Restoring",
      //   history.length,
      //   "messages from history",
      // );
      setMessages(history);
      setShowInitialGreeting(false);
    }
  }, [userPreferences.greetingSettings, customGreeting]);



  // PHASE 9: Socket.IO connection with reconnection support
  useEffect(() => {
    const BACKEND_URL =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

    // Get JWT token from URL parameter (passed by embed.js)
    const getJWTToken = () => {
      // Try to get from URL parameter first
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get("token");

      if (tokenFromUrl) {
        console.log("[AUTH] JWT token found in URL");
        localStorage.setItem("chatbot_jwt", tokenFromUrl); // Store for reuse
        return tokenFromUrl;
      }

      // Fallback to localStorage if needed
      const tokenFromStorage = localStorage.getItem("chatbot_jwt");
      if (tokenFromStorage) {
        console.log("[AUTH] JWT token found in localStorage");
        return tokenFromStorage;
      }

      console.error("[AUTH] No JWT token found");
      return null;
    };

    // Create session on chatbot start (this validates JWT)
    const createSession = async () => {
      const token = getJWTToken();
      if (!token) {
        console.error("[Session] No JWT token available");
        setSessionLoading(false);
        return null;
      }

      try {
        console.log("[AUTH] Creating session (validates JWT)...");
        const response = await fetch(`${BACKEND_URL}/sessions/public`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: `Chat Session ${new Date().toLocaleString()}`,
            chatbot_id: "default-bot",
          }),
        });

        if (!response.ok) {
          console.error("[AUTH] ❌ JWT rejected by /sessions/public");
          return null;
        }

        const data = await response.json();
        const newSessionId = data.session.session_id;
        const docId = data.doc_id; // Extract doc_id from response

        console.log("[AUTH] ✅ JWT VALIDATED via session:", newSessionId);
        console.log("[AUTH] ✅ Doc ID from session:", docId);
        setSessionId(newSessionId);
        setSessionDocId(docId); // Store doc_id in state
        updateChatServiceDocId(docId); // Also update chatService
        setSessionConfig(data);   // store full response for conditional rendering
        setSessionLoading(false); // unblock render
        // PHASE 9: Persist session ID and doc_id
        localStorage.setItem("chatbot_session_id", newSessionId);
        localStorage.setItem("chatbot_doc_id", docId);
        return newSessionId;
      } catch (error) {
        console.error("[Session] Failed to create session:", error);
        setSessionLoading(false); // always unblock even on failure
        return null;
      }
    };

    // Initialize Socket.IO connection
    const initSocket = (token: string, sessionIdParam: string) => {
      // Determine the socket URL and path based on BACKEND_URL
      let socketUrl = BACKEND_URL;
      let socketPath = "/socket.io";

      // If BACKEND_URL includes /backend, extract base URL and set path
      if (BACKEND_URL.includes("/backend")) {
        socketUrl = BACKEND_URL.replace("/backend", "");
        socketPath = "/backend/socket.io";
      }

      // console.log(
      //   "[Socket] Connecting to:",
      //   socketUrl,
      //   "with path:",
      //   socketPath,
      // );
      // console.log("[Socket] Session ID for this connection:", sessionIdParam);
      // console.log("[Socket] Auth token:", token ? "Present" : "Missing");

      const socket = io(socketUrl, {
        path: socketPath,
        auth: { token },
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      // console.log("[Socket] Socket instance created:", socket.id);

      // CRITICAL: Remove all existing listeners to prevent duplicates
      socket.off("connect");
      socket.off("disconnect");
      socket.off("joined_chat");
      socket.off("join_error");
      socket.off("handoff_success");
      socket.off("handoff_error");
      socket.off("new_message");
      socket.off("agent_connected");
      socket.off("agent_disconnected");
      socket.off("chat_closed");

      socket.on("connect", () => {
        // console.log("[Socket] Connected:", socket.id);
        // console.log("[Socket] Current sessionId from param:", sessionIdParam);

        // PHASE 9: Auto-join chat room on connect/reconnect
        // console.log("[Socket] Joining chat room:", sessionIdParam);
        socket.emit("join_chat", { sessionId: sessionIdParam });
      });

      socket.on("disconnect", () => {
        // console.log("[Socket] Disconnected");
      });

      socket.on("connect_error", (error) => {
        console.error("[Socket] Connection error:", error);
      });

      socket.on("connect_timeout", () => {
        console.error("[Socket] Connection timeout");
      });

      socket.on("error", (error) => {
        console.error("[Socket] Socket error:", error);
      });

      socket.on("joined_chat", (data) => {
        // console.log("[Socket] Successfully joined chat room:", data);
      });

      socket.on("join_error", (data) => {
        console.error("[Socket] Join error:", data);
      });

      socket.on("handoff_success", (data) => {
        // console.log("[Socket] Handoff successful:", data);
        // console.log("[Socket] Switching to HUMAN mode");
        setChatMode("human");
        // PHASE 9: Persist chat mode
        localStorage.setItem("chatbot_mode", "human");
        setIsConnectingToHuman(false);

        // Add system message
        const systemMsg: Message = {
          id: Date.now(),
          text: "Connected to human support. An agent will assist you shortly.",
          sender: "bot",
          timestamp: new Date(),
          targetLanguage: currentLanguage,
        };
        setMessages((prev) => [...prev, systemMsg]);
      });

      socket.on("handoff_error", (data) => {
        console.error("[Socket] Handoff error:", data);
        setIsConnectingToHuman(false);

        const errorMsg: Message = {
          id: Date.now(),
          text: `Failed to connect to human support: ${data.error}`,
          sender: "bot",
          timestamp: new Date(),
          targetLanguage: currentLanguage,
        };
        setMessages((prev) => [...prev, errorMsg]);
      });

      socket.on("new_message", async (data) => {
        console.log("[Socket] New message received:", data);

        // Only process agent messages via socket (user messages are added immediately)
        if (data.role === "user") {
          // console.log("[Socket] Skipping user message (already in UI)");
          return;
        }

        // Check if we've already processed this message ID
        const messageId = data.id || `${data.text}-${data.timestamp}`;
        if (processedMessageIds.current.has(messageId)) {
          // console.log(
          //   "[Socket] Message already processed, skipping:",
          //   messageId,
          // );
          return;
        }

        // Mark as processed
        processedMessageIds.current.add(messageId);

        const originalText = data.originalText || data.text;
        const originalLanguage = data.originalLanguage || "en";
        let displayText = data.text;

        // Translate agent message to user's current language if needed
        if (originalLanguage !== currentLanguage) {
          // console.log(
          //   `[Socket] Translating agent message from ${originalLanguage} to ${currentLanguage}`,
          // );
          try {
            const translationResult = await translationService.translateText(
              originalText,
              originalLanguage,
              currentLanguage,
            );
            if (translationResult.success && translationResult.translatedText) {
              displayText = translationResult.translatedText;
              // console.log("[Socket] Agent message translated successfully");
            }
          } catch (error) {
            console.error("[Socket] Failed to translate agent message:", error);
            // Keep original text if translation fails
          }
        }

        const newMsg: Message = {
          id: data.id || Date.now(),
          text: displayText, // Use translated text
          sender: (data.role === "agent" || data.role === "system") ? "bot" : "user",
          timestamp: new Date(),
          originalText: originalText, // Store original text
          originalLanguage: originalLanguage, // Store original language
          targetLanguage: currentLanguage,
        };

        // console.log("[Socket] Adding agent message to UI:", newMsg);

        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some(
            (msg) =>
              msg.id === newMsg.id ||
              (msg.text === newMsg.text &&
                msg.sender === newMsg.sender &&
                Math.abs(msg.timestamp.getTime() - newMsg.timestamp.getTime()) <
                2000),
          );
          if (exists) {
            // console.log("[Socket] Message already in state, skipping");
            return prev;
          }
          return [...prev, newMsg];
        });

        // Add to conversationManager for persistence
        conversationManager.addMessage(newMsg);
      });

      socket.on("agent_connected", (data) => {
        console.log("[Socket] Agent connected event received:", data);

        // Officially switch to HUMAN mode when an agent connects
        setChatMode("human");
        localStorage.setItem("chatbot_mode", "human");

        const agentMsg: Message = {
          id: Date.now(),
          text: data.text || "An agent has joined the chat and will assist you.",
          sender: "bot",
          timestamp: new Date(),
          targetLanguage: currentLanguage,
        };
        setMessages((prev) => [...prev, agentMsg]);

        // PHASE 12: Add to conversationManager for persistence
        conversationManager.addMessage(agentMsg);
      });

      // PHASE 9: Handle agent disconnect
      socket.on("agent_disconnected", (data) => {
        // console.log("[Socket] Agent disconnected:", data);

        const disconnectMsg: Message = {
          id: Date.now(),
          text: "The agent has left the chat. You can continue chatting with the bot or request human support again.",
          sender: "bot",
          timestamp: new Date(),
          targetLanguage: currentLanguage,
        };
        setMessages((prev) => [...prev, disconnectMsg]);

        // Switch back to bot mode
        setChatMode("bot");
        localStorage.setItem("chatbot_mode", "bot");
      });

      // PHASE 9: Handle chat closed
      socket.on("chat_closed", (data) => {
        // console.log("[Socket] Chat closed:", data);

        const closeText =
          data.message ||
          "This chat has been closed. You can request human support again if needed.";

        const closeMsg: Message = {
          id: Date.now(),
          text: closeText,
          sender: "bot",
          timestamp: new Date(),
          targetLanguage: currentLanguage,
        };
        setMessages((prev) => [...prev, closeMsg]);

        // Switch back to bot mode
        setChatMode("bot");
        localStorage.setItem("chatbot_mode", "bot");
        setIsConnectingToHuman(false);
      });

      socketRef.current = socket;
    };

    // Initialize session and socket on mount ONLY
    const initialize = async () => {
      // Prevent duplicate initialization (React Strict Mode runs effects twice)
      if (isInitializedRef.current) {
        return;
      }

      isInitializedRef.current = true;
      console.log("[AUTH] Starting initialization via /sessions/public");

      const token = getJWTToken();
      if (!token) {
        console.error("[AUTH] ❌ No JWT token");
        isInitializedRef.current = false;
        return;
      }

      // PHASE 9: Check if session exists in localStorage (reconnection scenario)
      const existingSessionId = localStorage.getItem("chatbot_session_id");

      let finalSessionId: string | null = null;

      if (existingSessionId) {
        // console.log(
        //   "[Init] Found existing session in localStorage:",
        //   existingSessionId,
        // );
        // Verify session still exists on backend
        try {
          const response = await fetch(
            `${BACKEND_URL}/sessions/${existingSessionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok) {
            // console.log("[Init] Existing session is valid, reusing");
            const data = await response.json();
            const docId = data.doc_id; // Extract doc_id from existing session response
            finalSessionId = existingSessionId;
            setSessionId(existingSessionId);
            setSessionDocId(docId); // Store doc_id in state
            updateChatServiceDocId(docId); // Also update chatService
            localStorage.setItem("chatbot_doc_id", docId); // Persist doc_id
            setSessionLoading(false); // unblock render — no createSession call needed
          } else {
            // console.log("[Init] Existing session is invalid, creating new one");
            localStorage.removeItem("chatbot_session_id");
            localStorage.removeItem("chatbot_doc_id");
            localStorage.removeItem("chatbot_mode");
          }
        } catch (error) {
          console.error("[Init] Failed to verify existing session:", error);
          localStorage.removeItem("chatbot_session_id");
          localStorage.removeItem("chatbot_doc_id");
          localStorage.removeItem("chatbot_mode");
        }
      }

      // Create new session if no valid existing session
      if (!finalSessionId) {
        finalSessionId = await createSession();
        if (!finalSessionId) {
          console.error("[Init] Failed to create session");
          isInitializedRef.current = false; // Reset on failure
          return;
        }
      }

      // Then initialize socket with the session ID
      initSocket(token, finalSessionId);
    };

    initialize();

    // Cleanup on unmount
    return () => {
      // console.log("[Init] Cleaning up...");
      isInitializedRef.current = false; // ALLOW re-initialization on re-mount
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - run only once on mount

  // Cleanup streaming intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(streamingIntervalsRef.current).forEach(clearInterval);
      streamingIntervalsRef.current = {};
    };
  }, []);

  // PHASE 7: Handle handoff to human
  const handleHandoffToHuman = async () => {
    // console.log("[Handoff] ========================================");
    // console.log("[Handoff] REQUESTING HUMAN SUPPORT");
    // console.log("[Handoff] ========================================");

    if (chatMode === "human") {
      // console.log("[Handoff] Already in human mode");
      return;
    }

    if (!sessionId) {
      console.error("[Handoff] ❌ No session ID available");
      const errorMsg: Message = {
        id: Date.now(),
        text: "Failed to connect to human support. Please refresh the page.",
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    if (!socketRef.current) {
      console.error("[Handoff] ❌ Socket not connected");
      const errorMsg: Message = {
        id: Date.now(),
        text: "Failed to connect to human support. Please try again.",
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // console.log("[Handoff] Socket status:", {
    //   connected: socketRef.current.connected,
    //   id: socketRef.current.id,
    // });

    setIsConnectingToHuman(true);

    try {
      // console.log(
      //   "[Handoff] Requesting handoff to human for session:",
      //   sessionId,
      // );

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      const token =
        new URLSearchParams(window.location.search).get("token") ||
        localStorage.getItem("chatbot_jwt");

      // console.log("[Handoff] Backend URL:", BACKEND_URL);
      // console.log("[Handoff] Token:", token ? "Present" : "Missing");

      try {
        // 🔹 IMPORTANT — mark session as waiting in DB
        const url = `${BACKEND_URL}/sessions/${sessionId}/handoff`;
        // console.log("[Handoff] 📤 POST request to:", url);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        // console.log("[Handoff] Response status:", response.status);

        if (response.ok) {
          // console.log("[Handoff] ✅ Session marked as waiting in backend");
        } else {
          console.warn(
            "[Handoff] ⚠️ Failed to mark session waiting. Status:",
            response.status,
          );
        }
      } catch (err) {
        console.error("[Handoff] ❌ Failed to mark session waiting:", err);
      }

      // 🔹 THEN notify socket
      // console.log("[Handoff] 📤 Emitting handoff_to_human event");
      socketRef.current.emit("handoff_to_human", { sessionId });
      // console.log("[Handoff] ✅ Event emitted");
    } catch (error) {
      console.error("[Handoff] ❌ Error:", error);
      setIsConnectingToHuman(false);

      const errorMsg: Message = {
        id: Date.now(),
        text: "Failed to connect to human support. Please try again.",
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  // PHASE 9: Handle close chat
  const handleCloseChat = async () => {
    if (chatMode !== "human") {
      // console.log("[CloseChat] Not in human mode");
      return;
    }

    if (!sessionId) {
      console.error("[CloseChat] No session ID available");
      return;
    }

    if (!socketRef.current) {
      console.error("[CloseChat] Socket not connected");
      return;
    }

    try {
      // console.log("[CloseChat] Closing chat for session:", sessionId);

      // Call backend API to mark session as closed
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL ;
      const closeUrl = `${backendUrl}/sessions/${sessionId}/close`;
      // console.log("[CloseChat] Calling close API:", closeUrl);

      try {
        const res = await fetch(closeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (res.ok) {
          // console.log("[CloseChat] ✅ Session closed via API");
        } else {
          console.warn("[CloseChat] ⚠️ API close failed, status:", res.status);
        }
      } catch (apiError) {
        console.error("[CloseChat] ❌ Error calling close API:", apiError);
      }

      // Emit socket event
      socketRef.current.emit("close_chat", { sessionId });
      // console.log("[CloseChat] ✅ Socket event emitted");

      // Switch back to bot mode immediately
      setChatMode("bot");
      localStorage.setItem("chatbot_mode", "bot");

      const closeMsg: Message = {
        id: Date.now(),
        text: "Chat closed. You can continue chatting with the bot.",
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, closeMsg]);
    } catch (error) {
      console.error("[CloseChat] Error:", error);
    }
  };

  // Move the conditional rendering for hiddenRoutes below all hooks
  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  // Check if user should see feedback (once per week)
  const shouldShowFeedback = (): boolean => {
    const FEEDBACK_COOLDOWN_DAYS = 7; // Show feedback once per week
    const lastFeedbackTime = localStorage.getItem("chatbot_last_feedback_time");

    if (!lastFeedbackTime) {
      // console.log("[Feedback] No previous feedback found, will show feedback");
      return true;
    }

    const lastTime = parseInt(lastFeedbackTime);
    const now = Date.now();
    const daysSinceLastFeedback = (now - lastTime) / (1000 * 60 * 60 * 24);

    // console.log(
    //   "[Feedback] Days since last feedback:",
    //   daysSinceLastFeedback.toFixed(2),
    // );

    if (daysSinceLastFeedback >= FEEDBACK_COOLDOWN_DAYS) {
      // console.log("[Feedback] ✅ Cooldown period passed, will show feedback");
      return true;
    } else {
      // console.log(
      //   "[Feedback] ⏳ Still in cooldown period, will NOT show feedback",
      // );
      // console.log(
      //   `[Feedback] Next feedback available in ${(FEEDBACK_COOLDOWN_DAYS - daysSinceLastFeedback).toFixed(1)} days`,
      // );
      return false;
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    const BACKEND_URL =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

    try {
      const token =
        new URLSearchParams(window.location.search).get("token") ||
        localStorage.getItem("chatbot_jwt");

      // If no session ID, create a temporary one for feedback
      let feedbackSessionId = sessionId;
      if (!feedbackSessionId) {
        feedbackSessionId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // console.log(
        //   "[Feedback] No session ID, created temporary ID:",
        //   feedbackSessionId,
        // );
      }

      // Get domain from window location
      const domain = window.location.hostname || "unknown";

      // console.log("[Feedback] 📤 Submitting feedback...");
      // console.log("[Feedback] Backend URL:", BACKEND_URL);
      // console.log("[Feedback] Session ID:", feedbackSessionId);
      // console.log("[Feedback] Rating:", rating);
      // console.log("[Feedback] Comment:", comment ? "Yes" : "No");
      // console.log("[Feedback] Domain:", domain);

      const requestBody = {
        session_id: feedbackSessionId,
        rating,
        comment,
        domain,
      };
      // console.log("[Feedback] Request body:", requestBody);

      const response = await fetch(`${BACKEND_URL}/feedback/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      // console.log("[Feedback] Response status:", response.status);
      // console.log("[Feedback] Response ok:", response.ok);

      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = "Could not read error response";
        }
        console.error("[Feedback] ❌ Error response:", errorText);
        console.error("[Feedback] ❌ Response status:", response.status);
        console.error(
          "[Feedback] ❌ Response statusText:",
          response.statusText,
        );
        throw new Error(
          `Failed to submit feedback: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      // console.log("[Feedback] ✅ Feedback submitted successfully:", data);
      setHasSubmittedFeedback(true);

      // Record feedback timestamp for cooldown
      localStorage.setItem("chatbot_last_feedback_time", Date.now().toString());
      // console.log("[Feedback] 📅 Recorded feedback timestamp for cooldown");

      // Show thank you message
      const thankYouMsg: Message = {
        id: Date.now(),
        text: "Thank you for your feedback! We appreciate your input.",
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, thankYouMsg]);

      // Close the chatbot after feedback is submitted
      setTimeout(() => {
        setIsOpen(false);
      }, 1500); // Small delay to show thank you message
    } catch (error) {
      console.error("[Feedback] ❌ Error submitting feedback:", error);

      // Check if it's a network error
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.error("[Feedback] ❌ Network error - possible causes:");
        console.error("   1. Backend server is not running");
        console.error("   2. CORS issue");
        console.error("   3. Wrong backend URL:", BACKEND_URL);
        console.error(
          "   4. Backend needs to be restarted after adding feedback router",
        );
        alert(
          "Failed to submit feedback: Cannot connect to server. Please check if backend is running and restart it if you just added the feedback endpoint.",
        );
      } else {
        alert(
          `Failed to submit feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
      throw error;
    }
  };

  // Handle feedback skip - also closes chatbot
  const handleFeedbackSkip = () => {
    // console.log("[Feedback] User skipped feedback");
    setHasSubmittedFeedback(true); // Mark as submitted so it doesn't show again

    // Record skip timestamp for cooldown
    localStorage.setItem("chatbot_last_feedback_time", Date.now().toString());
    // console.log("[Feedback] 📅 Recorded skip timestamp for cooldown");

    setShowFeedbackModal(false);
    setIsOpen(false); // Close chatbot when skipped
  };

  // Handle chatbot close with feedback check
  const handleCloseChatbot = () => {
    // console.log("=".repeat(60));
    // console.log("[Feedback] 🔴 CLOSE BUTTON CLICKED!");
    // console.log("[Feedback] Attempting to close chatbot, checking criteria...");
    // console.log("=".repeat(60));

    // Check if feedback should be shown (MANDATORY)
    // Note: We don't require sessionId here because we can create it during feedback submission
    if (chatStartTime && !hasSubmittedFeedback) {
      const chatDuration = (Date.now() - chatStartTime) / 1000; // in seconds
      const MIN_CHAT_DURATION = 30; // Show feedback after 30 seconds
      const userMessageCount = messages.filter(
        (m) => m.sender === "user",
      ).length;

      // console.log("[Feedback] 📊 Criteria check:", {
      //   chatDuration: chatDuration.toFixed(2) + " seconds",
      //   MIN_CHAT_DURATION: MIN_CHAT_DURATION + " seconds",
      //   userMessageCount,
      //   hasSessionId: !!sessionId,
      //   hasSubmittedFeedback,
      //   sessionId: sessionId
      //     ? sessionId.substring(0, 8) + "..."
      //     : "MISSING (will create on submit)",
      // });

      // Check cooldown period
      const canShowFeedback = shouldShowFeedback();

      // MANDATORY: Show feedback if user chatted for at least 30 seconds and sent at least 2 messages AND cooldown passed
      if (
        chatDuration >= MIN_CHAT_DURATION &&
        userMessageCount >= 2 &&
        canShowFeedback
      ) {
        // console.log("[Feedback] ✅ ✅ ✅ CRITERIA MET! ✅ ✅ ✅");
        // console.log("[Feedback] Showing MANDATORY feedback modal");
        // console.log(
        //   "[Feedback] Chatbot will NOT close until feedback is given",
        // );
        // console.log("=".repeat(60));
        // DO NOT close chatbot - keep it open and show feedback modal
        setShowFeedbackModal(true);
        return; // Prevent closing
      } else {
        // console.log("[Feedback] ❌ Criteria NOT met");
        if (chatDuration < MIN_CHAT_DURATION) {
          // console.log(
          //   `   ❌ Duration too short: ${chatDuration.toFixed(2)}s < ${MIN_CHAT_DURATION}s`,
          // );
        }
        if (userMessageCount < 2) {
          // console.log(`   ❌ Not enough messages: ${userMessageCount} < 2`);
        }
        if (!canShowFeedback) {
          // console.log(`   ⏳ Feedback cooldown active (once per week)`);
        }
        // console.log("[Feedback] Allowing close without feedback");
        // console.log("=".repeat(60));
      }
    } else {
      // console.log("[Feedback] ⚠️ Skipping feedback check:");
      // console.log("   chatStartTime:", chatStartTime ? "EXISTS" : "MISSING");
      // console.log("   hasSubmittedFeedback:", hasSubmittedFeedback);
      // console.log("=".repeat(60));
    }

    // Only close if feedback not required or already submitted
    // console.log("[Feedback] 🔴 Closing chatbot now");
    setIsOpen(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Re-translate all messages when language changes
  useEffect(() => {
    const retranslateMessages = async () => {
      if (!currentLanguage) return;

      // console.log("[Translation] Language changed to:", currentLanguage);

      // Re-translate all messages to the new language
      const translatedMessages = await Promise.all(
        messages.map(async (msg) => {
          // Skip if no original text or already in target language
          if (!msg.originalText || msg.originalLanguage === currentLanguage) {
            return msg;
          }

          try {
            const result = await translationService.translateText(
              msg.originalText,
              msg.originalLanguage || "en",
              currentLanguage,
            );

            if (result.success && result.translatedText) {
              return {
                ...msg,
                text: result.translatedText,
              };
            }
          } catch (error) {
            console.error("[Translation] Failed to translate message:", error);
          }

          return msg;
        }),
      );

      setMessages(translatedMessages);
    };

    // Only retranslate if we have messages and language actually changed
    if (messages.length > 0) {
      retranslateMessages();
    }
  }, [currentLanguage]); // Only depend on currentLanguage, not messages

  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredMessages(translatedMessages);
    } else {
      const filtered = translatedMessages.filter((message) =>
        message.text.toLowerCase().includes(searchValue.toLowerCase()),
      );
      setFilteredMessages(filtered);
    }
  }, [translatedMessages, searchValue]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleVirtualKeyboard = () => {
    setVirtualKeyboardOpen(true);
  };

  const handleVirtualKeyboardClose = () => {
    setVirtualKeyboardOpen(false);
  };

  const handleVirtualKeyboardInput = (text: string) => {
    setInputValue(text);
  };

  const handleFAQOpen = () => {
    setFaqOpen(true);
  };

  const handleFAQClose = () => {
    setFaqOpen(false);
  };

  const [suggestionsByMessageId, setSuggestionsByMessageId] = useState<
    Record<number, string[]>
  >({});
  
  // State to store options for each message
  const [optionsByMessageId, setOptionsByMessageId] = useState<
    Record<number, Array<{ label: string; value: string }>>
  >({});
  
  // State to track which option was selected for each message
  const [selectedOptionByMessageId, setSelectedOptionByMessageId] = useState<
    Record<number, string>
  >({});

  const handleFAQQuestionClick = async (
    question: string,
    fallbackAnswer: string,
  ) => {
    setFaqOpen(false);

    // 1) Push the user's message
    const userMessage: Message = {
      id: Date.now(),
      text: question,
      sender: "user",
      timestamp: new Date(),
      targetLanguage: currentLanguage,
    };
    setMessages((prev) => [...prev, userMessage]);
    conversationManager.addMessage(userMessage);

    // 2) Prepare API call
    const contextInfo = conversationManager.getContextualInfo();
    const apiLangCode = getApiLanguageCode(currentLanguage);

    try {
      // 3) Call backend and keep full JSON
      const res = await sendMessageToAPI(question, contextInfo, apiLangCode);
      const answerText = res?.answer ?? "";
      // Extract predicted_questions from nested rag_result object
      const predicted = Array.isArray(res?.rag_result?.predicted_questions)
        ? res.rag_result.predicted_questions
        : Array.isArray(res?.predicted_questions)
          ? res.predicted_questions
          : [];
      
      // Extract options from response
      const options = Array.isArray(res?.options) ? res.options : [];

      // (Optional) translate chips/answer if your UI language isn't English
      // ...skip if you don't translate elsewhere

      // 4) Push bot message
      const botId = Date.now() + 1;
      const botResponse: Message = {
        id: botId,
        text: answerText || "I couldn't find an answer.",
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, botResponse]);
      conversationManager.addMessage(botResponse);

      // 5) Attach suggestions to THIS bot message
      if (predicted.length) {
        setSuggestionsByMessageId((prev) => ({ ...prev, [botId]: predicted }));
      }
      
      // 6) Attach options to THIS bot message
      if (options.length) {
        setOptionsByMessageId((prev) => ({ ...prev, [botId]: options }));
      }
    } catch (error) {
      // Fallback: use the FAQ-provided answer; no suggestions
      const botResponse: Message = {
        id: Date.now() + 1,
        text: fallbackAnswer,
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, botResponse]);
      conversationManager.addMessage(botResponse);
    }
  };

  const handleSearchNavigation = (direction: "up" | "down") => {
    if (filteredMessages.length === 0) return;

    if (direction === "up") {
      setCurrentSearchIndex((prev) =>
        prev <= 0 ? filteredMessages.length - 1 : prev - 1,
      );
    } else {
      setCurrentSearchIndex((prev) =>
        prev >= filteredMessages.length - 1 ? 0 : prev + 1,
      );
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearchNavigation("up");
    } else if (e.key === "ArrowDown" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearchNavigation("down");
    }
  };

  const scrollToSearchResult = (index: number) => {
    const messageElements = document.querySelectorAll(".message");
    if (messageElements[index]) {
      messageElements[index].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  useEffect(() => {
    if (
      currentSearchIndex >= 0 &&
      currentSearchIndex < filteredMessages.length
    ) {
      scrollToSearchResult(currentSearchIndex);
    }
  }, [currentSearchIndex, filteredMessages]);

  // CHANGE: reusable sender that handles API call, translation, and suggestions
  const sendMessageWithText = async (
    text: string,
    file: File | null = null,
    imageFile?: File | null,
    imagePreviewData?: string | null,
    customDisplayText?: string | null,
  ) => {
    // Ensure we have either text content or a file/image
    const hasText = text && text.trim();
    const hasFile = file instanceof File;
    const hasImage = imageFile instanceof File;

    if (!hasText && !hasFile && !hasImage) {
      console.warn("Cannot send empty message without file or image");
      return;
    }

    // Use a meaningful text for the user message display
    // If customDisplayText is provided, use it; otherwise use the default logic
    const displayText = customDisplayText
      ? customDisplayText
      : hasText
        ? text.trim()
        : hasImage
          ? "Image uploaded"
          : hasFile
            ? file.name
            : "Empty message";

    // 1) push user's message (UI + conversationManager)
    addMessageToChat({
      role: "user",
      text: displayText,
      file: file || undefined,
      image: imagePreviewData || undefined, // store preview in message
    });

    setIsTyping(true);

    // 2) PHASE 7: If in human mode, send via socket and SKIP bot API
    if (chatMode === "human") {
      if (socketRef.current && socketRef.current.connected) {
        // console.log("[Socket] Sending user message to agent:", displayText);
        socketRef.current.emit("user_message", {
          sessionId: sessionId,
          text: displayText,
          userId: "user", // or some unique identifier
          originalLanguage: currentLanguage,
          originalText: displayText,
        });
        setIsTyping(false);
        return;
      } else {
        console.warn("[Socket] Not connected, falling back to API (or showing error)");
        // Optional: show connection error to user
      }
    }

    try {
      const contextInfo = conversationManager.getContextualInfo();
      const apiLangCode = getApiLanguageCode(currentLanguage);

      // For API call, ensure we always have some text (required by backend)
      const apiText = hasText
        ? text.trim()
        : hasImage
          ? "Please analyze this image"
          : hasFile
            ? `Please analyze this file: ${file.name}`
            : "Hello";

      // Call API with proper parameters (only pass imageFile for images)
      const res = await sendMessageToAPI(
        apiText,
        contextInfo,
        apiLangCode,
        imageFile,
      );

      // 🔴 CHECK SESSION STATUS FROM API RESPONSE
      const sessionStatus = res?.status || "bot_active";
      const messagingDisabled = res?.messaging_disabled || false;
      console.log(`[MESSAGE] Session status: ${sessionStatus}, messaging disabled: ${messagingDisabled}`);

      // Handle different session statuses
      if (sessionStatus === "resolved") {
        // Session was closed by the support agent.
        // Clear the resolved session and immediately retry the message with a fresh session.
        console.log("[MESSAGE] Session resolved - clearing session and retrying");

        // Clear old session so chatService auto-generates a fresh one on retry
        localStorage.removeItem("chatbot_session_id");
        localStorage.removeItem("chatbot_mode");
        setSessionId(null);
        setChatMode("bot");

        // Retry: chatService.getOrCreateSessionId() will generate a new session ID
        try {
          const retryRes = await sendMessageToAPI(apiText, contextInfo, apiLangCode, imageFile);
          const retryAnswer = retryRes?.answer ?? "";
          const newSessionId = localStorage.getItem("chatbot_session_id");

          if (newSessionId) {
            setSessionId(newSessionId);

            // Register this new session officially in the backend
            const token = localStorage.getItem("chatbot_jwt");
            if (token) {
              fetch(`${import.meta.env.VITE_BACKEND_URL}/sessions/public`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  name: `Re-initiated Session ${new Date().toLocaleString()}`,
                  chatbot_id: "default-bot",
                }),
              }).catch(e => console.warn("[MESSAGE] Failed to register reset session:", e));
            }
          }

          if (retryAnswer) {
            addMessageToChat({ role: "assistant", text: retryAnswer });
          }
        } catch (retryErr) {
          console.error("[MESSAGE] Retry after session reset failed:", retryErr);
        }

        setIsTyping(false);
        return;
      }

      if (sessionStatus === "waiting_for_support" || sessionStatus === "assigned_to_support") {
        // User is in human support mode - show status message
        const statusMsg = addMessageToChat({
          role: "assistant",
          text: res?.answer || "Your message has been received by our support team.",
        });

        // If not already in human mode, switch to it
        if (chatMode !== "human") {
          setChatMode("human");
          localStorage.setItem("chatbot_mode", "human");
        }

        console.log(`[MESSAGE] Session in human support mode: ${sessionStatus}`);
        return;
      }

      // 🔴 DEFAULT: bot_active - proceed with normal bot response processing
      const answerText = res?.answer ?? "";
      // Extract predicted_questions from nested rag_result object
      const predicted = Array.isArray(res?.rag_result?.predicted_questions)
        ? res.rag_result.predicted_questions
        : Array.isArray(res?.predicted_questions)
          ? res.predicted_questions
          : [];
      
      // Extract options from response
      const options = Array.isArray(res?.options) ? res.options : [];

      // Check if this is an image generation response
      const isImageGeneration =
        res?.intent === "IMAGE_GENERATION" && res?.image_base64;

      // (Optional) translate chips/answer if your UI language != en
      let finalAnswer = answerText;
      const originalBotLanguage = "en"; // Bot responses are originally in English
      if (currentLanguage !== "en" && answerText) {
        const tr = await translationService.translateText(
          answerText,
          "en",
          currentLanguage,
        );
        if (tr.success && tr.translatedText) finalAnswer = tr.translatedText;
      }

      // translate suggestion chips too
      let finalPredicted = predicted;
      if (currentLanguage !== "en" && predicted.length) {
        const trs = await Promise.all(
          predicted.map((q) =>
            translationService.translateText(q, "en", currentLanguage),
          ),
        );
        finalPredicted = trs.map((r, i) =>
          r?.success && r.translatedText ? r.translatedText : predicted[i],
        );
      }

      // 2) push bot message with original language tracking
      const botMsg = addMessageToChat({
        role: "assistant",
        text: finalAnswer || "I couldn't find an answer.",
        webUsed: res.web_used,
        originalText: answerText, // Store original English text
        originalLanguage: originalBotLanguage, // Store original language
        generatedImage: isImageGeneration ? res.image_base64 : undefined, // Add generated image
        imagePrompt: isImageGeneration ? res.image_prompt : undefined, // Add image prompt
        intent: res.intent, // Store intent
      });

      // 3) attach suggestions to this bot message
      if (finalPredicted.length) {
        setSuggestionsByMessageId((prev) => ({
          ...prev,
          [botMsg.id]: finalPredicted,
        }));
      }
      
      // 4) attach options to this bot message
      if (options.length) {
        setOptionsByMessageId((prev) => ({
          ...prev,
          [botMsg.id]: options,
        }));
      }
    } catch (err) {
      console.error("Chatbot API Error:", err);
      let errMsg =
        "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
      if (currentLanguage !== "en") {
        const tr = await translationService.translateText(
          errMsg,
          "en",
          currentLanguage,
        );
        if (tr.success && tr.translatedText) errMsg = tr.translatedText;
      }

      addMessageToChat({ role: "assistant", text: errMsg });
    } finally {
      setIsTyping(false);
    }
  };

  // CHANGE: keep your abuse-filter logic intact, then delegate to sendMessageWithText
  const handleSendMessage = async () => {
    // console.log("[Message] handleSendMessage called - chatMode:", chatMode);

    // Block messaging if chat is disabled (resolved session)
    if (chatMode === "disabled") {
      console.log("[Message] Messaging disabled - session is resolved");
      return;
    }

    if (isBanned || (!inputValue.trim() && !selectedFile && !selectedImage))
      return; // Allow sending with only a file or image

    if (isAbusive) {
      incrementViolation();
      const baseWarningText =
        "Warning: Abusive language detected. {count} more violation(s) will terminate your session.";
      const baseBanText =
        "Warning: Your session has been terminated due to repeated policy violations. You can no longer send messages.";
      const translatedWarningResult = await translationService.translateText(
        baseWarningText,
        "en",
        currentLanguage,
      );
      const translatedBanResult = await translationService.translateText(
        baseBanText,
        "en",
        currentLanguage,
      );

      let finalWarningMessage: string;
      if (violationCount + 1 < 4) {
        const translatedMsg =
          translatedWarningResult.success &&
            translatedWarningResult.translatedText
            ? translatedWarningResult.translatedText
            : baseWarningText;
        finalWarningMessage = translatedMsg.replace(
          "{count}",
          (3 - violationCount).toString(),
        );
      } else {
        finalWarningMessage =
          translatedBanResult.success && translatedBanResult.translatedText
            ? translatedBanResult.translatedText
            : baseBanText;
      }

      // abusive flow is fine: add both user + bot warning manually
      const userMsg: Message = {
        id: Date.now(),
        text: filteredMessage,
        sender: "user",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      const botWarning: Message = {
        id: Date.now() + 1,
        text: finalWarningMessage,
        sender: "bot",
        timestamp: new Date(),
        targetLanguage: currentLanguage,
      };
      setMessages((prev) => [...prev, userMsg, botWarning]);
      conversationManager.addMessage(userMsg);
      conversationManager.addMessage(botWarning);
      setInputValue("");
      setSelectedFile(null); // Clear selected file after abusive message
      setSelectedImage(null); // Clear selected image after abusive message
      setImagePreview(null); // Clear image preview after abusive message
      return;
    }

    // PHASE 7: Check if in human mode
    if (chatMode === "human") {
      // console.log("[Message] ========================================");
      // console.log("[Message] SENDING MESSAGE IN HUMAN MODE");
      // console.log("[Message] ========================================");
      // console.log("[Message] In HUMAN mode - sending via Socket.IO");

      // Send via Socket.IO
      const text = inputValue.trim();
      if (!text) {
        console.warn("[Message] ⚠️ Text is empty, aborting");
        return;
      }

      // ✅ ADD user message to UI immediately for better UX
      const userMsg: Message = {
        id: Date.now(),
        text: text,
        sender: "user",
        timestamp: new Date(),
        originalText: text, // Store original text
        originalLanguage: currentLanguage, // Store user's current language
        targetLanguage: currentLanguage,
      };
      // console.log("[Message] Adding message to UI immediately:", {
      //   id: userMsg.id,
      //   text: userMsg.text.substring(0, 50),
      //   sender: userMsg.sender,
      //   language: currentLanguage,
      // });
      setMessages((prev) => [...prev, userMsg]);
      conversationManager.addMessage(userMsg);
      // console.log("[Message] ✅ Message added to UI");

      setInputValue("");
      setSelectedFile(null);
      setSelectedImage(null);
      setImagePreview(null);

      // Extract user ID from JWT token
      const urlParams = new URLSearchParams(window.location.search);
      const token =
        urlParams.get("token") || localStorage.getItem("chatbot_jwt") || "";
      let userId = "anonymous";

      if (token) {
        try {
          // Decode JWT to get user_id (simple base64 decode of payload)
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId =
            payload.user_id || payload.sub || payload.clientId || "anonymous";
          // console.log("[Message] Decoded userId from token:", userId);
        } catch (e) {
          console.warn("[Message] Failed to decode JWT:", e);
        }
      }

      // Send via socket with language information
      if (socketRef.current && sessionId) {
        // console.log("[Message] Socket status:", {
        //   connected: socketRef.current.connected,
        //   id: socketRef.current.id,
        //   sessionId: sessionId,
        // });

        const messageData = {
          sessionId,
          text,
          userId,
          language: currentLanguage, // Include user's language
          originalText: text, // Include original text
        };
        // console.log("[Message] 📤 Emitting user_message:", messageData);
        socketRef.current.emit("user_message", messageData);
        // console.log(
        //   "[Message] ✅ Message sent via Socket.IO with language:",
        //   currentLanguage,
        // );
      } else {
        console.error(
          "[Message] ❌ Cannot send - socket or sessionId missing",
          {
            hasSocket: !!socketRef.current,
            socketConnected: socketRef.current?.connected,
            sessionId,
          },
        );
      }
      return;
    }

    // console.log("[Message] In BOT mode - sending via API");

    // ✅ normal flow — only send via sendMessageWithText
    const text = inputValue.trim();
    const fileToSend = selectedFile;
    const imageToSend = selectedImage;
    const imagePreviewToSend = imagePreview; // keep preview before clearing

    // Ensure we have something to send
    if (!text && !fileToSend && !imageToSend) {
      console.warn("Nothing to send - no text, file, or image");
      return;
    }

    setInputValue("");
    setSelectedFile(null); // Clear selected file after sending
    setSelectedImage(null); // Clear selected image after sending
    setImagePreview(null); // Clear image preview after sending

    await sendMessageWithText(
      text,
      fileToSend,
      imageToSend,
      imagePreviewToSend,
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClickFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];

      // Check if it's an image
      if (file.type.startsWith("image/")) {
        setSelectedImage(file);
        setSelectedFile(null); // Clear regular file if image is selected

        // Create preview (data URL so it works in iframe/embed)
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === "string" && result.startsWith("data:")) {
            setImagePreview(result);
          }
        };
        reader.onerror = () => {
          setImagePreview(null);
          setSelectedImage(null);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle regular files
        setSelectedFile(file);
        setSelectedImage(null); // Clear image if regular file is selected
        setImagePreview(null); // Clear image preview
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the input value to allow re-selection of the same file
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addMessageToChat = (
    message: {
      role: string;
      text: any;
      webUsed?: any[];
      file?: File;
      image?: string;
      originalText?: string;
      originalLanguage?: string;
      targetLanguage?: string;
      generatedImage?: string;
      imagePrompt?: string;
      intent?: string;
    },
    skipConversationManager = false,
  ): Message => {
    const safeText =
      typeof message.text === "string"
        ? message.text.trim()
        : String(message.text?.answer ?? message.text ?? "").trim();

    const sender = message.role === "user" ? "user" : "bot";

    const newMessage: Message = {
      id: Date.now() + Math.floor(Math.random() * 1000), // numeric unique id
      text: safeText,
      sender,
      timestamp: new Date(),
      webUsed: message.webUsed,
      isFile: !!message.file, // Set isFile if file exists
      fileName: message.file?.name, // Set fileName if file exists
      file: message.file,
      image: message.image ?? undefined, // store the preview
      originalText: message.originalText || safeText, // Store original text
      originalLanguage: message.originalLanguage || currentLanguage, // Store original language
      targetLanguage: message.targetLanguage || currentLanguage,
      generatedImage: message.generatedImage, // Store AI-generated image
      imagePrompt: message.imagePrompt, // Store image generation prompt
      intent: message.intent, // Store intent type
    };

    setMessages((prev) => {
      // dedupe guard: same sender + same text as last message -> ignore
      const last = prev[prev.length - 1];
      if (
        last &&
        last.sender === newMessage.sender &&
        last.text === newMessage.text &&
        !newMessage.file // Also check if a file is present to avoid deduping file messages
      ) {
        // console.log("addMessageToChat: skipped duplicate", newMessage);
        return prev;
      }
      return [...prev, newMessage];
    });

    // only call conversationManager when caller wants persistence
    if (!skipConversationManager) {
      try {
        // guard for missing conversationManager
        if (typeof conversationManager?.addMessage === "function") {
          conversationManager.addMessage(newMessage);
        }
      } catch (err) {
        console.warn("conversationManager.addMessage failed:", err);
      }
    }

    // 🔴 Stream bot messages word-by-word for typewriter effect
    if (sender === "bot" && safeText && !message.generatedImage) {
      const msgId = newMessage.id;
      const words = safeText.split(" ");
      let wordIndex = 0;

      // Start with empty text for streaming
      setStreamingTexts((prev) => ({ ...prev, [msgId]: "" }));

      // Clear any existing interval for this message
      if (streamingIntervalsRef.current[msgId]) {
        clearInterval(streamingIntervalsRef.current[msgId]);
      }

      const intervalId = setInterval(() => {
        wordIndex++;
        const partial = words.slice(0, wordIndex).join(" ");
        setStreamingTexts((prev) => ({ ...prev, [msgId]: partial }));

        if (wordIndex >= words.length) {
          clearInterval(streamingIntervalsRef.current[msgId]);
          delete streamingIntervalsRef.current[msgId];
          // Remove from streaming state so full message.text is used
          setStreamingTexts((prev) => {
            const next = { ...prev };
            delete next[msgId];
            return next;
          });
        }
      }, 30); // 30ms per word — smooth and fast

      streamingIntervalsRef.current[msgId] = intervalId;
    }

    return newMessage;
  };

  const playRecordingSound = (type: "start" | "stop") => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === "start") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn("Audio synthesis not supported or failed", e);
    }
  };

  const handleMicPress2 = async () => {
    await handleVoiceInteraction(
      currentLanguage,
      addMessageToChat,
      // onAudioStart callback
      (messageId: number, audioRef: HTMLAudioElement) => {
        voiceInputAudioRef.current = audioRef;
        setSpeakingMessageId(messageId);
      },
      // onAudioEnd callback
      () => {
        voiceInputAudioRef.current = null;
        setSpeakingMessageId(null);
      },
    );
  };

  const handleLanguageChange = async (languageCode: string) => {
    setCurrentLanguage(languageCode);
    conversationManager.updatePreferences({ language: languageCode });

    const selectedLanguage = translationService
      .getSupportedLanguages()
      .find((lang) => lang.id === languageCode);
    const languageName = selectedLanguage
      ? selectedLanguage.name
      : languageCode;

    const messageText = `Language changed to ${languageName}`;
    let translatedMessage = messageText;

    if (languageCode !== "en") {
      const translationResult = await translationService.translateText(
        messageText,
        "en",
        languageCode,
      );
      if (translationResult.success && translationResult.translatedText) {
        translatedMessage = translationResult.translatedText;
      }
    }

    const systemMessage: Message = {
      id: Date.now(),
      text: translatedMessage,
      sender: "bot",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, systemMessage]);
    conversationManager.addMessage(systemMessage);
    setLanguageModalOpen(false);
  };

  const handleColorChange = (color: string) => {
    const newPreferences = {
      ...userPreferences,
      colorTheme: color,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setColorPaletteOpen(false);
  };

  const handleFontChange = (fontSettings: FontSettings) => {
    const newPreferences = {
      ...userPreferences,
      fontSettings,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setFontCustomizerOpen(false);
  };

  const handleThemeChange = (themeSettings: ThemeSettings) => {
    const newPreferences = {
      ...userPreferences,
      themeSettings,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setThemeCustomizerOpen(false);
  };

  const handleGreetingChange = (greetingSettings: GreetingSettings) => {
    const newPreferences = {
      ...userPreferences,
      greetingSettings,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setGreetingCustomizerOpen(false);
  };

  const handleClearHistory = () => {
    setMessages([]);
    conversationManager.clearHistory();
    setSettingsOpen(false);
  };

  const handleStats = () => {
    // Show conversation statistics in a card
    const totalMessages = messages.length;
    const userMessages = messages.filter((m) => m.sender === "user").length;
    const botMessages = messages.filter((m) => m.sender === "bot").length;

    // Create stats card
    const statsCard = document.createElement("div");
    statsCard.className = "stats-card";
    statsCard.innerHTML = `
      <div class="stats-card-header">
        <h3>📊 Chat Statistics</h3>
        <button class="stats-close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="stats-card-content">
        <div class="stat-item">
          <span class="stat-label">Total Messages:</span>
          <span class="stat-value">${totalMessages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">User Messages:</span>
          <span class="stat-value">${userMessages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Bot Messages:</span>
          <span class="stat-value">${botMessages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Conversation Duration:</span>
          <span class="stat-value">${messages.length > 0
        ? Math.round(
          (Date.now() - new Date(messages[0].timestamp).getTime()) /
          60000,
        )
        : 0
      } min</span>
        </div>
      </div>
    `;

    document.body.appendChild(statsCard);
    setSettingsOpen(false);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (statsCard.parentElement) {
        statsCard.remove();
      }
    }, 5000);
  };

  const handleExport = () => {
    // Export conversation history in .txt format
    let conversationText = `AI Chatbot Conversation History\n`;
    conversationText += `Generated on: ${new Date().toLocaleString()}\n`;
    conversationText += `Language: ${currentLanguage}\n`;
    conversationText += `Total Messages: ${messages.length}\n`;
    conversationText += `\n${"=".repeat(50)}\n\n`;

    messages.forEach((message) => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const sender = message.sender === "user" ? "You" : "AI Assistant";
      conversationText += `[${timestamp}] ${sender}:\n`;
      conversationText += `${message.text}\n\n`;
    });

    const blob = new Blob([conversationText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSettingsOpen(false);
  };

  const handleShare = () => {
    // Share conversation (placeholder for future implementation)
    if (navigator.share) {
      navigator.share({
        title: "AI Chatbot Conversation",
        text: "Check out my conversation with the AI chatbot!",
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
    setSettingsOpen(false);
  };

  const handleIncognito = () => {
    setIncognitoMode(!incognitoMode);

    // Create incognito popup
    const incognitoPopup = document.createElement("div");
    incognitoPopup.className = "feature-popup incognito-popup";
    incognitoPopup.innerHTML = `
      <div class="feature-popup-content">
        <div class="feature-popup-icon">${!incognitoMode ? "👁️" : "👁️‍🗨️"}</div>
        <div class="feature-popup-text">
          <h4>${!incognitoMode
        ? "Incognito Mode Enabled"
        : "Incognito Mode Disabled"
      }</h4>
          <p>${!incognitoMode
        ? "Your conversation will not be saved to history."
        : "Your conversation will now be saved to history."
      }</p>
        </div>
        <button class="feature-popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    document.body.appendChild(incognitoPopup);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (incognitoPopup.parentElement) {
        incognitoPopup.remove();
      }
    }, 3000);
  };

  const startRecordingTimeout = () => {
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
    }

    const timeout = setTimeout(() => {
      if (isRecording) {
        // stopRecording(); // This function doesn't exist, so we'll handle it differently
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
      if (isSearchRecording) {
        handleSearchVoiceToggle();
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
      setRecordingTimeout(null);
    }, 10000);

    setRecordingTimeout(timeout as any);
  };

  const clearRecordingTimeout = () => {
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
      setRecordingTimeout(null);
    }
  };

  const handleSearchVoiceToggle = async () => {
    if (isSearchRecording) {
      try {
        clearRecordingTimeout();

        const response =
          await voiceRecordingService.completeRecording(currentLanguage);
        setIsSearchRecording(false);

        if (response?.success && response?.transcription) {
          const cleanedText = response.transcription.replace(/[।.]/g, "");
          setSearchValue(cleanedText);
        } else {
          console.warn("Transcription failed:", response?.error);
          setShowMicWarning(true);
          setTimeout(() => setShowMicWarning(false), 5000);
        }
      } catch (error) {
        console.error("Search voice recording error:", error);
        setIsSearchRecording(false);
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
    } else {
      try {
        if (!voiceRecordingService.isRecordingSupported()) {
          throw new Error("Voice recording is not supported in this browser");
        }

        setIsSearchRecording(true);
        await voiceRecordingService.startRecording();

        startRecordingTimeout();
      } catch (error) {
        console.error("Search voice recording start error:", error);
        setIsSearchRecording(false);
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
    }
  };

  const languageKeyMap: { [key: string]: string } = {
    en: "english",
    hi: "hindi",
    te: "telugu",
    ta: "tamil",
    bn: "bengali",
    gu: "gujarati",
    mr: "marathi",
    kn: "kannada",
    ml: "malayalam",
    pa: "punjabi",
    ur: "urdu",
    or: "odia",
    as: "assamese",
    ar: "arabic",
    zh: "chinese",
    ja: "japanese",
    ne: "nepali",
    ko: "korean",
    ru: "russian",
  };

  const browserLangMap: { [key: string]: string } = {
    en: "en-US",
    hi: "hi-IN",
    te: "te-IN",
    ta: "ta-IN",
    bn: "bn-IN",
    gu: "gu-IN",
    mr: "mr-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    ur: "ur-PK",
    or: "or-IN",
    as: "as-IN",
  };

  const handleSpeakText = async (
    text: string,
    currentLanguage: string,
    messageId?: number,
  ) => {
    const langKey = languageKeyMap[currentLanguage] || "english";

    try {
      // Stop any existing playback first
      try {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          ttsAudioRef.current.currentTime = 0;
          ttsAudioRef.current = null;
        }

        if (voiceInputAudioRef.current) {
          voiceInputAudioRef.current.pause();
          voiceInputAudioRef.current.currentTime = 0;
          voiceInputAudioRef.current = null;
        }
      } catch { }
      if (window.speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      const response = await textToSpeech(text, langKey);
      // console.log("TTS API response:", response);

      if (response?.audio) {
        const binary = atob(response.audio);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          buffer[i] = binary.charCodeAt(i);
        }

        const blob = new Blob([buffer], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;
        if (messageId) setSpeakingMessageId(messageId);
        audio.onended = () => {
          setSpeakingMessageId(null);
          ttsAudioRef.current = null;
          URL.revokeObjectURL(audioUrl);
        };
        audio.play();
      } else {
        throw new Error("No audio received.");
      }
    } catch (error) {
      console.warn("Falling back to browser TTS:", error);

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = browserLangMap[currentLanguage] || "en-US";
        utterance.rate = 0.9;
        utterance.volume = 1;
        if (messageId) setSpeakingMessageId(messageId);
        utterance.onend = () => setSpeakingMessageId(null);
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error("Browser TTS failed:", fallbackError);
      }
    }
  };

  const handleToggleSpeak = async (messageId: number, text: string) => {
    // If speak is locked -> ignore click
    if (isSpeakLocked) return;

    setSpeakLocked(true);

    try {
      // Stop existing audio always (both TTS and voice-input audio)
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
        ttsAudioRef.current = null;
      }

      if (voiceInputAudioRef.current) {
        voiceInputAudioRef.current.pause();
        voiceInputAudioRef.current.currentTime = 0;
        voiceInputAudioRef.current = null;
      }

      if (window.speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      // Case: Clicking again on same message cancels playback
      if (speakingMessageId === messageId) {
        setSpeakingMessageId(null);
        setSpeakLocked(false);
        return;
      }

      // Start speaking new message
      setSpeakingMessageId(messageId);
      await handleSpeakText(text, currentLanguage, messageId);
    } finally {
      // Unlock after 300ms to allow clean reset
      setTimeout(() => setSpeakLocked(false), 300);
    }
  };

  const handleCopyMessage = async (messageId: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const handleShareMessage = async (text: string) => {
    try {
      if (navigator.share) {
        // Use Web Share API if available
        await navigator.share({
          title: "Chatbot Response",
          text: text,
        });
      } else {
        // Fallback: copy to clipboard if Web Share API is not supported
        await navigator.clipboard.writeText(text);
        alert("Message copied to clipboard! (Share API not available)");
      }
    } catch (error: any) {
      // User cancelled sharing or error occurred
      if (error.name !== "AbortError") {
        console.error("Failed to share message:", error);
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(text);
          alert("Message copied to clipboard!");
        } catch (clipboardError) {
          console.error("Failed to copy to clipboard:", clipboardError);
        }
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatbotRef.current &&
        !chatbotRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "scroll";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
      // Auto-scroll to bottom when chatbot opens
      setTimeout(() => scrollToBottom(), 100);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      clearRecordingTimeout();
    };
  }, [isOpen]);

  // Form displayed

  const [formData, setFormData] = useState<any | null>(null);
  const [, setFormResponses] = useState<Record<string, any>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const API_BASE = import.meta.env.VITE_BACKEND_URL;

  async function handleSidebarClick(category: string) {
    if (!API_BASE) {
      console.error("VITE_BACKEND_URL is not set in .env");
      return;
    }

    setFormLoading(true);
    setCurrentCategory(category);
    setFormData(null);
    setShowFormDialog(false);

    const siteKey =
      embedParentHost ||
      (window as any).__CHATBOT_PARENT_DOC_ID__ ||
      window.location.hostname ||
      "unknown";

    // helper to normalize hosts
    const normalizeHost = (s?: any) =>
      (s ?? "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .split(/[\/?#:]/)[0];

    try {
      const effectiveWebsite = siteKey.trim().toLowerCase();

      const url = `${API_BASE.replace(
        /\/+$/,
        "",
      )}/forms/all?websiteUrl=${encodeURIComponent(siteKey)}&_=${Date.now()}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`Failed ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];

      // Normalizer: lowercase + remove non-alnum
      const normalize = (s?: any) =>
        (s ?? "")
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      // Simple Levenshtein distance for fuzzy matching
      const levenshtein = (a: string, b: string) => {
        const A = a || "";
        const B = b || "";
        const m = A.length;
        const n = B.length;
        const dp: number[][] = Array.from({ length: m + 1 }, () =>
          new Array(n + 1).fill(0),
        );
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            dp[i][j] =
              A[i - 1] === B[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
          }
        }
        return dp[m][n];
      };

      const normalizedCategory = normalize(category);

      // 1) exact normalized match
      let matchingForm = items.find(
        (f: any) => normalize(f.title) === normalizedCategory,
      );

      // 2) includes (e.g., "customerfeedback" includes "feedback")
      if (!matchingForm) {
        matchingForm = items.find((f: any) => {
          const nt = normalize(f.title);
          return (
            nt.includes(normalizedCategory) || normalizedCategory.includes(nt)
          );
        });
      }

      // 3) fuzzy fallback (small typos) - threshold = 2 (tune if needed)
      if (!matchingForm) {
        matchingForm = items.find((f: any) => {
          const nt = normalize(f.title);
          const dist = levenshtein(nt, normalizedCategory);
          return dist <= 2; // small typo tolerance
        });
      }

      if (!matchingForm) {
        console.warn(`No form found for category "${category}"`);
        setFormData(null);
        setFormResponses({});
        // optionally inform user in UI instead of console:
        // setErrors({ general: `No ${category} form available.` })
        return;
      }

      // Normalize questions so FormDialog always receives the same shape
      // IMPORTANT: Backend returns 'fields' not 'questions'!
      const normalizedQuestions =
        (matchingForm.fields || matchingForm.questions || []).map(
          (q: any, idx: number) => ({
            id:
              (q.id && String(q.id).trim()) ||
              (q._id && String(q._id).trim()) ||
              (q.key && String(q.key).trim()) ||
              `q_${idx}_${Math.random().toString(36).slice(2, 9)}`,

            type: q.type || q.kind || "text",
            label: q.label || q.text || q.question || `Question ${idx + 1}`,
            required: !!q.required,
            placeholder: q.placeholder || "",
            options: Array.isArray(q.options)
              ? q.options
              : q.options
                ? [q.options]
                : [],
            validation: q.validation || {},
          }),
        ) || [];

      const normalizedForm = {
        ...matchingForm,
        questions: normalizedQuestions,
      };

      setFormData(normalizedForm);
      setShowFormDialog(true);

      // init responses from the matching form questions
      const init: Record<string, any> = {};
      normalizedQuestions.forEach((q: any) => {
        init[q.id] = q.type === "checkbox" ? [] : "";
      });
      setFormResponses(init);
    } catch (err) {
      console.error("Error fetching form:", err);
    } finally {
      setFormLoading(false);
    }
  }

  const handleFormSubmit = async (payload: any) => {
    if (!API_BASE) {
      console.error("VITE_BACKEND_URL is not set in .env");
      return;
    }

    try {
      // console.log("[Form Submit] Sending payload:", payload);

      const res = await fetch(`${API_BASE}/form_responses/submit_public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to submit form: ${res.status}`);

      const result = await res.json();
      // console.log("Form submitted successfully:", result);

      // ... success handling ...
    } catch (err) {
      console.error("Error submitting form:", err);
      // ... error handling ...
    }
  };

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type === "INIT_PARENT_INFO") {
        const docId = event.data.docId;
        setEmbedParentHost(docId);
        // also expose globally in case other functions need it
        (window as any).__CHATBOT_PARENT_DOC_ID__ = docId;

        // Load UI configuration for this doc_id
        if (docId) {
          try {
            const { loadAndApplyUIConfig } = await import('../../services/uiConfigService');
            await loadAndApplyUIConfig(docId);
            console.log('✅ UI configuration loaded for', docId);

            // Load custom values from localStorage
            const agentName = localStorage.getItem('chatbot_agent_name');
            const logo = localStorage.getItem('chatbot_logo');
            const greetingStr = localStorage.getItem('chatbot_greeting');

            if (agentName) setCustomAgentName(agentName);
            if (logo) setCustomLogo(logo);
            if (greetingStr) {
              try {
                setCustomGreeting(JSON.parse(greetingStr));
              } catch (e) {
                console.error('Failed to parse greeting config:', e);
              }
            }
          } catch (error) {
            console.error('Failed to load UI configuration:', error);
          }
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    // Ask parent to resend docId AFTER React is mounted
    try {
      window.parent.postMessage({ type: "REQUEST_PARENT_INFO" }, "*");
    } catch (e) {
      console.warn("Could not request parent info:", e);
    }
  }, []);

  // Fetch available forms when chatbot opens
  useEffect(() => {
    if (!isOpen || !API_BASE) return;

    const fetchAvailableForms = async () => {
      try {
        const siteKey =
          embedParentHost ||
          (window as any).__CHATBOT_PARENT_DOC_ID__ ||
          window.location.hostname ||
          "unknown";

        const url = `${API_BASE.replace(
          /\/+$/,
          "",
        )}/forms/all?websiteUrl=${encodeURIComponent(siteKey)}&_=${Date.now()}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Failed to fetch forms:", res.status);
          return;
        }

        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];

        // Normalize form titles to match category names
        const normalize = (s?: any) =>
          (s ?? "")
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        // Extract unique forms by normalized title
        const uniqueForms = new Map<string, any>();
        items.forEach((form: any) => {
          const normalizedTitle = normalize(form.title);
          if (!uniqueForms.has(normalizedTitle)) {
            uniqueForms.set(normalizedTitle, form);
          }
        });

        setAvailableForms(Array.from(uniqueForms.values()));
      } catch (error) {
        console.error("Error fetching available forms:", error);
      }
    };

    fetchAvailableForms();
  }, [isOpen, embedParentHost, API_BASE]);

  // Notify parent window when chatbot opens/closes
  useEffect(() => {
    try {
      if (isOpen) {
        window.parent.postMessage({ type: "CHATBOT_OPEN" }, "*");
        // Track chat start time when chatbot opens
        if (!chatStartTime) {
          setChatStartTime(Date.now());
          // console.log(
          //   "[Feedback] Chat started at:",
          //   new Date().toLocaleTimeString(),
          // );
        }
      } else {
        window.parent.postMessage({ type: "CHATBOT_CLOSE" }, "*");
        // Reset chat start time and feedback state when chatbot closes
        setChatStartTime(null);
        setHasSubmittedFeedback(false);
        // console.log("[Feedback] Chat session ended, reset tracking");
      }
    } catch (e) {
      console.warn("Could not notify parent window:", e);
    }
  }, [isOpen]);

  const formatMarkdown = (text: string, search: string) => {
    if (!text) return "";
    let processedText = text;

    // 1. Destroy all consecutive blank lines everywhere, flattening to a single line break.
    // This absolutely ensures "no space between bullets points".
    processedText = processedText.replace(/\n{2,}/g, '\n');

    // 2. Highlight step headers at the very start of the text
    processedText = processedText.replace(
      /^\s*(Step \d+:?|Step-by-step Process:?|Prerequisites:?|What Happens Next:?|Important:?)/gi,
      '**$1**'
    );

    // 2b. Highlight "Note:" at the start of text (but don't add newlines)
    processedText = processedText.replace(
      /^\s*(Note:?)/gi,
      '**$1**'
    );

    // 3. Re-inject double newlines ONLY before major structural headers (excluding Note) so they start on a new paragraph, and highlight them.
    processedText = processedText.replace(
      /([^\n\r])(?:\s+)(Step \d+:?|Step-by-step Process:?|Prerequisites:?|What Happens Next:?|Important:?)/gi,
      '$1\n\n**$2**'
    );

    // 4. Keep "Note:" inline - just bold it without adding newlines
    processedText = processedText.replace(
      /([^\n\r])(?:\s+)(Note:?)/gi,
      '$1 **$2**'
    );


    if (search && processedText.toLowerCase().includes(search.toLowerCase())) {
      processedText = processedText.replace(
        new RegExp(`(${search})`, "gi"),
        '**$1**'
      );
    }
    return processedText;
  };

  // Block render until session config is fetched
  // Later you can add conditions like:
  // if (sessionConfig?.bot_active === false) return null;
  // if (sessionConfig?.maintenance === true) return null;
  if (sessionLoading) return null;

  return (
    <div
      ref={chatbotRef}
      className="chatbot-container"
      style={{
        fontFamily: userPreferences.fontSettings.fontFamily,
        fontSize: `${userPreferences.fontSettings.fontSize}px`,
        fontWeight: userPreferences.fontSettings.fontWeight,
        lineHeight: userPreferences.fontSettings.lineHeight,
        letterSpacing: `${userPreferences.fontSettings.letterSpacing}px`,
        // Define CSS variables for theming
        ["--surface-color" as any]: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
        ["--border-color" as any]: userPreferences.themeSettings.border,
        ["--text-color" as any]: userPreferences.themeSettings.text,
        ["--text-secondary-color" as any]:
          userPreferences.themeSettings.textSecondary,
      }}
    >
      {/* Chat Toggle Button */}
      <motion.button
        className={`chat-toggle ${isOpen ? "open" : ""}`}
        onClick={() => {
          if (isOpen) {
            handleCloseChatbot();
          } else {
            setIsOpen(true);
          }
        }}
        style={{
          background: isOpen
            ? userPreferences.colorTheme ||
            `var(--chatbot-primary-color, ${userPreferences.themeSettings.primary})`
            : `var(--chatbot-primary-color, ${userPreferences.themeSettings.primary})`,
          boxShadow: userPreferences.themeSettings.shadow,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: 0 }}
              animate={{ rotate: 0 }}
              exit={{ rotate: 180 }}
            >
              <X size={24} style={{ color: "white" }} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              className="robot-container"
              initial={{ rotate: 180 }}
              animate={{ rotate: 0 }}
            >
              <div className="robot-icon-circle">
                {userPreferences.greetingSettings.showEmoji && userPreferences.greetingSettings.emoji && userPreferences.greetingSettings.emoji !== "🤖" ? (
                  <span className="robot-emoji">
                    {userPreferences.greetingSettings.emoji}
                  </span>
                ) : (
                  <img src={anuvadiniLogoPath} alt="Anuvadini Bot" style={{ width: "60%", height: "60%", objectFit: "contain" }} />
                )}
              </div>
              {!showInitialGreeting && (
                <motion.div
                  className="speech-bubble speech-bubble-animated"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
                >
                  Hello!
                  <div className="speech-bubble-arrow"></div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-window"
            style={{
              background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
              color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
              boxShadow: userPreferences.themeSettings.shadow,
              border: "none",
              position: "fixed",
              transform: "none",
              willChange: "auto",
              ...({
                "--theme-surface": `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                "--theme-border": userPreferences.themeSettings.border,
                "--theme-text": userPreferences.themeSettings.text,
                "--theme-text-secondary":
                  userPreferences.themeSettings.textSecondary,
              } as React.CSSProperties),
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Sidebar */}
            <div className="chat-sidebar">
              {/* Logo at the top */}
              <div className="sidebar-logo">
                <img
                  src={customLogo || anuvadiniLogoPath}
                  alt="Logo"
                  className="sidebar-logo-img"
                />
              </div>

              {/* Dynamic Forms */}
              {availableForms.map((form: any) => {
                const titleStr = form.title || "Form";
                const catStr = titleStr
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "");

                const isThisLoading = formLoading && currentCategory === catStr;
                let isStandardCategory = true;
                let IconBody = null;

                if (catStr.includes("offer")) {
                  IconBody = (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                      <path d="M4 6v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6" />
                      <path d="M12 12h.01" />
                      <path d="M12 16h.01" />
                      <path d="M12 8h.01" />
                    </svg>
                  );
                } else if (catStr.includes("feedback")) {
                  IconBody = (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <path d="M13 8H7" />
                      <path d="M17 12H7" />
                    </svg>
                  );
                } else if (catStr.includes("survey")) {
                  IconBody = (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10,9 9,9 8,9" />
                    </svg>
                  );
                } else if (catStr.includes("appointment")) {
                  IconBody = (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  );
                } else if (catStr.includes("enquiry") || catStr.includes("inquiry")) {
                  IconBody = (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                      <line x1="9" y1="14" x2="15" y2="14" />
                      <line x1="9" y1="18" x2="15" y2="18" />
                      <line x1="9" y1="10" x2="15" y2="10" />
                    </svg>
                  );
                } else {
                  isStandardCategory = false;
                  // For completely random custom forms, use the first letter of the form title (e.g. 'T' for Ticket)
                  const firstLetter = titleStr.trim().charAt(0).toUpperCase() || "F";
                  IconBody = (
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        fontSize: "14px",
                        color: "currentColor",
                        fontFamily: "sans-serif"
                      }}
                    >
                      {firstLetter}
                    </div>
                  );
                }

                return (
                  <div
                    key={form._id || form.id || catStr}
                    className={`sidebar-icon ${isThisLoading ? "loading" : ""}`}
                    title={titleStr}
                    onClick={() => handleSidebarClick(catStr)}
                    style={{
                      opacity: isThisLoading ? 0.6 : 1,
                      cursor: formLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    <div className="sidebar-tooltip">{titleStr}</div>
                    {isThisLoading ? (
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          border: "2px solid #f3f3f3",
                          borderTop: "2px solid #4285f4",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    ) : (
                      IconBody
                    )}
                  </div>
                );
              })}

              {/* Human Support Button - positioned at bottom to align with input field */}
              <div style={{ marginTop: "auto", paddingBottom: "10px" }}>
                {chatMode === "bot" && (
                  <motion.div
                    className="sidebar-icon"
                    onClick={handleHandoffToHuman}
                    title="Connect to human support"
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: isConnectingToHuman
                        ? userPreferences.themeSettings.textSecondary
                        : "#10b981",
                      color: "white",
                      border: "none",
                      cursor: isConnectingToHuman ? "not-allowed" : "pointer",
                      opacity: isConnectingToHuman || isBanned ? 0.5 : 1,
                      pointerEvents:
                        isConnectingToHuman || isBanned ? "none" : "auto",
                    }}
                  >
                    <div className="sidebar-tooltip">Human Support</div>
                    <UserPlus size={20} />
                  </motion.div>
                )}

                {chatMode === "human" && (
                  <motion.div
                    className="sidebar-icon"
                    title="Human support active - Click to close"
                    onClick={handleCloseChat}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      position: "relative",
                      cursor: "pointer",
                    }}
                  >
                    <div className="sidebar-tooltip">Close Human Support</div>
                    <UserPlus size={20} />
                    <div
                      style={{
                        position: "absolute",
                        top: "-2px",
                        right: "-2px",
                        background: "#ef4444",
                        borderRadius: "50%",
                        width: "12px",
                        height: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      ✕
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <FormDialog
              isOpen={showFormDialog}
              onClose={() => setShowFormDialog(false)}
              formData={formData}
              currentCategory={currentCategory || undefined}
              userPreferences={userPreferences}
              onSubmit={handleFormSubmit}
            />

            {/* Header */}
            <div
              className="chat-header"
              style={{
                background: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                borderBottom: `1px solid ${userPreferences.themeSettings.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Left side - AI Info */}
              <div className="chat-header-info">
                <div className="header-text">
                  <h3 style={{ color: userPreferences.themeSettings.text }}>
                    {customAgentName}
                  </h3>
                  <div className="status-container">
                    <div
                      className="status-dot"
                      style={{ background: "#22c55e" }}
                    ></div>
                    <span
                      className="status"
                      style={{
                        color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                      }}
                    >
                      Online
                    </span>
                  </div>
                </div>
              </div>

              {/* Center - Language selection */}
              <button
                className="language-tag"
                onClick={() => setLanguageModalOpen(true)}
                style={{
                  background: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                  color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                  border: `1px solid ${userPreferences.themeSettings.border}`,
                  padding: "6px 12px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                <Globe
                  size={14}
                  className="language-icon"
                  style={{
                    color: userPreferences.colorTheme,
                  }}
                />
                {currentLanguage === "en"
                  ? "ENGLISH"
                  : currentLanguage === "es"
                    ? "ESPAÑOL"
                    : currentLanguage === "fr"
                      ? "FRANÇAIS"
                      : currentLanguage === "de"
                        ? "DEUTSCH"
                        : currentLanguage === "it"
                          ? "ITALIANO"
                          : currentLanguage === "pt"
                            ? "PORTUGUÊS"
                            : currentLanguage === "ru"
                              ? "РУССКИЙ"
                              : currentLanguage === "ja"
                                ? "日本語"
                                : currentLanguage === "zh"
                                  ? "中文"
                                  : currentLanguage === "hi"
                                    ? "हिन्दी"
                                    : currentLanguage === "ar"
                                      ? "العربية"
                                      : currentLanguage === "bn"
                                        ? "বাংলা"
                                        : currentLanguage.toUpperCase()}
                <ChevronDown
                  size={14}
                  style={{
                    color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                  }}
                />
              </button>

              {/* Right side - Settings and Close buttons */}
              <div
                className="header-actions"
                style={{ display: "flex", gap: "8px" }}
              >
                <motion.button
                  className="palette-btn"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  whileHover={{
                    scale: 1.1,
                    color: userPreferences.colorTheme,
                  }}
                  whileTap={{ scale: 0.9 }}
                  title={settingsOpen ? "Close Settings" : "Customize"}
                  style={{
                    color: settingsOpen
                      ? userPreferences.colorTheme
                      : userPreferences.themeSettings.text,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                >
                  <Settings
                    size={18}
                    color={
                      settingsOpen
                        ? userPreferences.colorTheme
                        : userPreferences.themeSettings.text
                    }
                    style={{
                      transition: "color 0.2s",
                    }}
                  />
                </motion.button>

                <button
                  className="close-chat"
                  onClick={handleCloseChatbot}
                  style={{
                    color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Language Dropdown */}
            <LanguageSelector
              isOpen={languageModalOpen}
              onClose={() => setLanguageModalOpen(false)}
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
            />

            {/* Settings Panel */}
            <AnimatePresence>
              {settingsOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSettingsOpen(false)}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "transparent",
                      zIndex: 999,
                    }}
                  />

                  {/* Settings Modal */}
                  <motion.div
                    className="settings-panel"
                    initial={{ opacity: 0, scale: 0.9, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{
                      position: "absolute",
                      top: "60px",
                      right: "8px",
                      background: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                      border: `1px solid ${userPreferences.themeSettings.border}`,
                      borderRadius: "12px",
                      padding: "8px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                      zIndex: 1000,
                      width: "200px",
                    }}
                  >
                    <div
                      className="settings-list"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setColorPaletteOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Palette size={18} />
                        <span>Colors</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setFontCustomizerOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Type size={18} />
                        <span>Fonts</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setThemeCustomizerOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Sun size={18} />
                        <span>Theme</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setGreetingCustomizerOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <MessageSquare size={18} />
                        <span>Greeting</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleStats}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Users size={18} />
                        <span>Stats</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleExport}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Download size={18} />
                        <span>Export</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleShare}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Share2 size={18} />
                        <span>Share</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleIncognito}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: incognitoMode
                            ? "#ef444420"
                            : userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: incognitoMode
                            ? "#ef4444"
                            : userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Eye size={18} />
                        <span>
                          {incognitoMode ? "Incognito On" : "Incognito"}
                        </span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleClearHistory}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: "#ef444420",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})`,
                          color: "#ef4444",
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Trash2 size={18} />
                        <span>Clear History</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Search Bar */}
            <div
              className="search-input-container"
              style={{
                background: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                borderBottom: `1px solid ${userPreferences.themeSettings.border}`,
              }}
            >
              <Search
                size={16}
                className="search-icon"
                style={{ color: userPreferences.themeSettings.textSecondary }}
              />
              <div
                className="search-bar-wrapper"
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search messages..."
                  className="search-input"
                  style={{ color: userPreferences.themeSettings.text }}
                />
                {searchValue && filteredMessages.length > 0 && (
                  <div className="search-navigation">
                    <button
                      className="search-nav-btn"
                      onClick={() => handleSearchNavigation("up")}
                      title="Previous result (Ctrl+↑)"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                      }}
                    >
                      ↑
                    </button>
                    <span className="search-counter">
                      {currentSearchIndex + 1}/{filteredMessages.length}
                    </span>
                    <button
                      className="search-nav-btn"
                      onClick={() => handleSearchNavigation("down")}
                      title="Next result (Ctrl+↓)"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                      }}
                    >
                      ↓
                    </button>
                  </div>
                )}
                <motion.button
                  className="search-mic-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSearchVoiceToggle();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={
                    isSearchRecording
                      ? {
                        scale: [1, 1.2, 1],
                      }
                      : {}
                  }
                  transition={
                    isSearchRecording
                      ? {
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                      : {}
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    marginLeft: "8px",
                    cursor: "pointer",
                    borderRadius: "50%",
                    padding: "4px",
                  }}
                  title={isSearchRecording ? "Stop recording" : "Voice search"}
                >
                  <Mic
                    size={18}
                    color={
                      isSearchRecording
                        ? "#ef4444"
                        : userPreferences.themeSettings.textSecondary
                    }
                  />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="chat-messages"
              style={{ background: `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})` }}
            >
              {/* Microphone Warning */}
              <AnimatePresence>
                {showMicWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{
                      position: "sticky",
                      top: "0",
                      zIndex: 100,
                      background: "#fef3c7",
                      border: "1px solid #f59e0b",
                      borderRadius: "8px",
                      margin: "8px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#92400e",
                      fontSize: "14px",
                    }}
                  >
                    <div style={{ fontSize: "16px" }}>⚠️</div>
                    <div>
                      <strong>Microphone Issue:</strong> Unable to detect voice.
                      Please check your microphone permissions and try again.
                    </div>
                    <button
                      onClick={() => setShowMicWarning(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        marginLeft: "auto",
                        fontSize: "18px",
                        color: "#92400e",
                      }}
                    >
                      ×
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {(searchValue ? filteredMessages : translatedMessages)
                .sort(
                  (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
                )
                .map((message, index) => {
                  const isCurrentSearchResult =
                    searchValue &&
                    currentSearchIndex >= 0 &&
                    index === currentSearchIndex;

                  return (
                    <motion.div
                      key={message.id}
                      className={`message ${message.sender} ${isCurrentSearchResult ? "current-search-result" : ""
                        }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      style={{
                        border: isCurrentSearchResult
                          ? "2px solid #4285f4"
                          : "none",
                        borderRadius: isCurrentSearchResult ? "8px" : "0",
                        padding: isCurrentSearchResult ? "8px" : "0",
                        background: isCurrentSearchResult
                          ? "rgba(66, 133, 244, 0.1)"
                          : "transparent",
                      }}
                    >
                      <div className="message-avatar">
                        {message.sender === "bot" ? (
                          <img
                            src={aiAvatarImg}
                            alt="AI Avatar"
                            className="avatar-circle"
                            style={{
                              width: "32px",
                              height: "32px",
                              objectFit: "cover",
                              borderRadius: "50%",
                              background: "transparent"
                            }}
                          />
                        ) : (
                          <div
                            className="avatar-circle"
                            style={{
                              background: userPreferences.themeSettings.textSecondary,
                              color: "white",
                            }}
                          >
                            U
                          </div>
                        )}
                      </div>
                      <div className="message-content">
                        <div
                          className="message-bubble"
                          style={{
                            background:
                              message.sender === "bot"
                                ? `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`
                                : userPreferences.colorTheme,
                            color:
                              message.sender === "bot"
                                ? userPreferences.themeSettings.text
                                : "white",
                            border: `1px solid ${userPreferences.themeSettings.border}`,
                          }}
                        >
                          {message.isFile ? (
                            <div className="file-message">
                              📎 {message.fileName}
                            </div>
                          ) : (
                            <div
                              style={{
                                position: "relative",
                                paddingBottom: "40px",
                                paddingRight: "32px",
                                minWidth:
                                  message.sender === "bot" ? "130px" : "60px",
                              }}
                            >
                              {/* IMAGE PREVIEW (if exists) */}
                              {message.image &&
                                !message.image.startsWith("blob:") && (
                                  <div style={{ marginBottom: "10px" }}>
                                    <img
                                      src={message.image}
                                      alt="uploaded"
                                      onError={(e) => {
                                        console.warn(
                                          "Image failed to load:",
                                          message.image,
                                        );
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                      style={{
                                        maxWidth: "200px",
                                        maxHeight: "200px",
                                        borderRadius: "8px",
                                        objectFit: "cover",
                                        border: `1px solid ${userPreferences.themeSettings.border}`,
                                      }}
                                    />
                                  </div>
                                )}

                              {/* AI-GENERATED IMAGE (if exists) */}
                              {message.generatedImage && (
                                <div style={{ marginBottom: "10px" }}>
                                  <img
                                    src={`data:image/png;base64,${message.generatedImage}`}
                                    alt={
                                      message.imagePrompt ||
                                      "AI generated image"
                                    }
                                    style={{
                                      maxWidth: "300px",
                                      maxHeight: "300px",
                                      borderRadius: "8px",
                                      objectFit: "contain",
                                      border: `2px solid ${userPreferences.colorTheme}`,
                                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                    }}
                                  />
                                  {message.imagePrompt && (
                                    <div
                                      style={{
                                        marginTop: "8px",
                                        fontSize: "12px",
                                        color:
                                          userPreferences.themeSettings
                                            .textSecondary,
                                        fontStyle: "italic",
                                      }}
                                    >
                                      Prompt: {message.imagePrompt}
                                    </div>
                                  )}
                                  {/* Download button for generated image */}
                                  <motion.button
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = `data:image/png;base64,${message.generatedImage}`;
                                      link.download = `anuvadini-generated-${Date.now()}.png`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                      marginTop: "8px",
                                      padding: "6px 12px",
                                      background: userPreferences.colorTheme,
                                      color: "white",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      fontWeight: "500",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <Download size={14} />
                                    Download Image
                                  </motion.button>
                                </div>
                              )}

                              {message.sender === "bot" ? (
                                // Bot messages: render with Markdown
                                <div className="markdown-content">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                    rehypePlugins={[rehypeRaw]}
                                    components={{
                                      code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        return !inline && match ? (
                                          <SyntaxHighlighter
                                            style={vscDarkPlus as any}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{
                                              margin: "0.5rem 0",
                                              borderRadius: "0.5rem",
                                              fontSize: "0.875rem",
                                            }}
                                            {...props}
                                          >
                                            {String(children).replace(/\n$/, "")}
                                          </SyntaxHighlighter>
                                        ) : (
                                          <code
                                            className={className}
                                            style={{
                                              backgroundColor: "rgba(0, 0, 0, 0.1)",
                                              padding: "0.2rem 0.4rem",
                                              borderRadius: "0.25rem",
                                              fontSize: "0.875em",
                                            }}
                                            {...props}
                                          >
                                            {children}
                                          </code>
                                        );
                                      },
                                    }}
                                  >
                                    {formatMarkdown(streamingTexts[message.id] !== undefined ? streamingTexts[message.id] : message.text, searchValue)}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                // User messages: render as plain text
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      searchValue &&
                                        message.text
                                          .toLowerCase()
                                          .includes(searchValue.toLowerCase())
                                        ? message.text.replace(
                                          new RegExp(`(${searchValue})`, "gi"),
                                          '<span class="search-highlight">$1</span>',
                                        )
                                        : message.text,
                                  }}
                                />
                              )}

                              {/* ✅ COPY BUTTON - only for bot messages */}
                              {message.sender === "bot" && (
                                <motion.button
                                  onClick={() =>
                                    handleCopyMessage(message.id, message.text)
                                  }
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  animate={
                                    copiedMessageId === message.id
                                      ? {
                                        scale: [1, 1.2, 1],
                                      }
                                      : {}
                                  }
                                  transition={
                                    copiedMessageId === message.id
                                      ? {
                                        duration: 0.3,
                                      }
                                      : {}
                                  }
                                  style={{
                                    position: "absolute",
                                    bottom: "8px",
                                    right: "48px",
                                    background:
                                      copiedMessageId === message.id
                                        ? userPreferences.colorTheme
                                        : "rgba(0, 0, 0, 0.1)",
                                    border: "none",
                                    cursor: "pointer",
                                    borderRadius: "50%",
                                    padding: "8px",
                                    color:
                                      copiedMessageId === message.id
                                        ? "white"
                                        : userPreferences.themeSettings
                                          .textSecondary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10,
                                    minWidth: "32px",
                                    minHeight: "32px",
                                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                  }}
                                  title={
                                    copiedMessageId === message.id
                                      ? "Copied!"
                                      : "Copy response"
                                  }
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check size={16} />
                                  ) : (
                                    <Copy size={16} />
                                  )}
                                </motion.button>
                              )}

                              {/* ✅ SHARE BUTTON - only for bot messages */}
                              {message.sender === "bot" && (
                                <motion.button
                                  onClick={() =>
                                    handleShareMessage(message.text)
                                  }
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  style={{
                                    position: "absolute",
                                    bottom: "8px",
                                    right: "88px",
                                    background: "rgba(0, 0, 0, 0.1)",
                                    border: "none",
                                    cursor: "pointer",
                                    borderRadius: "50%",
                                    padding: "8px",
                                    color:
                                      userPreferences.themeSettings
                                        .textSecondary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10,
                                    minWidth: "32px",
                                    minHeight: "32px",
                                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                  }}
                                  title="Share response"
                                >
                                  <Share2 size={16} />
                                </motion.button>
                              )}

                              <motion.button
                                onClick={() =>
                                  handleToggleSpeak(message.id, message.text)
                                }
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                animate={
                                  speakingMessageId === message.id
                                    ? {
                                      scale: [1, 1.2, 1],
                                      rotate: [0, 5, -5, 0],
                                    }
                                    : {}
                                }
                                transition={
                                  speakingMessageId === message.id
                                    ? {
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }
                                    : {}
                                }
                                style={{
                                  position: "absolute",
                                  bottom: "8px",
                                  right: "8px",
                                  background:
                                    speakingMessageId === message.id
                                      ? userPreferences.colorTheme
                                      : "rgba(0, 0, 0, 0.1)",
                                  border: "none",
                                  cursor: "pointer",
                                  borderRadius: "50%",
                                  padding: "8px",
                                  color:
                                    speakingMessageId === message.id
                                      ? "white"
                                      : userPreferences.themeSettings
                                        .textSecondary,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  zIndex: 10,
                                  minWidth: "32px",
                                  minHeight: "32px",
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                }}
                                title={
                                  speakingMessageId === message.id
                                    ? "Playing..."
                                    : "Play response"
                                }
                              >
                                <Volume2 size={16} />
                              </motion.button>
                            </div>
                          )}

                          {/* Render web links only for bot messages */}
                          {message.sender === "bot" &&
                            message.webUsed &&
                            message.webUsed.length > 0 && (
                              <div
                                className="web-links-container"
                                style={{
                                  marginTop: "10px",
                                  padding: "10px",
                                  borderTop: `1px solid ${userPreferences.themeSettings.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    marginBottom: "6px",
                                    color:
                                      userPreferences.themeSettings
                                        .textSecondary,
                                  }}
                                >
                                  🌐 Web Sources
                                </div>
                                <ul
                                  style={{ listStyleType: "none", padding: 0 }}
                                >
                                  {message.webUsed.map((link, i) => (
                                    <li
                                      key={link.url || `link-${i}`}
                                      style={{ marginBottom: "5px" }}
                                    >
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          fontSize: "12px",
                                          color: userPreferences.colorTheme,
                                          textDecoration: "underline",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          display: "block",
                                        }}
                                        title={link.url}
                                      >
                                        🔗 {link.title || link.url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>

                        {/* Render predicted questions only for bot messages */}
                        {message.sender === "bot" &&
                          suggestionsByMessageId[message.id]?.length > 0 && (
                            <div style={{ marginTop: "10px" }}>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  marginBottom: "6px",
                                  color:
                                    userPreferences.themeSettings.textSecondary,
                                }}
                              >
                                Related Searches
                              </div>
                              <div
                                className="predicted-questions"
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                }}
                              >
                                {suggestionsByMessageId[message.id].map(
                                  (q, i) => (
                                    <button
                                      key={`${message.id}-${q}-${i}`}
                                      onClick={() => sendMessageWithText(q)}
                                      style={{
                                        border: `1px solid ${userPreferences.themeSettings.border}`,
                                        background:
                                          userPreferences.themeSettings
                                            .background,
                                        color:
                                          userPreferences.themeSettings.text,
                                        borderRadius: "999px",
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {q}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {/* Render options for bot messages */}
                        {message.sender === "bot" &&
                          optionsByMessageId[message.id]?.length > 0 && (
                            <div style={{ marginTop: "10px" }}>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  marginBottom: "6px",
                                  color:
                                    userPreferences.themeSettings.textSecondary,
                                }}
                              >
                                Please select an option:
                              </div>
                              <div
                                className="options-container"
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                {optionsByMessageId[message.id].map(
                                  (option: { label: string; value: string }, i: number) => {
                                    const isSelected = selectedOptionByMessageId[message.id] === option.value;
                                    const isDisabled = selectedOptionByMessageId[message.id] !== undefined;
                                    
                                    return (
                                      <button
                                        key={`${message.id}-option-${i}`}
                                        disabled={isDisabled}
                                        onClick={() => {
                                          if (isDisabled) return;
                                          
                                          // Send the option value to backend, but show label in UI
                                          sendMessageWithText(
                                            option.value,      // This goes to backend
                                            null,              // no file
                                            null,              // no image
                                            null,              // no image preview
                                            option.label       // This shows in UI
                                          );
                                          
                                          // Mark this option as selected (disables all options for this message)
                                          setSelectedOptionByMessageId((prev) => ({
                                            ...prev,
                                            [message.id]: option.value,
                                          }));
                                        }}
                                        style={{
                                          border: `1px solid ${
                                            isSelected 
                                              ? userPreferences.colorTheme 
                                              : userPreferences.themeSettings.border
                                          }`,
                                          background: isSelected
                                            ? userPreferences.colorTheme + "20"
                                            : isDisabled
                                              ? userPreferences.themeSettings.background + "80"
                                              : userPreferences.themeSettings.surface,
                                          color: isDisabled && !isSelected
                                            ? userPreferences.themeSettings.textSecondary + "80"
                                            : isSelected
                                              ? userPreferences.colorTheme
                                              : userPreferences.themeSettings.text,
                                          borderRadius: "8px",
                                          padding: "12px 16px",
                                          cursor: isDisabled ? "not-allowed" : "pointer",
                                          fontSize: "13px",
                                          textAlign: "left",
                                          transition: "all 0.2s ease",
                                          fontWeight: isSelected ? 600 : 500,
                                          opacity: isDisabled && !isSelected ? 0.5 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isDisabled) {
                                            e.currentTarget.style.background =
                                              userPreferences.colorTheme + "20";
                                            e.currentTarget.style.borderColor =
                                              userPreferences.colorTheme;
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isDisabled) {
                                            e.currentTarget.style.background =
                                              userPreferences.themeSettings.surface;
                                            e.currentTarget.style.borderColor =
                                              userPreferences.themeSettings.border;
                                          } else if (isSelected) {
                                            e.currentTarget.style.background =
                                              userPreferences.colorTheme + "20";
                                            e.currentTarget.style.borderColor =
                                              userPreferences.colorTheme;
                                          }
                                        }}
                                      >
                                        {isSelected && "✓ "}{option.label}
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        <div
                          className="message-time"
                          style={{
                            color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

              {searchValue && filteredMessages.length === 0 && (
                <motion.div
                  className="no-results-message"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 20px",
                    textAlign: "center",
                    color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                      opacity: 0.5,
                    }}
                  >
                    🔍
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "500",
                      marginBottom: "8px",
                      color: `var(--chatbot-text-color, ${userPreferences.themeSettings.text})`,
                    }}
                  >
                    No results found
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      opacity: 0.7,
                    }}
                  >
                    Try searching with different keywords
                  </div>
                </motion.div>
              )}
              {isTyping && (
                <motion.div
                  className="message bot"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="message-avatar">
                    <img
                      src={aiAvatarImg}
                      alt="AI Avatar"
                      className="avatar-circle"
                      style={{
                        width: "32px",
                        height: "32px",
                        objectFit: "cover",
                        borderRadius: "50%",
                        background: "transparent"
                      }}
                    />
                  </div>
                  <div className="message-content">
                    <div
                      className="message-bubble typing"
                      style={{
                        background: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                        border: `1px solid ${userPreferences.themeSettings.border}`,
                      }}
                    >
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              className={`input-container${imagePreview || selectedImage || selectedFile ? " has-image-preview" : ""}`}
              style={{
                background: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                borderTop: `1px solid ${userPreferences.themeSettings.border}`,
              }}
            >
              {/* Media/File Preview - shown above input row */}
              {(imagePreview || selectedImage || selectedFile) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  {(imagePreview || selectedImage) && (
                    <div
                      className="image-preview-container"
                      style={{
                        position: "relative",
                        display: "block",
                        flexShrink: 0,
                      }}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Selected preview"
                          className="image-preview"
                          style={{
                            maxWidth: "150px",
                            maxHeight: "150px",
                            width: "auto",
                            height: "auto",
                            borderRadius: "8px",
                            objectFit: "cover",
                            border: `1px solid ${userPreferences.themeSettings.border}`,
                            display: "block",
                            background:
                              `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})` ||
                              "#f0f0f0",
                          }}
                        />
                      ) : (
                        <div
                          className="image-preview-placeholder"
                          style={{
                            width: "150px",
                            height: "100px",
                            borderRadius: "8px",
                            border: `1px dashed ${userPreferences.themeSettings.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background:
                              `var(--chatbot-bg, ${userPreferences.themeSettings.surface})` ||
                              "#f5f5f5",
                            color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                            fontSize: "12px",
                          }}
                        >
                          Loading…
                        </div>
                      )}
                      <button
                        type="button"
                        className="image-preview-remove"
                        style={{
                          position: "absolute",
                          top: "5px",
                          right: "5px",
                          background: "rgba(0, 0, 0, 0.7)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={removeImage}
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <AnimatePresence>
                    {selectedFile && (
                      <motion.div
                        className="selected-file-preview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: "rgba(66, 133, 244, 0.1)",
                          borderRadius: "6px",
                          fontSize: "14px",
                          color: "#4285f4",
                          width: "fit-content",
                        }}
                      >
                        <span style={{ marginRight: "16px" }}>
                          📎 {selectedFile.name}
                        </span>
                        <motion.button
                          onClick={handleRemoveFile}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#4285f4",
                            cursor: "pointer",
                            padding: "2px",
                            borderRadius: "3px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <X size={16} />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="input-actions-container">
                <motion.button
                  className="input-action-btn"
                  onClick={handleClickFileInput}
                  title="Attach file"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{ color: userPreferences.themeSettings.textSecondary }}
                >
                  <Paperclip size={22} />
                </motion.button>
                <motion.button
                  className="input-action-btn"
                  onClick={handleVirtualKeyboard}
                  title="Virtual Keyboard"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                  }}
                >
                  <Keyboard size={22} />
                </motion.button>
                <motion.button
                  className="input-action-btn"
                  onClick={handleFAQOpen}
                  title="FAQ"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{ color: userPreferences.themeSettings.textSecondary }}
                >
                  <HelpCircle size={22} />
                </motion.button>

                <motion.button
                  className={`input-action-btn ${isSoundwaveRecording ? "soundwave-recording" : ""
                    }`}
                  onClick={() => {
                    playRecordingSound(!isSoundwaveRecording ? "start" : "stop");
                    setIsSoundwaveRecording(!isSoundwaveRecording); // 🔥 only UI toggle
                    handleMicPress2(); // 🔥 your same logic
                  }}
                  title={isSoundwaveRecording ? "Stop Recording" : "Mic Input"}
                  whileHover={{ scale: 1.1, color: isSoundwaveRecording ? "red" : userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{ color: isSoundwaveRecording ? "red" : userPreferences.themeSettings.textSecondary }}
                >
                  {isSoundwaveRecording ? <Square fill="currentColor" size={22} /> : <Mic size={22} />}
                </motion.button>
              </div>
              <div
                className={`input-area ${selectedFile || selectedImage ? "file-selected" : ""}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  gap: "8px",
                }}
              >
                <div
                  className="input-area-wrapper"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    gap: "12px",
                  }}
                >
                  <textarea
                    className="inputtextarea"
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      chatMode === "disabled"
                        ? "This conversation has been closed"
                        : isBanned
                          ? "Session terminated"
                          : isRecording
                            ? "Recording..."
                            : selectedFile
                              ? selectedFile.name
                              : selectedImage
                                ? "Image selected"
                                : "Type your message..."
                    }
                    disabled={isTyping || isRecording || isBanned || chatMode === "disabled"}
                    style={{
                      flex: 1,
                      background:
                        chatMode === "disabled"
                          ? "#f3f4f6"
                          : `var(--chatbot-input-bg, ${userPreferences.themeSettings.background})` || "#ffffff",
                      color: chatMode === "disabled"
                        ? "#9ca3af"
                        : userPreferences.themeSettings.text || "#000000",
                      border: `1px solid ${userPreferences.themeSettings.border || "#e0e0e0"}`,
                      borderRadius: "12px",
                      minHeight: "40px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      outline: "none",
                      resize: "none",
                      boxSizing: "border-box",
                      cursor: chatMode === "disabled" ? "not-allowed" : "text",
                    }}
                  ></textarea>

                  <div className="input-actions">
                    <motion.button
                      className="send-btn"
                      onClick={handleSendMessage}
                      disabled={
                        (!inputValue.trim() &&
                          !selectedFile &&
                          !selectedImage) ||
                        isTyping ||
                        isRecording ||
                        isBanned ||
                        chatMode === "disabled"
                      }
                      title="Send message"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background:
                          (inputValue.trim() ||
                            selectedFile ||
                            selectedImage) &&
                            !isTyping &&
                            !isRecording &&
                            !isBanned &&
                            chatMode !== "disabled"
                            ? userPreferences.colorTheme
                            : userPreferences.themeSettings.textSecondary,
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Send size={18} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customization Modals */}
      <ColorPaletteModal
        isOpen={colorPaletteOpen}
        onClose={() => setColorPaletteOpen(false)}
        onColorSelect={handleColorChange}
        currentColor={userPreferences.colorTheme}
      />

      <FontCustomizer
        isOpen={fontCustomizerOpen}
        onClose={() => setFontCustomizerOpen(false)}
        onFontChange={handleFontChange}
        currentSettings={userPreferences.fontSettings}
      />

      <ThemeCustomizer
        isOpen={themeCustomizerOpen}
        onClose={() => setThemeCustomizerOpen(false)}
        onThemeChange={handleThemeChange}
        currentTheme={userPreferences.themeSettings}
      />

      <GreetingCustomizer
        isOpen={greetingCustomizerOpen}
        onClose={() => setGreetingCustomizerOpen(false)}
        onGreetingChange={handleGreetingChange}
        currentGreeting={userPreferences.greetingSettings}
      />

      {/* FAQ Modal */}
      <AnimatePresence>
        {faqOpen && (
          <motion.div
            className="faq-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleFAQClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.div
              className="faq-modal-content"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: `var(--chatbot-bg, ${userPreferences.themeSettings.surface})`,
                borderRadius: "12px",
                padding: "20px",
                width: window.innerWidth < 900 ? "95vw" : "800px",
                height: window.innerHeight < 700 ? "90vh" : "600px",
                overflow: "auto",
                border: `1px solid ${userPreferences.themeSettings.border}`,
                boxShadow: userPreferences.themeSettings.shadow,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <motion.button
                  onClick={handleFAQClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: `var(--chatbot-text-color, ${userPreferences.themeSettings.textSecondary})`,
                    fontSize: "1.5rem",
                  }}
                >
                  <X size={24} />
                </motion.button>
              </div>
              <div style={{ color: userPreferences.themeSettings.text }}>
                <MultilingualFAQ onFAQQuestionClick={handleFAQQuestionClick} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VirtualKeyboard
        isOpen={virtualKeyboardOpen}
        onClose={handleVirtualKeyboardClose}
        onTextInput={handleVirtualKeyboardInput}
        currentText={inputValue}
        defaultLanguage={currentLanguage}
      />

      {/* Hidden file input for file and image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf,.docx,.txt,.md,.html,.csv"
        style={{ display: "none" }}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackSkip}
        onSubmit={handleFeedbackSubmit}
        sessionId={sessionId}
      />
    </div>
  );
};

export default Chatbot;