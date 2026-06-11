import axiosInstance from '../../utils/axiosConfig';

export type AiLessonNoteMode = 'short' | 'detailed';
export type AiLessonNoteSectionType =
  | 'summary'
  | 'keyTakeaways'
  | 'mindMap'
  | 'interviewQuestions'
  | 'examples'
  | 'revisionMaterial';

export interface AiInterviewQuestion {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AiMindMap {
  root: string;
  branches: Array<{
    label: string;
    items: string[];
  }>;
}

export interface AiTimestampSummary {
  start: number;
  end: number;
  label: string;
  summary: string;
}

export interface AiGeneratedFlashcard {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export interface AiGeneratedQuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface AiLessonNote {
  _id: string;
  student: string;
  course: string;
  section: string;
  lesson: string;
  mode: AiLessonNoteMode;
  source?: {
    inputType?: string;
    contentHash?: string;
    transcript?: string;
    transcriptLanguage?: string;
    transcriptGeneratedAt?: string;
  };
  generated: {
    summary: string;
    detailedSummary?: string;
    keyTakeaways: string[];
    timestamps?: AiTimestampSummary[];
    transcriptSegments?: AiTimestampSummary[];
    flashcards?: AiGeneratedFlashcard[];
    quizQuestions?: AiGeneratedQuizQuestion[];
    mindMap: AiMindMap;
    interviewQuestions: AiInterviewQuestion[];
    examples: string[];
    revisionMaterial: string;
  };
  isSavedForRevision: boolean;
  bookmarks: Array<{
    sectionType: AiLessonNoteSectionType;
    label?: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export type VideoSummaryStatus =
  | 'idle'
  | 'pending'
  | 'queued'
  | 'extracting_audio'
  | 'transcribing'
  | 'generating_transcript'
  | 'transcript_completed'
  | 'analyzing_lecture'
  | 'analyzing_transcript'
  | 'transcript_analysis_completed'
  | 'creating_summary'
  | 'generating_summary'
  | 'completed'
  | 'transcript_failed'
  | 'failed';

export interface CourseVideoSummary {
  status: VideoSummaryStatus;
  stage?: string;
  progress?: number;
  aiProcessingProgress?: number;
  aiProcessingStatus?: VideoSummaryStatus;
  aiProcessingError?: string;
  message?: string;
  step?: VideoSummaryStatus;
  warning?: string;
  error?: string;
  sourceVideoUrl?: string;
  selectedVideoFileId?: string;
  selectedVideoMimeType?: string;
  selectedVideoOriginalName?: string;
  selectedVideoSize?: number;
  audioDuration?: number;
  audioSize?: number;
  provider?: string;
  fallbackUsed?: boolean;
  rawTranscript?: string;
  transcript?: string;
  cleanedTranscript?: string;
  transcriptAnalysisMeta?: {
    wordCount?: number;
    estimatedLectureSize?: 'small' | 'medium' | 'long';
    detectedLanguageStyle?: string;
    mainTopics?: string[];
    recommendedSummaryLength?: string;
  };
  transcriptLanguage?: string;
  transcriptWordCount?: number;
  summaryType?: AiLessonNoteMode;
  summaryLanguage?: string;
  summaryAvailable?: boolean;
  rawTranscriptAvailable?: boolean;
  cleanedTranscriptAvailable?: boolean;
  summary?: string;
  generated?: {
    summary?: string;
    detailedSummary?: string;
    keyTakeaways?: string[];
    importantConcepts?: string[];
    topicWisePoints?: AiTimestampSummary[];
    timestamps?: AiTimestampSummary[];
    transcriptSegments?: AiTimestampSummary[];
    flashcards?: AiGeneratedFlashcard[];
    quizQuestions?: AiGeneratedQuizQuestion[];
    revisionNotes?: string;
  };
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  summaryGeneratedAt?: string;
  summaryModel?: string;
  transcriptAnalysisModel?: string;
  summaryVersions?: Record<string, any>;
  uploadedSummary?: string;
  teacherSummary?: string;
}

export const getLatestAiLessonNotes = async (courseId: string, sectionId: string, lessonId: string) => {
  const res = await axiosInstance.get(
    `/lesson-notes/ai/latest/${courseId}/${sectionId}/${lessonId}`,
  );
  return res.data as { success: boolean; data: AiLessonNote | null };
};

export const generateAiLessonNotes = async (params: {
  courseId: string;
  sectionId: string;
  lessonId: string;
  mode: AiLessonNoteMode;
  sourceText?: string;
}) => {
  const res = await axiosInstance.post(`/lesson-notes/ai/generate`, {
    courseId: params.courseId,
    sectionId: params.sectionId,
    lessonId: params.lessonId,
    mode: params.mode,
    sourceText: params.sourceText,
  });
  return res.data as { success: boolean; data: AiLessonNote };
};

export const getVideoSummary = async (courseId: string, sectionId: string, lessonId: string, summaryType: AiLessonNoteMode = 'short') => {
  const res = await axiosInstance.get(
    `/lesson-notes/video-summary/${courseId}/${sectionId}/${lessonId}`,
    { params: { summaryType } },
  );
  return res.data as { success: boolean; data: CourseVideoSummary | null };
};

export const regenerateVideoSummary = async (params: {
  courseId: string;
  sectionId: string;
  lessonId: string;
  summaryType?: AiLessonNoteMode;
  forceRegenerate?: boolean;
  languageHint?: string;
  asrMode?: string;
  onlyTranscript?: boolean;
  persist?: boolean;
  previewOnly?: boolean;
  forceSummary?: boolean;
}) => {
  const res = await axiosInstance.post(`/lesson-notes/video-summary/regenerate`, params);
  return res.data as {
    success: boolean;
    message: string;
    status?: VideoSummaryStatus;
    jobId?: string;
    progress?: number;
    data?: CourseVideoSummary;
    previewSummary?: any;
    mode?: string;
    persisted?: boolean;
    code?: string;
  };
};

export const generateVideoSummary = async (params: {
  courseId: string;
  sectionId: string;
  lessonId: string;
  summaryType: AiLessonNoteMode;
  forceRegenerate?: boolean;
  persist?: boolean;
  previewOnly?: boolean;
  forceSummary?: boolean;
}) => {
  const res = await axiosInstance.post(`/lesson-notes/video-summary/regenerate`, params);
  return res.data as { success: boolean; message: string; data?: CourseVideoSummary; previewSummary?: any; mode?: string; persisted?: boolean };
};

export const bookmarkAiLessonNotes = async (params: {
  aiNoteId: string;
  sectionType: AiLessonNoteSectionType;
  label?: string;
}) => {
  const res = await axiosInstance.post(`/lesson-notes/ai/${params.aiNoteId}/bookmark`, {
    sectionType: params.sectionType,
    label: params.label || '',
  });
  return res.data as { success: boolean; data: AiLessonNote };
};

export const saveAiLessonNotesForRevision = async (params: {
  aiNoteId: string;
  savedForRevision?: boolean;
}) => {
  const res = await axiosInstance.post(`/lesson-notes/ai/${params.aiNoteId}/save`, {
    savedForRevision: params.savedForRevision,
  });
  return res.data as { success: boolean; data: AiLessonNote };
};

