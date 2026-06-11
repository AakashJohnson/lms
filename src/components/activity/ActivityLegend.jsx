import { ACTIVITY_TYPES } from './ActivityTypeIcon';

const tones = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];

export function ActivityLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIVITY_TYPES.filter((type) => type.value !== 'all').slice(0, 10).map((type, index) => (
        <span key={type.value} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
          <span className={`h-2 w-2 rounded-full ${tones[index % tones.length]}`} />
          {type.label}
        </span>
      ))}
    </div>
  );
}
