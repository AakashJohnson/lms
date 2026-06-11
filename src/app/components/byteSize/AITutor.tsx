import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Bot, User, Sparkles, Loader2, Lightbulb, BookOpen, Target,
  Square, Paperclip, FileText, BookMarked, ChevronDown,
  MessageSquare, TrendingUp, Award, CheckCircle2,
  AlertCircle, RefreshCw, Image, Copy, Check
} from 'lucide-react';
import axiosInstance from '../../../utils/axiosConfig';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cached?: boolean;
}

interface Attachment {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  summary: string;
  documentStructure?: {
    chapters?: Array<{ title: string; index: number }>;
    importantConcepts?: Array<{ term: string; score: number }>;
  };
  uploadedAt: string;
}

interface Course {
  _id: string;
  title: string;
  subtitle?: string;
  sections?: Array<{ title: string; lessons?: Array<{ _id: string; title: string }> }>;
}

interface AITutorProps {
  standalone?: boolean;
  onClose?: () => void;
  initialCourseId?: string | null;
  initialLessonId?: string | null;
  initialLessonTitle?: string;
}

const systemPrompts = {
  greeting: "Hi! I'm your AI Learning Tutor - your personal mentor for lessons, PDFs, quizzes, coding, revision, and interview prep.\n\nChoose a teaching mode or ask directly. I'll use your course progress, weak areas, uploaded files, and learning context to guide you step by step.",
  capabilities: "I provide in-depth explanations on: Course content, technical concepts, theories, problem-solving, examples, step-by-step guides, exam preparation, and any learning topic. Ask me anything!",
  fallback: "I'm not sure I understood that. Could you rephrase your question? I'm here to provide detailed explanations on any topic you want to learn!"
};

const tutorModes = [
  'Adaptive Mentor Mode',
  'Beginner Mode',
  'Exam Preparation Mode',
  'Interview Mode',
  'Quick Revision Mode',
  'Deep Dive Mode',
  'Coding Mode',
  'Real-Life Example Mode',
  'Socratic Learning Mode',
];

const cleanInlineFormatting = (text: string) =>
  text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^\s*>\s?/, '')
    .trim();

const getPlainTextLines = (content: string) =>
  content
    .replace(/```[\s\S]*?```/g, block => block.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, ''))
    .split('\n')
    .map(line => line.replace(/\r/g, ''));

