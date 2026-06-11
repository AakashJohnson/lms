import type { Course, CourseStatus } from './types';
import type { DBCourse } from '../../services/courseService';

export const INITIAL_COURSES: Course[] = [
  {
    id: 1,
    title: 'Cooperative Management Fundamentals',
    category: 'Management',
    progress: 75,
    enrolled: 145,
    duration: '8 weeks',
    modules: 12,
    lessons: 48,
    trainer: 'Dr. Rajesh Kumar',
    createdAt: '2026-01-15',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
    rating: 4.5,
    status: 'active',
    price: 50,
  },
  {
    id: 2,
    title: 'Digital Marketing for Cooperatives',
    category: 'Marketing',
    progress: 45,
    enrolled: 98,
    duration: '6 weeks',
    modules: 10,
    lessons: 35,
    trainer: 'Prof. Anita Sharma',
    createdAt: '2026-02-10',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    rating: 4.8,
    status: 'active',
    price: 50,
  },
  {
    id: 3,
    title: 'Financial Literacy & Accounting',
    category: 'Finance',
    progress: 90,
    enrolled: 234,
    duration: '10 weeks',
    modules: 15,
    lessons: 60,
    trainer: 'CA Suresh Patel',
    createdAt: '2025-11-20',
    thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
    rating: 4.7,
    status: 'archived',
    price: 50,
  },
  {
    id: 4,
    title: 'Legal Compliance for Cooperatives',
    category: 'Legal',
    progress: 20,
    enrolled: 67,
    duration: '5 weeks',
    modules: 8,
    lessons: 24,
    trainer: 'Dr. Meera Singh',
    createdAt: '2026-03-05',
    thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop',
    rating: 4.6,
    status: 'draft',
    price: 50,
  },
];

export const mapDBCourse = (c: DBCourse): Course => {
  const totalLessons =
    c.totalLessons ??
    (c.sections ?? []).reduce((sum, s) => sum + (s.lessons?.length ?? 0), 0);

  const reviewStatus = c.reviewStatus || (c.isPublished ? 'published' : 'draft');
  const statusRaw = (c.status === 'archived' ? 'archived' : (reviewStatus || c.status || (c.isPublished ? 'published' : 'draft'))) as CourseStatus;
  const status: CourseStatus = ['active', 'archived', 'draft', 'published', 'pending_review', 'changes_requested', 'rejected', 'unpublished'].includes(statusRaw)
    ? statusRaw
    : 'draft';

  let trainerName = '';
  if (c.trainer) {
    if (typeof c.trainer === 'object' && c.trainer !== null) {
      const trainer = c.trainer as any;
      trainerName = trainer.fullName || trainer.name || `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() || trainer.email || '';
    } else if (typeof c.trainer === 'string') {
      const trainerStr = c.trainer as string;
      if (trainerStr.length !== 24 || trainerStr.includes(' ')) {
        trainerName = trainerStr;
      }
    }
  }

  return {
    id: c._id,
    title: c.title,
    category: c.category ?? 'General',
    progress: (c as any).progress ?? 0,
    enrolled: (c as any).enrolledCount ?? c.statistics?.totalEnrollments ?? c.currentEnrollments ?? 0,
    duration: (c as any).duration || 'TBD',
    modules: (c.sections ?? []).length,
    lessons: (c as any).lessonsCount ?? totalLessons,
    thumbnail: c.thumbnail || '',
    description: c.description || '',
    fullDescription: c.fullDescription || '',
    overview: c.overview || '',
    subtitle: c.subtitle || '',
    rawCourse: c as unknown as Record<string, unknown>,
    rating: (c as any).rating ?? c.ratings?.average ?? 0,
    status,
    reviewStatus,
    submittedForReviewAt: c.submittedForReviewAt,
    publishedAt: c.publishedAt,
    adminReview: c.adminReview,
    reviewHistory: c.reviewHistory,
    price: c.pricing?.amount ?? 50,
    trainer: (c as any).teacherName || trainerName,
    createdAt: c.createdAt?.slice(0, 10) ?? '',
  };
};

export const isCourseActive = (c: Course): boolean => c.status === 'active' || c.status === 'published';

export const countCourseStatus = (courses: Course[]) => ({
  published: courses.filter((c) => c.reviewStatus === 'published' || isCourseActive(c)).length,
  archived: courses.filter((c) => c.status === 'archived' || c.reviewStatus === 'unpublished').length,
  draft: courses.filter((c) => c.status === 'draft').length,
});

export const getLoggedTrainerName = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.name || user?.fullName || user?.username || '';
  } catch {
    return '';
  }
};
