import type { DBCourse } from '../../services/courseService';

export const isEmptyHtml = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return !value.some((item) => !isEmptyHtml(item));
  if (typeof value === 'object') return !Object.values(value as Record<string, unknown>).some((item) => !isEmptyHtml(item));

  const raw = String(value || '').replace(/&nbsp;/gi, ' ').trim();
  if (!raw) return true;

  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    const hasMedia = Boolean(doc.body.querySelector('img, video, audio, iframe, table'));
    const text = doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
    return !hasMedia && text.length === 0;
  }

  return raw
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
    .replace(/<div>\s*<br\s*\/?>\s*<\/div>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length === 0;
};

export const hasItems = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.some((item) => !isEmptyHtml(item));

export const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

export const resolveCourseDescription = (course: any): string =>
  String(
    course?.fullDescription ||
    course?.description ||
    course?.shortDescription ||
    course?.overview ||
    course?.summary ||
    '',
  );

export const resolveCourseOutcomes = (course: any): string[] =>
  toArray(course?.learningOutcomes || course?.outcomes || course?.objectives || course?.whatWillStudentsLearn);

export const resolveCourseRequirements = (course: any): string[] =>
  toArray(course?.prerequisites || course?.requirements || course?.requirementsAndPrerequisites);

export const resolveTargetAudience = (course: any): string =>
  String(course?.targetAudience || course?.audience || course?.idealLearner || course?.whoIsThisCourseFor || '');

export const formatDate = (value: unknown): string => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getCourseStatus = (course: any): string => {
  const status = String(course?.status || (course?.isPublished ? 'active' : 'draft') || '').trim();
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const getEnrollmentTypeLabel = (value: unknown): string => {
  const type = String(value || '').toLowerCase();
  if (type === 'approval') return 'Requires Approval';
  if (type === 'invite') return 'Invite Only';
  if (type === 'open') return 'Open Enrollment';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
};

export const getPersonName = (person: any): string => {
  if (!person) return '';
  if (typeof person === 'string') return person.length === 24 && !person.includes(' ') ? '' : person;
  return person.fullName || person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email || '';
};

export const getEntityLabel = (entity: any): string => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  const code = entity.code ? ` (${entity.code})` : '';
  return `${entity.name || entity.title || entity.fullName || entity.email || entity._id || ''}${code}`.trim();
};

export const getCourseStats = (course: DBCourse | any) => {
  const sections = Array.isArray(course?.sections) ? course.sections : [];
  const lessons = sections.flatMap((section: any) => section.lessons || []);
  return {
    sections: sections.length || course?.modules || 0,
    lessons: lessons.length || course?.totalLessons || course?.lessons || course?.lessonsCount || 0,
    videos: lessons.filter((lesson: any) => lesson.type === 'video' || lesson.videoUrl || lesson.lessonVideo).length,
    audio: lessons.filter((lesson: any) => lesson.lessonAudio || lesson.audioAsset?.streamUrl).length,
    documents: lessons.filter((lesson: any) => lesson.type === 'article' || lesson.resources?.length).length,
    quizzes: lessons.filter((lesson: any) => lesson.type === 'quiz' || lesson.questions?.length).length,
    assignments: lessons.filter((lesson: any) => lesson.type === 'assignment' || lesson.assignment).length,
  };
};

export const stripHtml = (value: unknown): string => {
  if (isEmptyHtml(value)) return '';
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};
