export function CourseSelector({ courses = [], value, onChange, includeAll = true, label = 'Course' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
      >
        {includeAll && <option value="">All courses</option>}
        {courses.map((course) => (
          <option key={course._id || course.id} value={course._id || course.id}>{course.title || course.name}</option>
        ))}
      </select>
    </label>
  );
}
