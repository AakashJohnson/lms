import axiosInstance from '../../utils/axiosConfig';

// ─── Response types ───────────────────────────────────────────────────────────

export interface CourseApiResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface DBCourse {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  fullDescription?: string;
  overview?: string;
  shortDescription?: string;
  summary?: string;
  category?: string;
  subCategory?: string;
  language?: string;
  level?: string;
  tags?: string[];
  thumbnail?: string;
  promoVideo?: string;
  sections?: Array<{
    _id: string;
    title: string;
    description?: string;
    fullDescription?: string;
    lessons?: Array<{ 
      _id: string; 
      title: string; 
      type: string;
      content?: string;
      description?: string;
      fullDescription?: string;
      overview?: string;
      transcript?: string;
      summary?: string;
      videoUrl?: string;
      videoDuration?: string;
      lessonImage?: string;
      lessonAudio?: string;
      lessonVideo?: string;
      videoAsset?: any;
      imageAsset?: any;
      audioAsset?: any;
      isPreview?: boolean;
      resources?: any[];
    }>;
  }>;
  objectives?: string[];
  learningOutcomes?: string[];
  outcomes?: string[];
  whatWillStudentsLearn?: string[];
  requirements?: string[];
  prerequisites?: string[];
  requirementsAndPrerequisites?: string[];
  targetAudience?: string;
  audience?: string;
  idealLearner?: string;
  whoIsThisCourseFor?: string;
  pricing?: { isFree: boolean; amount: number; currency: string };
  enrollmentType?: string;
  enrollStart?: string;
  enrollEnd?: string;
  maxStudents?: number;
  currentEnrollments?: number;
  trainer?: string | { _id?: string; name?: string; fullName?: string; firstName?: string; lastName?: string; email?: string };
  departments?: string[] | Array<{ _id: string; name: string; code: string }>;
  batches?: string[] | Array<{ _id: string; name: string; code: string }>;
  visibility?: string;
  status?: string;
  reviewStatus?: string;
  isPublished?: boolean;
  archivedAccess?: boolean;
  archiveMessage?: string;
  submittedForReviewAt?: string;
  publishedAt?: string;
  rejectedAt?: string;
  unpublishedAt?: string;
  adminReview?: {
    decision?: string | null;
    message?: string;
    reviewedAt?: string;
    reviewedBy?: any;
  };
  reviewHistory?: any[];
  enableCertificate?: boolean;
  certPassScore?: number;
  enableDiscussion?: boolean;
  courseValidity?: string;
  welcomeMessage?: string;
  messaging?: string;
  enrollmentMessage?: string;
  studentWelcomeMessage?: string;
  congratsMessage?: string;
  metaTitle?: string;
  metaDescription?: string;
  ratings?: { average: number; count: number };
  statistics?: {
    totalViews: number;
    totalEnrollments: number;
    totalCompletions: number;
  };
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  totalLessons?: number;
}

export interface CoursesListResponse {
  success: boolean;
  total?: number;
  page?: number;
  pages?: number;
  data?: DBCourse[];
  message?: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Fetch single course (full data including thumbnail & sections)
 */
export async function getCourse(courseId: string): Promise<{ success: boolean; data?: DBCourse; message?: string }> {
  const res = await axiosInstance.get(`/courses/${courseId}`);
  return res.data;
}

/**
 * Fetch courses list (with optional filters)
 */
export async function getCourses(
  params?: Record<string, string>
): Promise<CoursesListResponse> {
  const res = await axiosInstance.get('/courses', { params });
  return res.data;
}

/**
 * Create a new course (POST /api/v1/courses)
 */
export async function createCourse(
  formData: Record<string, unknown>
): Promise<CourseApiResponse> {
  const res = await axiosInstance.post('/courses', formData);
  return res.data;
}

/**
 * Save / update an existing course (PUT /api/v1/courses/:id)
 */
export async function updateCourse(
  courseId: string,
  formData: Record<string, unknown>
): Promise<CourseApiResponse> {
  const res = await axiosInstance.put(`/courses/${courseId}`, formData);
  return res.data;
}

export async function saveCourseLesson(
  courseId: string,
  sectionId: string,
  lessonId: string,
  payload: Record<string, unknown>
): Promise<CourseApiResponse> {
  const res = await axiosInstance.patch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, payload);
  return res.data;
}

