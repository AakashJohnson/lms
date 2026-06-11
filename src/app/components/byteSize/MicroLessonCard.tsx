import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Clock, Zap, Check, Bookmark, ChevronRight,
  Brain, BarChart2, Target
} from 'lucide-react';
import { MicroLesson } from '../../services/byteSizeService';

interface MicroLessonCardProps {
  lesson: MicroLesson;
  onFocusMode: (lesson: MicroLesson) => void;
  darkMode: boolean;
}

export default function MicroLessonCard({ lesson, onFocusMode, darkMode }: MicroLessonCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(lesson.userProgress?.isBookmarked || false);

  const difficultyColors = {
    beginner: 'bg-emerald-500',
    intermediate: 'bg-amber-500',
    advanced: 'bg-red-500'
  };

  const progress = lesson.userProgress?.completionPercentage || 0;
  const isCompleted = lesson.userProgress?.isCompleted || false;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-4 rounded-xl cursor-pointer transition-all ${
        darkMode
          ? 'bg-slate-700/50 hover:bg-slate-700 border-slate-600'
          : 'bg-slate-50 hover:bg-white border-slate-200'
      } border ${isCompleted ? 'border-emerald-500/50' : ''}`}
      onClick={() => onFocusMode(lesson)}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail / Icon */}
        <div className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ${
          isCompleted
            ? 'bg-emerald-500'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }`}>
          {isCompleted ? (
            <Check className="w-8 h-8 text-white absolute inset-0 m-auto" />
          ) : (
            <Play className="w-6 h-6 text-white absolute inset-0 m-auto" />
          )}

          {/* Duration Badge */}
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lesson.duration}m
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'} line-clamp-2`}>
              {lesson.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsBookmarked(!isBookmarked);
              }}
              className={`p-1.5 rounded-lg ${isBookmarked ? 'text-indigo-500' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>

          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-1 mt-1`}>
            {lesson.description || lesson.aiContent?.summary}
          </p>

          {/* Meta Info */}
          <div className="flex items-center gap-3 mt-3">
            {/* Difficulty */}
            <span className={`flex items-center gap-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className={`w-2 h-2 rounded-full ${difficultyColors[lesson.difficulty]}`} />
              {lesson.difficulty}
            </span>

            {/* XP */}
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Zap className="w-3 h-3" />
              +{lesson.xpReward} XP
            </span>

            {/* Topics */}
            {lesson.topics?.[0] && (
              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {lesson.topics[0]}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {progress > 0 && !isCompleted && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {Math.round(progress)}% complete
              </span>
            </div>
          )}
        </div>

        <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'} flex-shrink-0`} />
      </div>

      {/* AI Features Badge */}
      {lesson.quiz?.questions?.length > 0 && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500 text-xs flex items-center gap-1">
          <Brain className="w-3 h-3" />
          Quiz
        </div>
      )}

      {lesson.flashcards?.length > 0 && (
        <div className="absolute top-2 right-10 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-xs flex items-center gap-1">
          <BarChart2 className="w-3 h-3" />
          {lesson.flashcards.length} cards
        </div>
      )}
    </motion.div>
  );
}