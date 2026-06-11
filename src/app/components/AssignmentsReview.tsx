import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  NotebookPen,
  Search,
  Send,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSubmissionDetail,
  getTeacherAssignmentOverview,
  getTeacherAssignmentSubmissions,
  reviewAssignmentSubmission,
  uploadTeacherFeedbackFile,
} from '../services/assignmentService';
import { toAbsoluteAssetUrl } from '../utils/fileUrl';

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'graded', label: 'Graded' },
  { value: 'resubmitted', label: 'Resubmitted' },
  { value: 'overdue', label: 'Overdue' },
];

const dateOptions = [
  { value: 'all', label: 'All' },
  { value: 'due_today', label: 'Due Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'this_week', label: 'This Week' },
];

const reviewStatuses = [
  { value: 'graded', label: 'Graded' },
  { value: 'needs_resubmission', label: 'Needs Resubmission' },
  { value: 'rejected', label: 'Rejected' },
];

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const getAssignmentKey = (assignment: any) => String(assignment?.assignmentId || assignment?._id || assignment?.lessonId || '');

const getStatusBadgeClass = (status = '') => {
  switch (status.toLowerCase()) {
    case 'graded':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'submitted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'resubmitted':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'needs_resubmission':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'pending_review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const labelize = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (value: any) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const shortDate = (value: any) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const attachmentUrl = (file: any) => {
  if (!file) return '';
  if (file.fileId) return toAbsoluteAssetUrl(`/api/v1/files/${file.fileId}/download`);
  return toAbsoluteAssetUrl(file.url || '');
};

const getInitials = (name = 'Student') => name
  .split(' ')
  .map((part) => part[0])
  .join('')
  .toUpperCase()
  .slice(0, 2) || 'ST';

function StatCard({
  title,
  value,
  helper,
  tone,
  icon: Icon,
}: {
  title: string;
  value: number;
  helper: string;
  tone: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-extrabold tabular-nums text-slate-950">{value || 0}</p>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
      <span className="tabular-nums">{value || 0}</span>
      {label}
    </span>
  );
}

export function AssignmentsReview() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [panelPulse, setPanelPulse] = useState(false);
  const submissionsPanelRef = useRef<HTMLDivElement | null>(null);

  const [reviewSubmission, setReviewSubmission] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewStatus, setReviewStatus] = useState('graded');
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getTeacherAssignmentOverview({
        status: statusFilter,
        date: dateFilter,
        courseId: courseFilter === 'all' ? '' : courseFilter,
        lessonId: lessonFilter === 'all' ? '' : lessonFilter,
      });
      setAssignments(res.data || []);
      setSummary(res.summary || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOverview(); }, [statusFilter, dateFilter, courseFilter, lessonFilter]);

  const courses = useMemo(() => {
    const seen = new Map<string, string>();
    assignments.forEach((item) => seen.set(item.courseId, item.courseName));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const lessons = useMemo(() => assignments
    .filter((item) => courseFilter === 'all' || item.courseId === courseFilter)
    .map((item) => ({ id: item.lessonId, name: item.lessonTitle })), [assignments, courseFilter]);

  const filteredAssignments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assignments;
    return assignments.filter((item) => [
      item.title,
      item.courseName,
      item.lessonTitle,
      item.instructions,
    ].join(' ').toLowerCase().includes(needle));
  }, [assignments, query]);

  const scrollToSubmissionsPanel = () => {
    setTimeout(() => {
      submissionsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const openSubmissions = async (assignment: any, options: { scroll?: boolean } = { scroll: true }) => {
    const assignmentId = getAssignmentKey(assignment);
    try {
      setSelectedAssignment(assignment);
      setSelectedAssignmentId(assignmentId);
      setPanelPulse(true);
      setSubmissionsLoading(true);
      if (options.scroll !== false) scrollToSubmissionsPanel();
      const res = await getTeacherAssignmentSubmissions(assignmentId);
      setSubmissions(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
      setTimeout(() => setPanelPulse(false), 1200);
    }
  };

  const openReview = async (submission: any) => {
    try {
      setDetailLoading(true);
      const res = await getSubmissionDetail(submission._id);
      const detail = res.data;
      setReviewSubmission(detail);
      setScore(detail.grade?.score ?? detail.score ?? '');
      setFeedback(detail.teacherFeedback?.text || detail.feedback || '');
      setReviewStatus(['graded', 'needs_resubmission', 'rejected'].includes(detail.status) ? detail.status : 'graded');
      setTeacherFile(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to open review');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitReview = async () => {
    if (!reviewSubmission) return;
    const maxScore = Number(reviewSubmission.assignment?.maxScore || selectedAssignment?.maxScore || 100);
    const numericScore = score === '' ? null : Number(score);
    if (reviewStatus === 'graded' && numericScore === null) {
      toast.error('Score is required when marking as graded');
      return;
    }
    if (numericScore !== null && (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > maxScore)) {
      toast.error(`Marks must be between 0 and ${maxScore}`);
      return;
    }
    if (['needs_resubmission', 'rejected'].includes(reviewStatus) && !feedback.trim()) {
      toast.error('Feedback is required for this response status');
      return;
    }
    if (!window.confirm('Submit this response to the student?')) return;

    try {
      setSubmitting(true);
      let teacherAttachment = reviewSubmission.teacherFeedback?.attachment || {};
      if (teacherFile) {
        const upload = await uploadTeacherFeedbackFile(teacherFile);
        teacherAttachment = upload.data;
      }
      const res = await reviewAssignmentSubmission(reviewSubmission._id, {
        score: numericScore,
        feedback,
        status: reviewStatus,
        teacherAttachment,
      });
      setReviewSubmission(res.data);
      setSubmissions((prev) => prev.map((item) => item._id === res.data._id ? { ...item, ...res.data } : item));
      toast.success(reviewSubmission.status === 'graded' ? 'Response updated' : 'Response submitted');
      setTeacherFile(null);
      await loadOverview();
      if (selectedAssignment) await openSubmissions(selectedAssignment, { scroll: false });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewNextPending = () => {
    const next = submissions.find((item) => ['submitted', 'resubmitted', 'pending_review', 'needs_resubmission'].includes(item.status));
    if (next) openReview(next);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 overflow-hidden pb-24">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm">
            <FileCheck className="h-4 w-4" />
            Teacher Workspace
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-950">Assignments Review</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Review, grade, and respond to student assignment submissions</p>
        </div>
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assignments"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setLessonFilter('all'); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300">
            <option value="all">All Courses</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
          <select value={lessonFilter} onChange={(e) => setLessonFilter(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300">
            <option value="all">All Lessons</option>
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300">
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300">
            {dateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Assignments" value={summary.totalAssignments} helper="Across your courses" tone="bg-indigo-100 text-indigo-700" icon={ClipboardCheck} />
        <StatCard title="Total Submissions" value={summary.totalSubmissions} helper="Student attempts" tone="bg-blue-100 text-blue-700" icon={FileText} />
        <StatCard title="Pending Review" value={summary.pendingReview} helper="Need attention" tone="bg-amber-100 text-amber-700" icon={CalendarClock} />
        <StatCard title="Graded" value={summary.graded} helper="Responses sent" tone="bg-emerald-100 text-emerald-700" icon={CheckCircle2} />
        <StatCard title="Overdue" value={summary.overdue} helper="Past due date" tone="bg-rose-100 text-rose-700" icon={AlertCircle} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 min-w-0 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Assignments</h2>
              <p className="text-sm font-medium text-slate-500">{filteredAssignments.length} assignment{filteredAssignments.length === 1 ? '' : 's'} found</p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 font-extrabold text-slate-950">No assignments found</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Try changing the search or filters.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAssignments.map((item) => {
                const id = getAssignmentKey(item);
                const isSelected = selectedAssignmentId === id;
                return (
                  <article
                    key={id}
                    className={cn(
                      'min-w-0 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'
                    )}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 title={item.title} className="truncate text-lg font-extrabold text-slate-950">{item.title}</h3>
                        <p title={`${item.courseName} - ${item.lessonTitle}`} className="mt-1 truncate text-sm font-semibold text-slate-500">
                          {item.courseName} / {item.lessonTitle}
                        </p>
                      </div>
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold', item.overdue > 0 ? getStatusBadgeClass('overdue') : 'border-indigo-200 bg-indigo-50 text-indigo-700')}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        Due {shortDate(item.dueDate)}
                      </span>
                    </div>

                    <p className="mt-4 max-h-12 overflow-hidden text-sm leading-6 text-slate-600">
                      {item.instructions || 'No assignment instructions provided.'}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase text-slate-500">Due Date</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(item.dueDate)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase text-slate-500">Max Score</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{item.maxScore || 100}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <StatChip label="Submissions" value={item.totalSubmissions} tone="border-blue-200 bg-blue-50 text-blue-700" />
                        <StatChip label="Pending" value={item.pendingReview} tone="border-amber-200 bg-amber-50 text-amber-700" />
                        <StatChip label="Graded" value={item.graded} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
                        <StatChip label="Overdue" value={item.overdue} tone="border-rose-200 bg-rose-50 text-rose-700" />
                      </div>
                      <button
                        onClick={() => openSubmissions(item)}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 lg:w-auto"
                      >
                        <Eye className="h-4 w-4" />
                        View Submissions
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside ref={submissionsPanelRef} className="scroll-mt-28 col-span-12 min-w-0 xl:col-span-4 xl:sticky xl:top-24 xl:h-fit">
          <section className={cn(
            'overflow-hidden rounded-3xl border bg-white shadow-sm transition-all',
            panelPulse ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'
          )}>
            {!selectedAssignment ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ClipboardCheck className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-950">Select an assignment</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Choose an assignment from the list to view student submissions.</p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 title={selectedAssignment.title} className="truncate text-lg font-extrabold text-slate-950">{selectedAssignment.title}</h2>
                      <p title={`${selectedAssignment.courseName} - ${selectedAssignment.lessonTitle}`} className="mt-1 truncate text-sm font-semibold text-slate-600">
                        {selectedAssignment.courseName} / {selectedAssignment.lessonTitle}
                      </p>
                    </div>
                    <button onClick={reviewNextPending} className="shrink-0 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Review Next</button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Due</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{shortDate(selectedAssignment.dueDate)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Max Score</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{selectedAssignment.maxScore || 100}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Submissions</p>
                      <p className="mt-1 text-sm font-bold text-blue-700">{selectedAssignment.totalSubmissions || submissions.length}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Pending</p>
                      <p className="mt-1 text-sm font-bold text-amber-700">{selectedAssignment.pendingReview || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {submissionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <FileText className="mx-auto h-10 w-10 text-slate-400" />
                      <h3 className="mt-3 font-extrabold text-slate-950">No submissions yet</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">Students have not submitted this assignment yet.</p>
                    </div>
                  ) : (
                    <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                      {submissions.map((submission) => {
                        const studentName = submission.studentId?.name || 'Student';
                        return (
                          <div key={submission._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                                {getInitials(studentName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p title={studentName} className="truncate font-extrabold text-slate-950">{studentName}</p>
                                    <p title={submission.studentId?.email || submission.studentId?.rollNumber} className="truncate text-xs font-semibold text-slate-500">
                                      {submission.studentId?.email || submission.studentId?.rollNumber || 'No email'}
                                    </p>
                                  </div>
                                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-bold ${getStatusBadgeClass(submission.status)}`}>{labelize(submission.status)}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">Submitted {formatDate(submission.submittedAt)}</span>
                                  <span className={cn('rounded-full border px-2.5 py-1', submission.isLate ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                                    {submission.isLate ? 'Late' : 'On time'}
                                  </span>
                                  {submission.grade?.score !== null && submission.grade?.score !== undefined && (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">Score {submission.grade.score}/{submission.grade.maxScore}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button onClick={() => openReview(submission)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
                              <NotebookPen className="h-4 w-4" />
                              Review Submission
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </aside>
      </div>

      {(reviewSubmission || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Review Submission</h2>
                <p className="text-sm font-semibold text-slate-500">{reviewSubmission?.studentId?.name || 'Loading student'}</p>
              </div>
              <button aria-label="Close review" onClick={() => setReviewSubmission(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {detailLoading ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-500"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />Opening review</div>
            ) : reviewSubmission && (
              <div className="space-y-4 p-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-950">Student Info</h3>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Name</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{reviewSubmission.studentId?.name || 'Student'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Email / Roll No</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{reviewSubmission.studentId?.email || reviewSubmission.studentId?.rollNumber || 'Not available'}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-extrabold text-slate-950">Assignment Details</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{reviewSubmission.course?.title || selectedAssignment?.courseName} / {reviewSubmission.lesson?.title || selectedAssignment?.lessonTitle}</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{reviewSubmission.assignment?.instructions || 'No instructions provided'}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Due {formatDate(reviewSubmission.assignment?.dueDate)}</span>
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Max {reviewSubmission.assignment?.maxScore || selectedAssignment?.maxScore}</span>
                  </div>
                  {attachmentUrl(reviewSubmission.assignment?.attachment) && (
                    <a href={attachmentUrl(reviewSubmission.assignment.attachment)} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100">
                      <Download className="h-4 w-4" />
                      Assignment Attachment
                    </a>
                  )}
                </section>

                <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-extrabold text-blue-950">Student Answer</h3>
                    <span className={`rounded-full border px-2 py-1 text-xs font-bold ${getStatusBadgeClass(reviewSubmission.status)}`}>{labelize(reviewSubmission.status)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs font-semibold text-blue-800">
                    <span>Submitted: {formatDate(reviewSubmission.submittedAt)}</span>
                    {reviewSubmission.resubmittedAt && <span>Resubmitted: {formatDate(reviewSubmission.resubmittedAt)}</span>}
                    {reviewSubmission.isLate && <span className="text-rose-700">Late submission warning</span>}
                  </div>
                  <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-800">
                    <p className="whitespace-pre-line">{reviewSubmission.answerText || 'No text answer provided.'}</p>
                  </div>
                  {attachmentUrl(reviewSubmission.submissionFile || reviewSubmission.attachment) && (
                    <a href={attachmentUrl(reviewSubmission.submissionFile || reviewSubmission.attachment)} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                      <Download className="h-4 w-4" />
                      Open Submitted File
                    </a>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-950">Teacher Marks + Feedback</h3>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Marks</label>
                      <input value={score} onChange={(e) => setScore(e.target.value)} type="number" min={0} max={reviewSubmission.assignment?.maxScore || selectedAssignment?.maxScore || 100} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Grade Status</label>
                      <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-indigo-300">
                        {reviewStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Feedback</label>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Write feedback for the student..." rows={5} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
                  <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100">
                    <Upload className="h-4 w-4" />
                    {teacherFile ? teacherFile.name : 'Upload corrected copy'}
                    <input type="file" className="hidden" onChange={(e) => setTeacherFile(e.target.files?.[0] || null)} />
                  </label>
                  {attachmentUrl(reviewSubmission.teacherFeedback?.attachment) && (
                    <a href={attachmentUrl(reviewSubmission.teacherFeedback.attachment)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-indigo-700">
                      <Download className="h-4 w-4" />
                      Current feedback attachment
                    </a>
                  )}
                </section>

                <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-end">
                  {reviewSubmission.teacherFeedback?.reviewedAt && (
                    <p className="mr-auto flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Reviewed {formatDate(reviewSubmission.teacherFeedback.reviewedAt)}
                    </p>
                  )}
                  <button onClick={() => setReviewSubmission(null)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-white">Cancel</button>
                  <button onClick={() => toast.success('Draft kept in this form')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Save Draft</button>
                  <button onClick={submitReview} disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {reviewSubmission.status === 'graded' ? 'Update Response' : 'Submit Response'}
                  </button>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
