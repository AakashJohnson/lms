import axiosInstance from '../../utils/axiosConfig';

export interface AiLessonQuestionSource {
  label?: string;
  start?: number;
  end?: number;
  text?: string;
}

export interface AiLessonQuestion {
  _id: string;
  course: string;
  section: string;
  lesson: string;
  question: string;
  answer: string;
  sources: AiLessonQuestionSource[];
  transcriptAvailable: boolean;
  usedGlobalKnowledge: boolean;
  contextAvailability?: {
    transcript?: boolean;
    summary?: boolean;
    flashcards?: boolean;
    questionAnswers?: boolean;
    resources?: boolean;
    knowledgeChecks?: boolean;
    studentNotes?: boolean;
  };
  model?: string;
  createdAt: string;
}

export const askLessonQuestion = async (params: {
  courseId: string;
  sectionId: string;
  lessonId: string;
  question: string;
  language?: string;
  currentTimestamp?: number | null;
}) => {
  const res = await axiosInstance.post('/lesson-ai/ask', {
    courseId: params.courseId,
    lessonId: params.lessonId,
    sectionId: params.sectionId,
    question: params.question,
    language: params.language || 'auto',
    currentTimestamp: params.currentTimestamp ?? null,
    includeFullContext: true,
  });
  return res.data as { success: boolean; data: AiLessonQuestion };
};

export const getLessonQuestionHistory = async (
  courseId: string,
  sectionId: string,
  lessonId: string,
) => {
  const res = await axiosInstance.get(
    `/lesson-ai-questions/history/${courseId}/${sectionId}/${lessonId}`,
  );
  return res.data as { success: boolean; data: AiLessonQuestion[] };
};
