interface StatCardProps {
  icon: React.ElementType;
  color: 'indigo' | 'green' | 'purple' | 'yellow';
  value: number | string;
  label: string;
}

const colorMap = {
  indigo: 'from-indigo-100 to-indigo-50 text-indigo-600',
  green:  'from-green-100 to-green-50 text-green-600',
  purple: 'from-purple-100 to-purple-50 text-purple-600',
  yellow: 'from-yellow-100 to-yellow-50 text-yellow-600',
};

export function StatCard({ icon: Icon, color, value, label }: StatCardProps) {
  const colorClasses = colorMap[color].split(' ');
  return (
    <div className={`bg-gradient-to-br ${colorClasses[0]} ${colorClasses[1]} rounded-2xl p-5`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/70 rounded-xl flex items-center justify-center">
          <Icon className={`w-5 h-5 ${colorClasses[2]}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-xs text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}