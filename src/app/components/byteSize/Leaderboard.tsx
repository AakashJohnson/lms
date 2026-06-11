import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, Flame, Zap, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { LeaderboardEntry } from '../../services/byteSizeService';

interface LeaderboardProps {
  leaders: LeaderboardEntry[];
  currentUserRank: number | null;
  darkMode: boolean;
}

export default function Leaderboard({ leaders, currentUserRank, darkMode }: LeaderboardProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-slate-400/10 border-gray-400/20';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30';
      default:
        return darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    }
  };

  return (
    <div className={`rounded-2xl p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Leaderboard
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentUserRank ? `You're #${currentUserRank}` : 'Start learning to rank!'}
            </p>
          </div>
        </div>

        {/* Period Toggle */}
        <div className={`flex rounded-xl p-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {(['weekly', 'monthly', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-indigo-500 text-white'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`text-center p-4 rounded-t-xl ${getRankBg(2)} border-t-4 border-gray-400`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-slate-500 mx-auto mb-2 flex items-center justify-center text-white font-bold">
              {leaders[1]?.name?.charAt(0) || '2'}
            </div>
            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {leaders[1]?.name || 'User'}
            </p>
            <p className="text-amber-600 font-bold">{leaders[1]?.xp?.toLocaleString() || 0} XP</p>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`text-center p-4 rounded-t-xl -mt-4 ${getRankBg(1)} border-t-4 border-yellow-500 scale-110`}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 mx-auto mb-2 flex items-center justify-center text-white font-bold shadow-lg">
              {leaders[0]?.name?.charAt(0) || '1'}
            </div>
            <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {leaders[0]?.name || 'User'}
            </p>
            <p className="text-amber-600 font-bold">{leaders[0]?.xp?.toLocaleString() || 0} XP</p>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`text-center p-4 rounded-t-xl ${getRankBg(3)} border-t-4 border-amber-600`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 mx-auto mb-2 flex items-center justify-center text-white font-bold">
              {leaders[2]?.name?.charAt(0) || '3'}
            </div>
            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {leaders[2]?.name || 'User'}
            </p>
            <p className="text-amber-600 font-bold">{leaders[2]?.xp?.toLocaleString() || 0} XP</p>
          </motion.div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaders.slice(3).map((leader, index) => {
          const isCurrentUser = currentUserRank === leader.rank;
          return (
            <motion.div
              key={leader.userId || index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                isCurrentUser
                  ? 'bg-indigo-500/10 border-2 border-indigo-500'
                  : darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
              }`}
            >
              <span className={`w-8 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {leader.rank}
              </span>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {leader.name?.charAt(0) || '?'}
              </div>

              <div className="flex-1">
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {leader.name}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Level {leader.level}
                  </span>
                  {leader.streak > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Flame className="w-3 h-3" />
                      {leader.streak}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {leader.xp?.toLocaleString() || 0}
                </span>
              </div>
            </motion.div>
          );
        })}

        {leaders.length === 0 && (
          <div className="text-center py-8">
            <Trophy className={`w-12 h-12 mx-auto mb-2 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
              No rankings yet. Start learning to climb the leaderboard!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}