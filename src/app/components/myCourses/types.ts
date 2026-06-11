export interface Course {
  id: number | string;
  title: string;
  category: string;
  progress: number;
  enrolled: number;
  duration: string;
  modules: number;
  thumbnail: string;
  description?: string;
  fullDescription?: string;
  overview?: string;
  subtitle?: string;
  rawCourse?: Record<string, unknown>;
  rating: number;
  status: CourseStatus;
  reviewStatus?: string;
  submittedForReviewAt?: string;
  publishedAt?: string;
  adminReview?: { message?: string; decision?: string | null; reviewedAt?: string };
  reviewHistory?: any[];
  price: number;
  lessons?: number;
  trainer?: string;
  createdAt?: string;
  isEnrolled?: boolean;
  enrolledAt?: string;
}

export type CourseStatus = 'active' | 'archived' | 'draft' | 'published' | 'completed' | 'pending_review' | 'changes_requested' | 'rejected' | 'unpublished';

export interface BatchResult {
  totalStudents: number;
  totalBatches: number;
  batchSize: number;
  batches: Array<{
    batchId: string;
    batchName: string;
    batchCode: string;
    studentsCount: number;
  }>;
}
