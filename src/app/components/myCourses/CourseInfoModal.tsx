import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Info,
  Layers,
  MessageSquare,
  Play,
  Radio,
  Tag,
  Target,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import { getAssetUrl } from '../../utils/fileUrl';
import type { Course } from './types';
import { StatusBadge } from './StatusBadge';
import { CourseInfoSectionCard } from './CourseInfoSectionCard';
import { ExpandableRichText } from './ExpandableRichText';
import {
  formatDate,
  getCourseStats,
  getCourseStatus,
  getEnrollmentTypeLabel,
  getEntityLabel,
  getPersonName,
  hasItems,
  isEmptyHtml,
  resolveCourseDescription,
  resolveCourseOutcomes,
  resolveCourseRequirements,
  resolveTargetAudience,
} from './courseInfoHelpers';
import { useEffect, useState } from 'react';

interface CourseInfoModalProps {
  isOpen: boolean;
  course: Course | null;
  courseInfo?: any;
  loading?: boolean;
  onClose: () => void;
  onContinue?: (course: Course) => void;
  onEnroll?: (course: Course) => void;
  enrolling?: boolean;
}

const Field = ({ label, value, tone = 'default' }: { label: string; value: unknown; tone?: 'default' | 'success' | 'muted' | 'purple' }) => {
  if (isEmptyHtml(value)) return null;
  const toneClass = tone === 'success' ? 'text-emerald-600' : tone === 'purple' ? 'text-indigo-600' : tone === 'muted' ? 'text-slate-500' : 'text-slate-900';
  return (
    <div className="rounded-[14px] border border-slate-100 bg-slate-50/90 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold leading-5 ${toneClass}`}>{String(value)}</p>
    </div>
  );
};

const PillList = ({ items }: { items: unknown[] }) => {
  const [expanded, setExpanded] = useState(false);
  const labels = items.map(getEntityLabel).filter(Boolean);
  if (!labels.length) return null;
  const visible = expanded ? labels : labels.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((label) => (
        <span key={label} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          {label}
        </span>
      ))}
      {labels.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          {expanded ? 'Show less' : `+${labels.length - 3} more`}
        </button>
      )}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="grid gap-5 lg:grid-cols-2">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="rounded-[18px] border border-slate-200 bg-white p-5">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 space-y-2">
          <div className="h-3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

