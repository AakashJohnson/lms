import { BookOpen, Clock, FileText, ClipboardList, Users, Star, Archive, RotateCcw, CheckCircle2, Trash2, Edit2, Eye, Video, Radio, Calendar, UserPlus } from 'lucide-react';
import type { Course } from './types';
import { StatusBadge } from './StatusBadge';
import { isCourseActive } from './utils';

interface CourseTableRowProps {
  course: Course;
  userRole: 'admin' | 'trainer' | 'participant';
  onSelectCourse: (id: number | string) => void;
  onEditCourse: (course: Course) => void;
  onEditLoading: boolean;
  editingCourseId: number | string | null;
  onPreviewCourse: (course: Course) => void;
  onCreateBatches: (course: Course) => void;
  onPublishDraft: (course: Course) => void;
  onStatusToggle: (course: Course) => void;
  onDeleteCourse: (course: Course) => void;
  statusUpdating: number | string | null;
}

export function CourseTableRow({
  course,
  userRole,
  onSelectCourse,
  onEditCourse,
  onEditLoading,
  editingCourseId,
  onPreviewCourse,
  onCreateBatches,
  onPublishDraft,
  onStatusToggle,
  onDeleteCourse,
  statusUpdating,
}: CourseTableRowProps) {
  return (
    <tr className="hover:bg-indigo-50/30 transition-colors">
      {/* Thumbnail + Title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="relative w-24 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex-shrink-0 group cursor-pointer"
            onClick={() => onSelectCourse(course.id)}
          >
            {course.thumbnail && !course.thumbnail.startsWith('blob:') ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-indigo-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
              <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                <Video className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 line-clamp-2 leading-snug text-sm">
              {course.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {course.createdAt
                ? new Date(course.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A'}
            </p>
            {course.adminReview?.message && ['changes_requested', 'rejected'].includes(course.status) && (
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-orange-700">
                Admin feedback: {course.adminReview.message}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        <span className="inline-block bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
          {course.category}
        </span>
      </td>

      {/* Trainer */}
      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
        {typeof course.trainer === 'string' ? course.trainer : (course.trainer as any)?.fullName || (course.trainer as any)?.name || '—'}
      </td>

      {/* Modules */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1 text-gray-700">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium">{course.modules}</span>
        </div>
      </td>

      {/* Lessons */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1 text-gray-700">
          <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium">{course.lessons ?? '—'}</span>
        </div>
      </td>

      {/* Enrolled */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1 text-gray-700">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium">{course.enrolled}</span>
        </div>
      </td>

      {/* Rating */}
      <td className="px-4 py-3 text-center">
        {course.rating ? (
          <div className="flex items-center justify-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-gray-800">{course.rating}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">New</span>
        )}
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-center">
        <span className="font-bold text-indigo-600">₹{course.price}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <StatusBadge status={course.status} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
          {/* Preview */}
          <button
            onClick={() => onPreviewCourse(course)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors border border-gray-100"
            title="Preview as student"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Edit */}
          <button
            onClick={() => onEditCourse(course)}
            disabled={onEditLoading}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 transition-colors disabled:opacity-50"
            title="Edit course"
          >
            {onEditLoading && editingCourseId === course.id ? (
              <Radio className="w-4 h-4 animate-spin" />
            ) : (
              <Edit2 className="w-4 h-4" />
            )}
          </button>

          {/* Create Batches */}
          {(userRole === 'admin' || userRole === 'trainer') && typeof course.id === 'string' && (
            <button
              onClick={() => onCreateBatches(course)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100 transition-colors"
              title="Create batches"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}

          {/* Draft → Publish */}
          {['draft', 'changes_requested', 'rejected'].includes(course.status) && (
            <button
              onClick={() => onPublishDraft(course)}
              disabled={statusUpdating === course.id}
              className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
              title={course.status === 'draft' ? 'Submit for admin review' : 'Resubmit for admin review'}
            >
              {statusUpdating === course.id ? (
                <Radio className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Active → Archive */}
          {isCourseActive(course) && (
            <button
              onClick={() => onStatusToggle(course)}
              disabled={statusUpdating === course.id}
              className="p-1.5 rounded-lg text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors disabled:opacity-50"
              title="Archive course"
            >
              {statusUpdating === course.id ? (
                <Radio className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Archived → Activate */}
          {course.status === 'archived' && (
            <button
              onClick={() => onStatusToggle(course)}
              disabled={statusUpdating === course.id}
              className="p-1.5 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50"
              title={userRole === 'admin' ? 'Activate course' : 'Submit for admin review'}
            >
              {statusUpdating === course.id ? (
                <Radio className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Delete (admin only) */}
          {userRole === 'admin' && (
            <button
              onClick={() => onDeleteCourse(course)}
              className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              title="Delete course"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
