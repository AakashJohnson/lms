import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: 'pink' | 'purple' | 'yellow' | 'green' | 'blue';
  trend?: string;
  onClick?: () => void;
}

const colorMap = {
  pink: { bg: 'bg-pink-50', icon: 'bg-pink-100 text-pink-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600' },
  green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600' },
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600' },
};

export function StatCard({ label, value, icon: Icon, color, trend, onClick }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${colors.bg} rounded-2xl p-5 border border-transparent hover:border-gray-200 hover:shadow-md transition-all w-full text-left ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </button>
  );
}