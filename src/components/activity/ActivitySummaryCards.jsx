import { CalendarCheck, Clock, Flame, Layers, Trophy } from 'lucide-react';

const formatHours = (seconds = 0) => {
  const hours = Number(seconds || 0) / 3600;
  if (hours < 1) return `${Math.round(Number(seconds || 0) / 60)}m`;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
};

export function ActivitySummaryCards({ summary }) {
  const cards = [
    { label: 'Activities', value: summary?.totalActivities || 0, icon: Layers, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Study Time', value: formatHours(summary?.totalStudySeconds), icon: Clock, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Active Days', value: summary?.activeDays || 0, icon: CalendarCheck, tone: 'text-violet-700 bg-violet-50' },
    { label: 'Completed', value: (summary?.lessonsCompleted || 0) + (summary?.assessmentsCompleted || 0), icon: Trophy, tone: 'text-amber-700 bg-amber-50' },
    { label: 'AI Uses', value: summary?.aiTutorUses || 0, icon: Flame, tone: 'text-rose-700 bg-rose-50' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-slate-950">{card.value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