export default function AITutor({ standalone = false, onClose, initialCourseId, initialLessonId, initialLessonTitle }: AITutorProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem('ai_tutor_persisted_messages');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return [
      { role: 'assistant', content: systemPrompts.greeting, timestamp: new Date() }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ai_tutor_persisted_selectedCourse') || null;
    } catch {
      return null;
    }
  });
  const [selectedLesson, setSelectedLesson] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ai_tutor_persisted_selectedLesson') || null;
    } catch {
      return null;
    }
  });
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ai_tutor_persisted_conversationId') || null;
    } catch {
      return null;
    }
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    try {
      const raw = localStorage.getItem('ai_tutor_persisted_attachments');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeAttachment, setActiveAttachment] = useState<Attachment | null>(() => {
    try {
      const raw = localStorage.getItem('ai_tutor_persisted_activeAttachment');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCourses, setShowCourses] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [tutorMode, setTutorMode] = useState(() => {
    try {
      return localStorage.getItem('ai_tutor_persisted_tutorMode') || 'Adaptive Mentor Mode';
    } catch {
      return 'Adaptive Mentor Mode';
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const responseCache = useRef<Map<string, string>>(new Map());
  const didApplyInitialContext = useRef(false);

  // Fetch enrolled courses
  useEffect(() => {
    fetchCourses();
    fetchConversation();
  }, []);

  const fetchConversation = async () => {
    try {
      const res = await axiosInstance.get('/byte-size/tutor/conversation', {
        params: {
          courseId: initialCourseId || selectedCourse || undefined,
          lessonId: initialLessonId || selectedLesson || undefined,
        },
      });
      const conversation = res.data?.data;
      if (!conversation?._id) return;
      setConversationId(conversation._id);
      if (conversation.course) setSelectedCourse(String(conversation.course));
      if (conversation.lesson) setSelectedLesson(String(conversation.lesson));
      const dbMessages = (conversation.messages || []).map((message: any) => ({
        role: message.role,
        content: message.content,
        timestamp: new Date(message.timestamp || Date.now()),
      }));
      setMessages(dbMessages.length ? dbMessages : [{ role: 'assistant', content: systemPrompts.greeting, timestamp: new Date() }]);
      setAttachments(conversation.attachments || []);
      const active = (conversation.attachments || []).find((item: any) => String(item._id) === String(conversation.activeAttachmentId));
      setActiveAttachment(active || (conversation.attachments || []).at(-1) || null);
    } catch (error) {
      console.error('Failed to load AI Tutor conversation:', error);
    }
  };

  useEffect(() => {
    if (didApplyInitialContext.current || (!initialCourseId && !initialLessonId)) return;
    didApplyInitialContext.current = true;
    if (initialCourseId) setSelectedCourse(initialCourseId);
    if (initialLessonId) setSelectedLesson(initialLessonId);
    setConversationId(null);
    setActiveAttachment(null);
    setAttachments([]);
    responseCache.current.clear();
    if (initialLessonTitle) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Lesson context active: "${initialLessonTitle}". Ask your question and I will answer using this Byte Learning lesson.`,
          timestamp: new Date()
        }
      ]);
    }
  }, [initialCourseId, initialLessonId, initialLessonTitle]);

  // Write AITutor states to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('ai_tutor_persisted_messages', JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (selectedCourse) {
        localStorage.setItem('ai_tutor_persisted_selectedCourse', selectedCourse);
      } else {
        localStorage.removeItem('ai_tutor_persisted_selectedCourse');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedCourse]);

  useEffect(() => {
    try {
      if (selectedLesson) {
        localStorage.setItem('ai_tutor_persisted_selectedLesson', selectedLesson);
      } else {
        localStorage.removeItem('ai_tutor_persisted_selectedLesson');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedLesson]);

  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem('ai_tutor_persisted_conversationId', conversationId);
      } else {
        localStorage.removeItem('ai_tutor_persisted_conversationId');
      }
    } catch (e) {
      console.error(e);
    }
  }, [conversationId]);

  useEffect(() => {
    try {
      localStorage.setItem('ai_tutor_persisted_tutorMode', tutorMode);
    } catch (e) {
      console.error(e);
    }
  }, [tutorMode]);

  useEffect(() => {
    try {
      localStorage.setItem('ai_tutor_persisted_attachments', JSON.stringify(attachments));
    } catch (e) {
      console.error(e);
    }
  }, [attachments]);

  useEffect(() => {
    try {
      if (activeAttachment) {
        localStorage.setItem('ai_tutor_persisted_activeAttachment', JSON.stringify(activeAttachment));
      } else {
        localStorage.removeItem('ai_tutor_persisted_activeAttachment');
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeAttachment]);

  const fetchCourses = async () => {
    try {
      const res = await axiosInstance.get('/courses/my-enrollments');
      if (res.data?.success && res.data?.data) {
        const enrolledCourses = res.data.data
          .map((enrollment: any) => enrollment.course)
          .filter(Boolean);
        setCourses(enrolledCourses);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedLesson(null);
    setConversationId(null);
    setActiveAttachment(null);
    setAttachments([]);
    responseCache.current.clear();
    const course = courses.find(c => c._id === courseId);
    if (course) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I've selected "${course.title}". Now you can ask me questions about this course. What would you like to know?`,
        timestamp: new Date()
      }]);
    }
    setShowCourses(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (selectedCourse) formData.append('courseId', selectedCourse);
    if (selectedLesson) formData.append('lessonId', selectedLesson);
    if (conversationId) formData.append('conversationId', conversationId);

    try {
      const res = await axiosInstance.post('/byte-size/tutor/attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data?.attachment) {
        const newAttachment = res.data.data.attachment;
        if (res.data.data.conversationId) {
          setConversationId(res.data.data.conversationId);
        }
        setAttachments(prev => [...prev, newAttachment]);
        setActiveAttachment(newAttachment);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I've analyzed your file "${newAttachment.originalName}". ${newAttachment.summary || 'The content is ready for discussion.'}`,
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const sendMessage = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    // Check cache first only for general questions. Course answers need fresh RAG/progress context.
    if (!activeAttachment && !selectedCourse) {
      const cacheKey = `global:${text.toLowerCase()}`;
      const cached = responseCache.current.get(cacheKey);
      if (cached) {
        setMessages(prev => [...prev,
          { role: 'user', content: text, timestamp: new Date() },
          { role: 'assistant', content: cached, timestamp: new Date(), cached: true }
        ]);
        return;
      }
    }

    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);
    setLastQuestion(text);

    // Cancel any previous request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await axiosInstance.post('/byte-size/tutor', {
        message: text,
        courseId: selectedCourse,
        lessonId: selectedLesson,
        conversationId,
        attachmentId: activeAttachment?._id,
        tutorMode,
      }, { signal: controller.signal });

      if (response.data?.success && response.data?.data?.message) {
        const aiMessage = response.data.data.message;
        if (response.data.data.conversationId) {
          setConversationId(response.data.data.conversationId);
        }

        // Cache only general responses; selected-course responses depend on latest RAG/progress.
        if (!activeAttachment && !selectedCourse) {
          const cacheKey = `global:${text.toLowerCase()}`;
          responseCache.current.set(cacheKey, aiMessage);
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiMessage,
          timestamp: new Date(),
          cached: response.data.data.cached
        }]);
      } else {
        throw new Error('No response from AI');
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Request cancelled. Would you like to try a shorter question?',
          timestamp: new Date()
        }]);
      } else {
        setError('Failed to get response. Please try again.');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I'm having trouble connecting to the AI service right now. Please try again or rephrase your question.",
          timestamp: new Date()
        }]);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const handleQuickAction = (action: string) => {
    const actions: Record<string, string> = {
      explain: "Can you explain this topic in depth with clear examples, analogies, and real-world applications? Break it down step-by-step so I can understand it thoroughly.",
      summarize: "Give me a comprehensive summary covering all the key points, main concepts, and important details I need to know.",
      quiz: "Create a detailed quiz with explanations to test my understanding of this topic. Include questions of varying difficulty.",
      examples: "Give me multiple real-world examples of this concept with detailed explanations of how each example demonstrates the principle.",
      interview: "What interview questions might be asked about this topic? Provide detailed answers and explanations for each question.",
      simpler: "Explain this much simpler, like I am a beginner. Use one easy analogy and tiny steps.",
      visual: "Explain this visually using a text diagram, flowchart, or mental model.",
      translate: "Explain this in Hindi/Hinglish in a natural teaching style.",
      practice: "Give me 5 practice questions. After each answer, explain the mistake and correct concept.",
      socratic: "Use Socratic Learning Mode. Ask me one guided question at a time instead of directly giving the full solution.",
      coding: "Explain this with code, line-by-line reasoning, debugging tips, and a small challenge.",
      roadmap: "Create my next best learning action plan based on my progress, weak areas, streak, quizzes, and current course.",
    };
    const prompt = actions[action] || action;
    sendMessage(prompt);
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setIsTyping(false);
  };

  const handleRetry = () => {
    if (lastQuestion) {
      sendMessage(lastQuestion);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderPlainMessage = (content: string) => {
    const blocks: Array<{ type: 'heading' | 'bullet' | 'number' | 'paragraph' | 'spacer'; text: string }> = [];

    getPlainTextLines(content).forEach((rawLine) => {
      const trimmed = rawLine.trim();

      if (!trimmed) {
        blocks.push({ type: 'spacer', text: '' });
        return;
      }

      const headingMatch = trimmed.match(/^#{1,6}\s+(.+)/);
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
      const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
      const cleaned = cleanInlineFormatting(headingMatch?.[1] || bulletMatch?.[1] || numberMatch?.[2] || trimmed);

      if (!cleaned) return;

      if (headingMatch || /^[A-Z][A-Za-z0-9\s/&-]{2,}:$/.test(cleaned)) {
        blocks.push({ type: 'heading', text: cleaned.replace(/:$/, '') });
      } else if (bulletMatch) {
        blocks.push({ type: 'bullet', text: cleaned });
      } else if (numberMatch) {
        blocks.push({ type: 'number', text: `${numberMatch[1]}. ${cleaned}` });
      } else {
        blocks.push({ type: 'paragraph', text: cleaned });
      }
    });

    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {blocks.map((block, i) => {
          if (block.type === 'spacer') {
            return <div key={i} className="h-1" />;
          }

          if (block.type === 'heading') {
            return (
              <p key={i} className="font-semibold text-[15px] mt-3 first:mt-0">
                {block.text}
              </p>
            );
          }

          if (block.type === 'bullet') {
            return (
              <div key={i} className="flex gap-2">
                <span className="mt-[1px] text-indigo-400">•</span>
                <span>{block.text}</span>
              </div>
            );
          }

          return (
            <p key={i} className="whitespace-pre-wrap">
              {block.text}
            </p>
          );
        })}
      </div>
    );
  };

  const quickActions = [
    { icon: Lightbulb, label: 'Explain Simpler', action: 'simpler', color: 'from-blue-500 to-cyan-500' },
    { icon: BookOpen, label: 'Generate Notes', action: 'summarize', color: 'from-purple-500 to-pink-500' },
    { icon: Target, label: 'Practice Quiz', action: 'quiz', color: 'from-emerald-500 to-teal-500' },
    { icon: BookMarked, label: 'Real Examples', action: 'examples', color: 'from-amber-500 to-orange-500' },
    { icon: Award, label: 'Interview Prep', action: 'interview', color: 'from-indigo-500 to-purple-500' },
    { icon: Image, label: 'Explain Visually', action: 'visual', color: 'from-rose-500 to-orange-500' },
    { icon: MessageSquare, label: 'Socratic Mode', action: 'socratic', color: 'from-slate-700 to-slate-900' },
    { icon: TrendingUp, label: 'Next Best Action', action: 'roadmap', color: 'from-lime-500 to-emerald-600' },
  ];

  return (
    <div className={`h-full flex flex-col ${standalone ? 'bg-slate-50' : 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950'}`}>
      {/* Header */}
      <div className={`border-b ${standalone ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-700'} backdrop-blur-xl`}>
        <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl bg-[#2bd196] flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="absolute inset-0 rounded-2xl bg-white/20 blur-xl animate-pulse" />
            <Bot className="relative w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`font-bold ${standalone ? 'text-slate-900' : 'text-white'}`}>
              AI Learning Mentor
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{tutorMode}</span>
              {selectedCourse && (
                <>
                  <span className="mx-1">•</span>
                  <span className="text-indigo-400">Course context active</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Course Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCourses(!showCourses)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCourse
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : standalone ? 'bg-slate-100 text-slate-600' : 'bg-slate-700 text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {selectedCourse
                ? courses.find(c => c._id === selectedCourse)?.title?.slice(0, 15) + '...'
                : 'Select Course'}
              <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showCourses && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute top-full right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl shadow-xl z-50 ${
                    standalone ? 'bg-white border border-slate-200' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  <div className="p-2">
                    {courses.length === 0 ? (
                      <p className={`p-4 text-center ${standalone ? 'text-slate-500' : 'text-slate-400'}`}>
                        No enrolled courses found
                      </p>
                    ) : (
                      courses.map(course => (
                        <button
                          key={course._id}
                          onClick={() => handleCourseSelect(course._id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedCourse === course._id
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : standalone ? 'hover:bg-slate-100' : 'hover:bg-slate-700'
                          }`}
                        >
                          <p className={`font-medium ${standalone ? 'text-slate-900' : 'text-white'}`}>
                            {course.title}
                          </p>
                          {course.subtitle && (
                            <p className={`text-xs ${standalone ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                              {course.subtitle}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                    {selectedCourse && (
                      <button
                        onClick={() => {
                          setSelectedCourse(null);
                          setSelectedLesson(null);
                          setConversationId(null);
                          setActiveAttachment(null);
                          setAttachments([]);
                          responseCache.current.clear();
                          setShowCourses(false);
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: 'Course context removed. I can now help with any topic you want!',
                            timestamp: new Date()
                          }]);
                        }}
                        className={`w-full text-left p-3 rounded-lg text-red-400 hover:bg-red-500/10 mt-2 border-t ${standalone ? 'border-slate-200' : 'border-slate-700'}`}
                      >
                        Clear course context
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to clear the conversation?")) {
                if (conversationId) {
                  try {
                    await axiosInstance.delete('/byte-size/tutor/conversation', { data: { conversationId } });
                  } catch (error) {
                    console.error('Failed to clear tutor conversation:', error);
                  }
                }
                setMessages([{ role: 'assistant', content: systemPrompts.greeting, timestamp: new Date() }]);
                setConversationId(null);
                setActiveAttachment(null);
                setAttachments([]);
                responseCache.current.clear();
                localStorage.removeItem('ai_tutor_persisted_messages');
                localStorage.removeItem('ai_tutor_persisted_conversationId');
                localStorage.removeItem('ai_tutor_persisted_attachments');
                localStorage.removeItem('ai_tutor_persisted_activeAttachment');
              }
            }}
            className={`p-2 rounded-lg ${standalone ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-700 text-slate-400'}`}
            title="Clear Chat"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${standalone ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-700 text-slate-400'}`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="px-4 pb-3">
          <select
            value={tutorMode}
            onChange={(e) => setTutorMode(e.target.value)}
            className={`w-full max-w-xs rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
              standalone
                ? 'border-slate-200 bg-slate-50 text-slate-700'
                : 'border-slate-700 bg-slate-800 text-slate-200'
            }`}
          >
            {tutorModes.map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>

      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === 'assistant'
                ? 'bg-[#2bd196]'
                : standalone ? 'bg-slate-200' : 'bg-slate-700'
            }`}>
              {message.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className={`w-4 h-4 ${standalone ? 'text-slate-600' : 'text-slate-300'}`} />
              )}
            </div>

            <div className={`max-w-[85%] group ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-tr-sm'
                  : standalone
                    ? 'bg-white text-slate-800 rounded-tl-sm shadow-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm'
              }`}>
                {message.role === 'assistant' ? (
                  renderPlainMessage(message.content)
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}

                {message.cached && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs opacity-70">
                    <CheckCircle2 className="w-3 h-3" />
                    From cache
                  </span>
                )}
              </div>

              <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className={`text-xs ${standalone ? 'text-slate-400' : 'text-slate-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => copyToClipboard(message.content, index)}
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    standalone ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-700 text-slate-500'
                  }`}
                >
                  {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2bd196] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className={`p-4 rounded-2xl rounded-tl-sm ${standalone ? 'bg-white' : 'bg-slate-800'}`}>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className={`px-4 py-2 ${standalone ? 'border-t border-slate-200 bg-white' : 'border-t border-slate-700 bg-slate-800/50'}`}>
          <p className={`text-xs mb-2 ${standalone ? 'text-slate-500' : 'text-slate-400'}`}>
            Quick actions:
          </p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleQuickAction(action.action)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${action.color} text-white hover:opacity-90 transition-opacity`}
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachments Bar */}
      {attachments.length > 0 && (
        <div className={`px-4 py-2 border-t ${standalone ? 'border-slate-200 bg-white' : 'border-slate-700'}`}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {attachments.map((att, i) => (
              <div
                key={att._id}
                onClick={() => setActiveAttachment(activeAttachment?._id === att._id ? null : att)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs whitespace-nowrap ${
                  activeAttachment?._id === att._id
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : standalone ? 'bg-slate-100 text-slate-600' : 'bg-slate-700 text-slate-300'
                }`}
              >
                <FileText className="w-3 h-3" />
                {att.originalName?.slice(0, 15)}...
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachments(prev => prev.filter(a => a._id !== att._id));
                    if (activeAttachment?._id === att._id) setActiveAttachment(null);
                  }}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`p-4 border-t ${standalone ? 'border-slate-200 bg-white' : 'border-slate-700'}`}>
        <div className="flex items-center gap-3">
          {/* File Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className={`p-2 rounded-lg transition-colors ${
              uploadingFile
                ? 'opacity-50 cursor-not-allowed'
                : standalone ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-700 text-slate-400'
            }`}
          >
            {uploadingFile ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
            className="hidden"
          />
          <span className={`hidden sm:inline text-xs ${standalone ? 'text-slate-500' : 'text-slate-400'}`}>
            PDF / notes
          </span>

          {/* Input Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything - I'll explain in depth with examples..."
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
              standalone
                ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                : 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-400'
            }`}
          />

          {/* Send/Cancel Button */}
          {isLoading ? (
            <button
              onClick={handleCancel}
              className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Retry Button */}
        {error && !isLoading && lastQuestion && (
          <button
            onClick={handleRetry}
            className="mt-2 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
          >
            <RefreshCw className="w-4 h-4" />
            Retry last question
          </button>
        )}
      </div>
    </div>
  );
}
