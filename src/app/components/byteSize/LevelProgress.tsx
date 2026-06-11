import { motion } from 'framer-motion';
import { Crown, Zap, ChevronRight } from 'lucide-react';

interface LevelProgressProps {
  level: number;
  title: string;
  xp: number;
  xpToNext: number;
  darkMode: boolean;
}

export default function LevelProgress({ level, title, xp, xpToNext, darkMode }: LevelProgressProps) {
  const progress = ((xp % xpToNext) / xpToNext) * 100;

  const levelTitles = [
    'Newcomer', 'Explorer', 'Learner', 'Achiever', 'Expert',
    'Master', 'Champion', 'Legend', 'Guru', 'Sage'
  ];

  const nextTitle = levelTitles[Math.min(Math.floor((level - 1) / 10) + 1, levelTitles.length - 1)];

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 ${
      darkMode ? 'bg-slate-800' : 'bg-white'
    } shadow-xl`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Level Badge */}
          <div className="relative">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="w-8 h-8 text-white" />
            </motion.div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {level}
            </div>
          </div>

          {/* Level Info */}
          <div>
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {xp.toLocaleString()} XP total
            </p>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div className="flex-1 max-w-xs mx-8">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Next: {nextTitle}
            </span>
            <span className="text-sm font-medium text-indigo-500">
              {xpToNext - (xp % xpToNext)} XP
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* XP Indicator */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
          darkMode ? 'bg-slate-700' : 'bg-slate-100'
        }`}>
          <Zap className="w-5 h-5 text-amber-500" />
          <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            +{Math.floor(xpToNext * 0.1)} XP
          </span>
          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            / lesson
          </span>
        </div>
      </div>
    </div>
  );
}