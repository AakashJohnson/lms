import { Clock } from 'lucide-react';
import { ActivityTypeIcon, getActivityLabel } from './ActivityTypeIcon';

const formatDuration = (seconds = 0) => {
  const value = Number(seconds || 0);
  if (value < 60) return value ? `${value}s` : '';
  if (value < 3600) return `${Math.round(value / 60)}m`;
  return `${(value / 3600).toFixed(1)}h`;
};

export function ActivityTimeline({ dateKey, logs = [], loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">Day timeline</h2>
          <p className="text-sm font-semibold text-slate-500">{dateKey}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Clock className="h-5 w-5" />
        </span>
      </div>

      {loading && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Loading timeline...</p>}
      {!loading && logs.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No activity logged for this day.</p>}
      {!loading && logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id || log._id} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <ActivityTypeIcon type={log.activityType} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-950">{log.title || getActivityLabel(log.activityType)}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500">{log.timeKey}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-600">{log.description || getActivityLabel(log.activityType)}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span>{getActivityLabel(log.activityType)}</span>
                  {log.course?.title && <span>Course: {log.course.title}</span>}
                  {formatDuration(log.durationSeconds) && <span>Time: {formatDuration(log.durationSeconds)}</span>}
                  {log.scorePercent !== null && log.scorePercent !== undefined && <span>Score: {log.scorePercent}%</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
