import { Search, UserRound } from 'lucide-react';

const getName = (student = {}) => student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email || 'Student';

export function StudentSelector({ mode, students = [], selectedStudentId, onSelect, query, onQueryChange, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">Student</p>
          <p className="text-xs font-semibold text-slate-500">{mode === 'admin' ? 'Search platform learners' : 'Choose an enrolled learner'}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <UserRound className="h-5 w-5" />
        </span>
      </div>

      {mode === 'admin' && (
        <div className="mb-3 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-emerald-500">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Name or email"
            className="h-full flex-1 bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      )}

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {loading && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Loading students...</p>}
        {!loading && students.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No students found.</p>}
        {!loading && students.map((item) => {
          const student = item.student || item;
          const id = student._id || student.id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(student)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedStudentId === id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-black">{getName(student)}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{student.email}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
