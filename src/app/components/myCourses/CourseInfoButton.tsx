import { Info } from 'lucide-react';
import type { Course } from './types';

interface CourseInfoButtonProps {
  course: Course;
  onClick: (course: Course) => void;
}

export function CourseInfoButton({ course, onClick }: CourseInfoButtonProps) {
  return (
    <button
      type="button"
      aria-label="View course information"
      title="View course information"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick(course);
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-300 bg-white/90 text-indigo-600 shadow-[0_8px_18px_rgba(79,70,229,0.16)] backdrop-blur-md transition-all hover:scale-105 hover:border-indigo-500 hover:bg-indigo-50 active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-100"
    >
      <Info className="h-[18px] w-[18px]" />
    </button>
  );
}