export function CourseInfoModal({ isOpen, course, courseInfo, loading = false, onClose, onContinue, onEnroll, enrolling = false }: CourseInfoModalProps) {
  const data = courseInfo || course || {};
  const description = resolveCourseDescription(data);
  const outcomes = resolveCourseOutcomes(data);
  const requirements = resolveCourseRequirements(data);
  const targetAudience = resolveTargetAudience(data);
  const stats = getCourseStats(data);
  const trainerName = getPersonName(data.trainer || data.createdBy || data.instructor || course?.trainer);
  const departments = data.assignedDepartments || data.departments || [];
  const batches = data.assignedBatches || data.batches || [];
  const thumbnail = getAssetUrl(data, 'view') || data.thumbnail || course?.thumbnail || '';
  const statusLabel = getCourseStatus(data || course);
  const showNew = !Number(data.rating || data.ratings?.average || course?.rating || 0);

  const enrollmentFields = [
    { label: 'Enrollment Type', value: getEnrollmentTypeLabel(data.enrollmentType || data.enrollType) },
    { label: 'Enrollment Opens', value: formatDate(data.enrollStart || data.enrollmentStartsAt || data.enrollOpenDate) },
    { label: 'Enrollment Closes', value: formatDate(data.enrollEnd || data.enrollmentEndsAt || data.enrollCloseDate) },
    { label: 'Max Students', value: data.maxStudents },
    { label: 'Course Validity', value: data.courseValidity || data.courseValidityDays || data.validityDays ? `${data.courseValidity || data.courseValidityDays || data.validityDays} days` : '' },
    { label: 'Pricing', value: data.pricing?.isFree ? 'Free' : data.pricing?.amount ? `${data.pricing?.currency || 'INR'} ${data.pricing.amount}` : data.price ? `INR ${data.price}` : '' },
  ];

  const hasAssignment = Boolean(trainerName) || hasItems(departments) || hasItems(batches);
  const hasCertificate = data.enableCertificate !== undefined || data.certificateEnabled !== undefined || data.completionCertificate !== undefined || data.enableDiscussion !== undefined || data.certPassScore !== undefined || data.passingScore !== undefined;
  const hasContentStats = Object.values(stats).some((value) => Number(value) > 0);
  const clampedProgress = Math.min(100, Math.max(0, Number(course?.progress ?? 0) || 0));
  const isEnrolled = Boolean((course as any)?.isEnrolled);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-labelledby="course-info-title"
        className="!flex !w-[calc(100vw-16px)] !max-w-[980px] grid-rows-none flex-col gap-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.28)] max-h-[calc(100dvh-16px)] sm:!w-[calc(100vw-48px)] sm:!max-w-[980px] sm:max-h-[calc(100dvh-48px)] sm:rounded-[24px] lg:!max-w-[1024px] [&>button]:hidden"
      >
        <DialogTitle id="course-info-title" className="sr-only">Course Information</DialogTitle>
        <DialogDescription className="sr-only">Complete course information entered by the trainer.</DialogDescription>

        <div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-7 sm:py-5">
          <button
            type="button"
            aria-label="Close course information"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 sm:right-5 sm:top-5"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-3 pr-12 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)] sm:h-12 sm:w-12">
              <Info className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-indigo-700">Course Information</p>
              <h2 className="mt-1.5 line-clamp-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl">{data.title || course?.title || 'Course'}</h2>
              {!isEmptyHtml(data.subtitle) && <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-600">{data.subtitle}</p>}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {!isEmptyHtml(data.category || course?.category) && (
                  <span className="rounded-full bg-gradient-to-r from-[#5B4BFF] to-[#2563EB] px-3 py-1.5 text-xs font-bold text-white">
                    {data.category || course?.category}
                  </span>
                )}
                {statusLabel && <StatusBadge status={(String(data.status || course?.status || 'active') as any)} />}
                {showNew && (
                  <span className="rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-800">
                    New
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="course-info-scroll min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4 pb-[max(40px,env(safe-area-inset-bottom))] [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] sm:px-7 sm:py-5 sm:pb-[max(44px,env(safe-area-inset-bottom))] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {(!isEmptyHtml(description) || thumbnail) && (
                <CourseInfoSectionCard icon={BookOpen} title="1. Basic Info" className="lg:col-span-2">
                  <div className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                      {thumbnail && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          <img src={thumbnail} alt={data.title || 'Course thumbnail'} className="h-44 w-full object-contain sm:h-52 lg:h-56" />
                        </div>
                      )}
                      <div className="grid content-start gap-2 sm:grid-cols-2">
                        <Field label="Title" value={data.title || course?.title} />
                        <Field label="Category" value={data.category || course?.category} />
                        <Field label="Status" value={statusLabel} tone="success" />
                        <Field label="Level" value={data.level} />
                      </div>
                    </div>
                    {!isEmptyHtml(description) && (
                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Description</p>
                        <ExpandableRichText html={description} maxHeight={130} />
                      </div>
                    )}
                  </div>
                </CourseInfoSectionCard>
              )}

              {outcomes.length > 0 && (
                <CourseInfoSectionCard icon={Target} title="2. What Will Students Learn?">
                  <ul className="space-y-2">
                    {outcomes.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CourseInfoSectionCard>
              )}

              {requirements.length > 0 && (
                <CourseInfoSectionCard icon={FileText} title="3. Requirements & Prerequisites">
                  <ul className="space-y-2">
                    {requirements.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CourseInfoSectionCard>
              )}

              {!isEmptyHtml(targetAudience) && (
                <CourseInfoSectionCard icon={Users} title="4. Target Audience">
                  <ExpandableRichText html={targetAudience} maxHeight={110} />
                </CourseInfoSectionCard>
              )}

              {enrollmentFields.some((field) => !isEmptyHtml(field.value)) && (
                <CourseInfoSectionCard icon={Wallet} title="5. Pricing / Enrollment Settings">
                  <div className="grid gap-2">
                    {enrollmentFields.map((field) => (
                      <Field key={field.label} label={field.label} value={field.value} tone={field.label === 'Pricing' ? 'purple' : 'default'} />
                    ))}
                  </div>
                </CourseInfoSectionCard>
              )}

              {hasAssignment && (
                <CourseInfoSectionCard icon={GraduationCap} title="6. Assignment">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-[14px] border border-slate-100 bg-slate-50/90 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-black text-white">
                        {(trainerName || 'N').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Trainer</p>
                        <p className={`truncate text-sm font-bold ${trainerName ? 'text-slate-900' : 'text-slate-500'}`}>{trainerName || 'No trainer assigned'}</p>
                      </div>
                    </div>
                    {hasItems(departments) && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Departments</p>
                        <PillList items={departments} />
                      </div>
                    )}
                    {hasItems(batches) && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Batches</p>
                        <PillList items={batches} />
                      </div>
                    )}
                  </div>
                </CourseInfoSectionCard>
              )}

              {!isEmptyHtml(data.welcomeMessage || data.messaging || data.enrollmentMessage || data.studentWelcomeMessage) && (
                <CourseInfoSectionCard icon={MessageSquare} title="7. Messaging">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Welcome Message</p>
                  <ExpandableRichText html={data.welcomeMessage || data.messaging || data.enrollmentMessage || data.studentWelcomeMessage} maxHeight={110} />
                </CourseInfoSectionCard>
              )}

              {hasCertificate && (
                <CourseInfoSectionCard icon={Award} title="8. Certificate & Completion">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Certificate" value={(data.enableCertificate ?? data.certificateEnabled ?? data.completionCertificate) === false ? 'Disabled' : 'Enabled'} tone={(data.enableCertificate ?? data.certificateEnabled ?? data.completionCertificate) === false ? 'muted' : 'success'} />
                    <Field label="Minimum Passing Score" value={`${data.certPassScore ?? data.minimumPassingScore ?? data.passingScore ?? 70}%`} tone="purple" />
                    <Field label="Discussion Forum" value={(data.enableDiscussion ?? data.discussionForumEnabled) === false ? 'Disabled' : 'Enabled'} tone={(data.enableDiscussion ?? data.discussionForumEnabled) === false ? 'muted' : 'success'} />
                    <Field label="Course Validity" value={data.courseValidity || data.courseValidityDays || data.validityDays ? `${data.courseValidity || data.courseValidityDays || data.validityDays} days` : ''} />
                  </div>
                </CourseInfoSectionCard>
              )}

              {hasContentStats && (
                <CourseInfoSectionCard icon={Layers} title="9. Content Summary">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Sections" value={stats.sections} />
                    <Field label="Lessons" value={stats.lessons} />
                    <Field label="Videos" value={stats.videos} />
                    <Field label="Audio" value={stats.audio} />
                    <Field label="Documents" value={stats.documents} />
                    <Field label="Quizzes" value={stats.quizzes} />
                    <Field label="Assignments" value={stats.assignments} />
                  </div>
                </CourseInfoSectionCard>
              )}

              {course && (
                <CourseInfoSectionCard icon={BadgeCheck} title="10. Course Progress / Student Info" className="lg:col-span-2">
                  <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr]">
                    <div className="rounded-[14px] border border-slate-100 bg-slate-50/90 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progress</p>
                        <p className="text-sm font-black text-indigo-600">{clampedProgress}%</p>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#5B4BFF] to-[#14B8A6]" style={{ width: `${clampedProgress}%` }} />
                      </div>
                    </div>
                    <Field label="Enrollment Status" value={(course as any).isEnrolled ? 'Enrolled' : 'Not enrolled'} tone={(course as any).isEnrolled ? 'success' : 'muted'} />
                    <Field label="Last Activity" value={course.progress ? 'In progress' : 'Not started'} />
                  </div>
                </CourseInfoSectionCard>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-7 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left side */}
            <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
              {course && !isEnrolled && onEnroll && "Review course details before enrolling"}
            </div>
            
            {/* Right side */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              {course && (
                isEnrolled ? (
                  onContinue && (
                    <button
                      type="button"
                      onClick={() => onContinue(course)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4BFF] to-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,70,229,0.26)] hover:shadow-[0_16px_30px_rgba(79,70,229,0.32)]"
                    >
                      <Play className="h-4 w-4" />
                      Continue Learning
                    </button>
                  )
                ) : (
                  onEnroll && (
                    <button
                      type="button"
                      disabled={enrolling}
                      onClick={() => onEnroll(course)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(16,185,129,0.26)] hover:shadow-[0_16px_30px_rgba(16,185,129,0.32)] disabled:opacity-60"
                    >
                      {enrolling ? (
                        <>
                          <Radio className="h-4 w-4 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Enroll Now
                        </>
                      )}
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
