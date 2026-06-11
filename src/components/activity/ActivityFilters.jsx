import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { ACTIVITY_TYPES } from './ActivityTypeIcon';

export function ActivityFilters({ month, activityType, onMonthChange, onActivityTypeChange }) {
  const moveMonth = (offset) => {
    const date = new Date(`${month}-01T00:00:00`);
    date.setMonth(date.getMonth() + offset);
    onMonthChange(date.toISOString().slice(0, 7));
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => moveMonth(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <input
          type="month"
          value={month}
          onChange={(event) => onMonthChange(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
        />
        <button type="button" onClick={() => moveMonth(1)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <label className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <select
          value={activityType}
          onChange={(event) => onActivityTypeChange(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
        >
          {ACTIVITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
