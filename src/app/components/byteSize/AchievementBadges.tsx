import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Lock, Star, Flame, BookOpen, CheckCircle,
  Award, Zap, Layers, GraduationCap
} from 'lucide-react';
import { Achievement, UserAchievement } from '../../services/byteSizeService';

interface AchievementBadgesProps {
  achievements: UserAchievement[];
  availableAchievements: Achievement[];
  darkMode: boolean;
  expanded?: boolean;
}

const iconMap: Record<string, any> = {
  play: BookOpen,
  book: BookOpen,
  award: Award,
  star: Star,
  flame: Flame,
  'check-circle': CheckCircle,
  'graduation-cap': GraduationCap,
  zap: Zap,
  layers: Layers,
  trophy: Trophy
};

const rarityColors = {
  common: 'bg-slate-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-gradient-to-r from-yellow-500 to-amber-500'
};

export default function AchievementBadges({
  achievements,
  availableAchievements,
  darkMode,
  expanded = false
}: AchievementBadgesProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const isUnlocked = (achievementId: string) => {
    return achievements.some(a => a.achievementId === achievementId);
  };

  const getUnlockDate = (achievementId: string) => {
    const achievement = achievements.find(a => a.achievementId === achievementId);
    return achievement?.unlockedAt;
  };

  return (
    <div className={`rounded-2xl p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-xl`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Achievements
          </h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {achievements.length} / {availableAchievements.length} unlocked
          </p>
        </div>
      </div>

      <div className={`grid gap-4 ${expanded ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-3'}`}>
        {availableAchievements.map((achievement, index) => {
          const unlocked = isUnlocked(achievement.achievementId);
          const Icon = iconMap[achievement.icon] || Trophy;

          return (
            <motion.button
              key={achievement.achievementId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedAchievement(achievement)}
              className={`relative p-4 rounded-xl transition-all ${
                unlocked
                  ? darkMode ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10'
                  : darkMode ? 'bg-slate-700/50' : 'bg-slate-100'
              } ${unlocked ? 'hover:scale-105' : 'opacity-60'}`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                unlocked
                  ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} text-white`
                  : 'bg-slate-300 dark:bg-slate-600 text-slate-500'
              }`}>
                {unlocked ? (
                  <Icon className="w-6 h-6" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>

              {/* Name */}
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'} text-center`}>
                {achievement.name}
              </p>

              {/* Unlocked Date */}
              {unlocked && getUnlockDate(achievement.achievementId) && (
                <p className={`text-xs text-center mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Date(getUnlockDate(achievement.achievementId)!).toLocaleDateString()}
                </p>
              )}

              {/* Rarity Badge */}
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                unlocked ? rarityColors[achievement.rarity] : 'bg-slate-400'
              }`} />
            </motion.button>
          );
        })}
      </div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-sm w-full p-6 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                isUnlocked(selectedAchievement.achievementId)
                  ? `bg-gradient-to-br ${rarityColors[selectedAchievement.rarity]} text-white`
                  : 'bg-slate-300 text-slate-500'
              }`}>
                {isUnlocked(selectedAchievement.achievementId) ? (
                  (iconMap[selectedAchievement.icon] || Trophy)({ className: 'w-10 h-10' })
                ) : (
                  <Lock className="w-8 h-8" />
                )}
              </div>

              <h3 className={`text-xl font-bold text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {selectedAchievement.name}
              </h3>
              <p className={`text-center mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectedAchievement.description}
              </p>

              <div className={`mt-4 p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Rarity</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedAchievement.rarity === 'legendary' ? 'bg-yellow-500 text-white' :
                    selectedAchievement.rarity === 'epic' ? 'bg-purple-500 text-white' :
                    selectedAchievement.rarity === 'rare' ? 'bg-blue-500 text-white' :
                    'bg-slate-500 text-white'
                  }`}>
                    {selectedAchievement.rarity}
                  </span>
                </div>
                {selectedAchievement.xpReward > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>XP Reward</span>
                    <span className="text-amber-500 font-bold">+{selectedAchievement.xpReward} XP</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedAchievement(null)}
                className="mt-6 w-full py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}