export async function createCourseLesson(
  courseId: string,
  sectionId: string,
  payload: Record<string, unknown>
): Promise<CourseApiResponse> {
  const res = await axiosInstance.post(`/courses/${courseId}/sections/${sectionId}/lessons`, payload);
  return res.data;
}

export async function createSectionWithLessons(
  courseId: string,
  payload: Record<string, unknown>
): Promise<CourseApiResponse> {
  const res = await axiosInstance.post(`/courses/${courseId}/sections-with-lessons`, payload);
  return res.data;
}

/**
 * Change course status: 'draft' | 'active' | 'archived'
 */
export async function updateCourseStatus(
  courseId: string,
  status: 'draft' | 'active' | 'archived'
): Promise<CourseApiResponse> {
  const res = await axiosInstance.patch(`/courses/${courseId}/status`, { status });
  return res.data;
}
/**
 * Delete a course (admin only)
 */
export async function deleteCourse(courseId: string): Promise<CourseApiResponse> {
  const res = await axiosInstance.delete(`/courses/${courseId}`);
  return res.data;
}

// ─── Enrollment API ───────────────────────────────────────────────────────────

export async function enrollInCourse(courseId: string): Promise<CourseApiResponse> {
  const res = await axiosInstance.post(`/student/courses/${courseId}/enroll`);
  return res.data;
}

export async function getGlobalCourses(params?: {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; courses: any[]; pagination: any }> {
  const res = await axiosInstance.get('/student/courses/global', { params });
  return res.data;
}

export async function submitCourseForReview(courseId: string): Promise<CourseApiResponse> {
  const res = await axiosInstance.put(`/courses/${courseId}/submit-review`);
  return res.data;
}

export async function withdrawCourseReview(courseId: string): Promise<CourseApiResponse> {
  const res = await axiosInstance.put(`/courses/${courseId}/withdraw-review`);
  return res.data;
}

export async function getMyCourses(): Promise<{ success: boolean; data: any[] }> {
  const res = await axiosInstance.get('/student/my-courses');
  return res.data;
}

export async function getEnrollmentStatus(courseId: string): Promise<{ success: boolean; data?: { enrolled: boolean; enrollment?: any } }> {
  const res = await axiosInstance.get(`/courses/${courseId}/enrollment-status`);
  return res.data;
}

export async function getMyEnrollments(params?: Record<string, string>): Promise<{ success: boolean; data?: any[] }> {
  const res = await axiosInstance.get('/courses/my-enrollments', { params });
  return res.data;
}

export async function getCourseProgress(courseId: string): Promise<{ success: boolean; data?: any }> {
  const res = await axiosInstance.get(`/courses/${courseId}/progress`);
  return res.data;
}

export async function updateLessonProgress(courseId: string, data: {
  lessonId: string;
  sectionId: string;
  lastPosition?: number;
  watchedSeconds?: number;
  totalDuration?: number;
  completed?: boolean;
}): Promise<{ success: boolean; data?: any }> {
  const res = await axiosInstance.put(`/courses/${courseId}/progress`, data);
  return res.data;
}

export async function getStudentDashboard(): Promise<{ success: boolean; data?: any }> {
  const res = await axiosInstance.get('/courses/student-dashboard');
  return res.data;
}

export async function getCourseEnrollments(courseId: string, params?: Record<string, string>): Promise<{ success: boolean; data?: any[]; pagination?: any }> {
  const res = await axiosInstance.get(`/courses/${courseId}/enrollments`, { params });
  return res.data;
}

export async function resetCourseProgress(courseId: string): Promise<{ success: boolean; message?: string }> {
  const res = await axiosInstance.post(`/courses/${courseId}/reset-progress`);
  return res.data;
}

export async function getLearningHistory(courseId: string, days: number = 30): Promise<{ success: boolean; data?: any }> {
  const res = await axiosInstance.get(`/courses/${courseId}/learning-history`, { params: { days } });
  return res.data;
}

export async function getLearningStats(): Promise<{ success: boolean; data?: any }> {
  const res = await axiosInstance.get('/courses/learning-stats');
  return res.data;
}
