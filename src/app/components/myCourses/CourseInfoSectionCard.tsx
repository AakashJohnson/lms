import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CourseInfoSectionCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}

export function CourseInfoSectionCard({ icon: Icon, title, children, className = '' }: CourseInfoSectionCardProps) {
  return (
    <section className={`rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] sm:p-5 ${className}`}>
      <div className="mb-3.5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Icon className="h-[17px] w-[17px]" />
        </span>
        <h3 className="text-[15px] font-extrabold leading-5 text-slate-950 sm:text-base">{title}</h3>
      </div>
      {children}
    </section>
  );
}
