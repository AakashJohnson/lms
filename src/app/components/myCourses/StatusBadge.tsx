import type { CourseStatus } from './types';

interface StatusBadgeProps {
  status: CourseStatus;
}

const statusMap: Record<CourseStatus, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-green-100 text-green-700 border border-green-200' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700 border border-green-200' },
  archived:  { label: 'Archived',  cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  pending_review: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  changes_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 border border-red-200' },
  unpublished: { label: 'Unpublished', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, cls } = statusMap[status] ?? statusMap.draft;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
