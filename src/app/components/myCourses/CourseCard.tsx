import { Play, Clock, BookOpen, Users, Star, CheckCircle2, Radio, Eye, Edit2, Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { Course } from './types';
import { StatusBadge } from './StatusBadge';
import { isCourseActive } from './utils';

interface CourseCardProps {
  course: Course;
  userRole: 'admin' | 'trainer' | 'participant';
  onSelectCourse: (id: number | string) => void;
  onEditCourse: (course: Course) => void;
  onEditLoading: boolean;
  editingCourseId: number | string | null;
  onPreviewCourse: (course: Course) => void;
  onPublishDraft: (course: Course) => void;
  onStatusToggle: (course: Course) => void;
  onDeleteCourse: (course: Course) => void;
  onEnroll: (course: Course) => void;
  onRateCourse: (course: Course) => void;
  onCreateBatches: (course: Course) => void;
  statusUpdating: number | string | null;
  enrolling: string | null;
}

export function CourseCard({
  course,
  userRole,
  onSelectCourse,
  onEditCourse,
  onEditLoading,
  editingCourseId,
  onPreviewCourse,
  onPublishDraft,
  onStatusToggle,
  onDeleteCourse,
  onEnroll,
  onRateCourse,
  onCreateBatches,
  statusUpdating,
  enrolling,
}: CourseCardProps) {
  const isEnrolled = (course as any).isEnrolled;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Thumbnail */}
      <div className="relative h-44 bg-gradient-to-br from-indigo-100 to-indigo-50 overflow-hidden">
        {course.thumbnail && !course.thumbnail.startsWith('blob:') ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-indigo-200" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            {course.category}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full text-xs font-medium">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-gray-900">{course.rating || 'New'}</span>
        </div>
        <div className="absolute bottom-3 left-3">
          <StatusBadge status={course.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-base text-gray-900 mb-3 line-clamp-2">
          {course.title}
        </h3>

        {/* Progress Bar (for participants) */}
        {userRole === 'participant' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-500">Progress</span>
              <span className="font-semibold text-indigo-700">{course.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Course Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{course.modules} modules</span>
          </div>
          {userRole !== 'participant' && (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{course.enrolled}</span>
            </div>
          )}
          {userRole !== 'participant' && (
            <div className="flex items-center gap-1 col-span-3 text-indigo-600 font-semibold">
              <span>₹{course.price}</span>
              <span className="text-gray-400 font-normal">per learner</span>
            </div>
          )}
        </div>

        {/* Participant Actions */}
        {userRole === 'participant' ? (
          isEnrolled ? (
            <div className="space-y-2">
              <button
                onClick={() => typeof course.id === 'string' ? onPreviewCourse(course) : onSelectCourse(course.id)}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2.5 rounded-xl font-medium hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {(course as any).progress === 0 ? 'Start Learning' : (course as any).progress >= 100 ? 'Review Course' : 'Continue Learning'}
              </button>
              {(course as any).progress >= 100 && (
                <button
                  onClick={() => onRateCourse(course)}
                  className="w-full bg-white border-2 border-yellow-200 text-yellow-600 py-2.5 rounded-xl font-medium hover:bg-yellow-50 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Rate Course
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onEnroll(course)}
              disabled={enrolling === course.id}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {enrolling === course.id ? <Radio className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Enroll Now
            </button>
          )
        ) : (
          /* Admin/Trainer Actions */
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onPreviewCourse(course)}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-xl font-medium hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              title="Preview as student"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            <button
              onClick={() => onEditCourse(course)}
              disabled={onEditLoading}
              className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Edit"
            >
              {onEditLoading && editingCourseId === course.id ? (
                <Radio className="w-4 h-4 animate-spin" />
              ) : (
                <Edit2 className="w-4 h-4" />
              )}
            </button>

            {course.status === 'draft' && (
              <button
                onClick={() => onPublishDraft(course)}
                disabled={statusUpdating === course.id}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all disabled:opacity-50"
                title="Publish"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isCourseActive(course) && (
              <button
                onClick={() => onStatusToggle(course)}
                disabled={statusUpdating === course.id}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-all disabled:opacity-50"
                title="Archive"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
            {course.status === 'archived' && (
              <button
                onClick={() => onStatusToggle(course)}
                disabled={statusUpdating === course.id}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all disabled:opacity-50"
                title="Activate"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {userRole === 'admin' && (
              <button
                onClick={() => onDeleteCourse(course)}
                className="p-2.5 border border-red-100 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}