import { motion } from 'framer-motion';
import { Star, Zap } from 'lucide-react';

interface XPBadgeProps {
  xp: number;
  level: number;
  darkMode: boolean;
}

export default function XPBadge({ xp, level, darkMode }: XPBadgeProps) {
  const getTierColor = () => {
    if (xp >= 10000) return 'from-yellow-500 to-orange-500';
    if (xp >= 5000) return 'from-purple-500 to-pink-500';
    if (xp >= 2000) return 'from-emerald-500 to-teal-500';
    return 'from-indigo-500 to-purple-500';
  };

  return (
    <motion.div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      } shadow-lg`}
      whileHover={{ scale: 1.05 }}
    >
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getTierColor()} flex items-center justify-center`}>
        <Star className="w-4 h-4 text-white" />
      </div>
      <div>
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {xp.toLocaleString()}
          </span>
        </div>
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Lvl {level}
        </span>
      </div>
    </motion.div>
  );
}