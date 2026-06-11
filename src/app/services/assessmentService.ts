import axiosInstance from '../../utils/axiosConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DBAssessment {
  _id: string;
  title: string;
  type: string;
  course: string;
  module?: string;
  description?: string;
  instructions?: string;
  tags?: string[];
  timeLimit?: number;
  attemptsAllowed?: number;
  passingScore?: number;
  gradingType?: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showScore?: boolean;
  showFeedback?: boolean;
  showCorrectAnswers?: string;
  questionsPerPage?: number;
  allowBacktrack?: boolean;
  autoSubmit?: boolean;
  availableFrom?: string;
  availableUntil?: string;
  gracePeriod?: number;
  preventTabSwitch?: boolean;
  requireFullscreen?: boolean;
  questions?: unknown[];
  totalPoints?: number;
  passingMarks?: number;
  visibility?: string;
  isPublished?: boolean;
  publishedAt?: string;
  scheduleAt?: string;
  notifyStudents?: boolean;
  submissions?: number;
  passRate?: number;
  avgScore?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  totalQuestions?: number;
}

export interface AssessmentListResponse {
  success: boolean;
  total?: number;
  page?: number;
  pages?: number;
  data?: DBAssessment[];
  message?: string;
}

export interface AssessmentResponse {
  success: boolean;
  message?: string;
  data?: DBAssessment;
}

export interface AiAssessmentPayload {
  courseId: string;
  sectionId?: string;
  lessonId?: string;
  assessmentType?: string;
  useContent?: Record<string, boolean>;
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: string;
  language?: string;
  teacherInstruction?: string;
  existingQuestions?: unknown[];
  question?: unknown;
}

export interface AiAssessmentResponse {
  success: boolean;
  source?: 'ai' | 'fallback';
  message?: string;
  data?: {
    assessment?: Record<string, any>;
    questions?: any[];
    question?: any;
    knowledgePackSummary?: Record<string, any>;
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getAssessments(
  params?: Record<string, string>
): Promise<AssessmentListResponse> {
  const res = await axiosInstance.get('/assessments', { params });
  return res.data;
}

export async function getAssessment(id: string): Promise<AssessmentResponse> {
  const res = await axiosInstance.get(`/assessments/${id}`);
  return res.data;
}

export async function createAssessment(
  formData: Record<string, unknown>
): Promise<AssessmentResponse> {
  const res = await axiosInstance.post('/assessments', formData);
  return res.data;
}

export async function updateAssessment(
  id: string,
  formData: Record<string, unknown>
): Promise<AssessmentResponse> {
  const res = await axiosInstance.put(`/assessments/${id}`, formData);
  return res.data;
}

export async function updateAssessmentStatus(
  id: string,
  visibility: 'draft' | 'published' | 'scheduled'
): Promise<AssessmentResponse> {
  const res = await axiosInstance.patch(`/assessments/${id}/status`, { visibility });
  return res.data;
}

export async function deleteAssessment(id: string): Promise<AssessmentResponse> {
  const res = await axiosInstance.delete(`/assessments/${id}`);
  return res.data;
}

export async function duplicateAssessment(id: string): Promise<AssessmentResponse> {
  const res = await axiosInstance.post(`/assessments/${id}/duplicate`, {});
  return res.data;
}

export async function generateAssessmentFromSavedContent(
  payload: AiAssessmentPayload
): Promise<AiAssessmentResponse> {
  const res = await axiosInstance.post('/assessments/ai/generate-from-saved-content', payload);
  return res.data;
}

export async function addQuestionsFromSavedContent(
  payload: AiAssessmentPayload
): Promise<AiAssessmentResponse> {
  const res = await axiosInstance.post('/assessments/ai/add-questions-from-saved-content', payload);
  return res.data;
}

export async function regenerateAssessmentQuestion(
  payload: AiAssessmentPayload
): Promise<AiAssessmentResponse> {
  const res = await axiosInstance.post('/assessments/ai/regenerate-question', payload);
  return res.data;
}

// ─── Assessment Attempts ──────────────────────────────────────────────────────

export interface SubmitAssessmentData {
  answers: Record<string, any>;
  proctoring?: any;
  timeTaken?: number;
  courseId?: string;
}

export interface SubmitAssessmentResponse {
  success: boolean;
  message?: string;
  data?: {
    attemptId: string;
    score: {
      obtained: number;
      total: number;
      percentage: number;
    };
    isPassed: boolean;
    attemptNumber: number;
    submittedAt: string;
  };
}

export async function submitAssessment(
  assessmentId: string,
  data: SubmitAssessmentData
): Promise<SubmitAssessmentResponse> {
  const res = await axiosInstance.post(`/assessments/${assessmentId}/submit`, data);
  return res.data;
}

export async function getMyAttempts(assessmentId: string) {
  const res = await axiosInstance.get(`/assessments/${assessmentId}/attempts`);
  return res.data;
}

export async function getAttemptDetails(assessmentId: string, attemptId: string) {
  const res = await axiosInstance.get(`/assessments/${assessmentId}/attempts/${attemptId}`);
  return res.data;
}

export async function getAllAttempts(assessmentId: string, params?: Record<string, string>) {
  const res = await axiosInstance.get(`/assessments/${assessmentId}/all-attempts`, { params });
  return res.data;
}
