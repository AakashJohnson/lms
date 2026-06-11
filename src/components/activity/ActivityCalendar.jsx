import { ActivityLegend } from './ActivityLegend';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildDays = (month) => {
  const start = new Date(`${month}-01T00:00:00`);
  const firstDay = start.getDay();
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  return days;
};

const intensityClass = (count = 0) => {
  if (count >= 8) return 'bg-emerald-600 text-white border-emerald-600';
  if (count >= 4) return 'bg-emerald-200 text-emerald-950 border-emerald-300';
  if (count > 0) return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  return 'bg-white text-slate-500 border-slate-200';
};

export function ActivityCalendar({ month, days = [], selectedDate, onSelectDate }) {
  const dayMap = new Map(days.map((day) => [day.dateKey, day]));
  const calendarDays = buildDays(month);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">Monthly activity</h2>
          <p className="text-sm font-semibold text-slate-500">Darker days mean more logged learning actions.</p>
        </div>
        <ActivityLegend />
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-black uppercase tracking-wide text-slate-400">{day}</div>
        ))}
        {calendarDays.map((dateKey, index) => {
          const data = dateKey ? dayMap.get(dateKey) : null;
          const active = dateKey && selectedDate === dateKey;
          return (
            <button
              key={dateKey || `empty-${index}`}
              type="button"
              disabled={!dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`min-h-[78px] rounded-2xl border p-2 text-left transition ${dateKey ? intensityClass(data?.totalActivities) : 'border-transparent bg-transparent'} ${active ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
            >
              {dateKey && (
                <>
                  <span className="text-sm font-black">{Number(dateKey.slice(-2))}</span>
                  {data?.totalActivities > 0 && (
                    <div className="mt-3 flex items-center justify-between gap-1">
                      <span className="text-xs font-black">{data.totalActivities}</span>
                      <span className="flex gap-1">
                        {(data.activityTypes || []).slice(0, 3).map((type) => (
                          <span key={type} className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                        ))}
                      </span>
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
