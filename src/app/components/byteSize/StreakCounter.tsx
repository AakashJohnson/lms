import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface StreakCounterProps {
  streak: number;
  darkMode: boolean;
}

export default function StreakCounter({ streak, darkMode }: StreakCounterProps) {
  const isActive = streak > 0;

  return (
    <motion.div
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      } shadow-lg ${isActive ? 'ring-2 ring-amber-500/50' : ''}`}
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative">
        <Flame
          className={`w-6 h-6 ${isActive ? 'text-amber-500' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}
        />
        {isActive && (
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Flame className="w-6 h-6 text-amber-400" />
          </motion.div>
        )}
      </div>
      <span className={`font-bold text-lg ${isActive ? 'text-amber-500' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {streak}
      </span>
      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        day{streak !== 1 ? 's' : ''}
      </span>

      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {isActive ? `Keep it up! ${streak} day streak!` : 'Start learning to begin your streak!'}
      </div>
    </motion.div>
  );
}