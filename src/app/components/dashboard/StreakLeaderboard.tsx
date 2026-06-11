'use client';

import { useState, useEffect } from 'react';
import {
  Flame, Trophy, Calendar, Clock, BookOpen, Award,
  ChevronLeft, ChevronRight, Star, Zap, Target, Medal,
  TrendingUp, Lock, CheckCircle2, User
} from 'lucide-react';
import {
  getStreakStats,
  getMonthlyActivity,
  getLeaderboard,
  getUserRank,
  recordDailyLogin
} from '../../services/streakService';

interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null;
  lastActiveDate: string | null;
  totalDaysActive: number;
  totalWatchTimeMinutes: number;
  totalLessonsCompleted: number;
  totalQuizzesCompleted: number;
  totalPoints: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  profilePicture: string | null;
  points: number;
  watchTimeMinutes: number;
  lessonsCompleted: number;
  quizzesCompleted: number;
  streak: number;
  badges: string[];
}

interface UserRank {
  rank: number | null;
  totalPoints: number;
  currentStreak: number;
  totalWatchTimeMinutes: number;
  totalLessonsCompleted: number;
}

interface ActivityDay {
  active: boolean;
  minutes: number;
  lessons: number;
  points: number;
}

const BADGE_ICONS: Record<string, any> = {
  '🔥 Streak Master': Flame,
  '🔥 Week Warrior': Flame,
  '📚 Bookworm': BookOpen,
  '📖 Avid Learner': BookOpen,
  '🧠 Quiz Champion': Trophy,
  '✅ Quiz Taker': CheckCircle2,
  '⏰ Time Lord': Clock,
  '⏱️ Time Keeper': Clock,
  '⭐ Point Master': Star
};

export default function StreakLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null);
  const [monthlyActivity, setMonthlyActivity] = useState<Record<number, ActivityDay>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'overall'>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activePeriod, setActivePeriod] = useState<'weekly' | 'monthly' | 'overall'>('weekly');

  useEffect(() => {
    loadAllData();
    // Record daily login on component mount
    recordDailyLogin();
  }, []);

  useEffect(() => {
    loadLeaderboard(activePeriod);
    loadUserRank(activePeriod);
  }, [activePeriod]);

  useEffect(() => {
    loadMonthlyActivity();
  }, [currentDate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, leaderboardRes, rankRes] = await Promise.all([
        getStreakStats(),
        getLeaderboard('weekly', 15),
        getUserRank('weekly')
      ]);

      if (statsRes.success) setStreakStats(statsRes.data);
      if (leaderboardRes.success) setLeaderboard(leaderboardRes.data);
      if (rankRes.success) setUserRank(rankRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (period: string) => {
    try {
      const res = await getLeaderboard(period, 20);
      if (res.success) setLeaderboard(res.data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const loadUserRank = async (period: string) => {
    try {
      const res = await getUserRank(period);
      if (res.success) setUserRank(res.data);
    } catch (error) {
      console.error('Error loading user rank:', error);
    }
  };

  const loadMonthlyActivity = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const res = await getMonthlyActivity(year, month);
      if (res.success) setMonthlyActivity(res.data);
    } catch (error) {
      console.error('Error loading monthly activity:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'from-amber-500 to-orange-500',
      'from-blue-500 to-indigo-500',
      'from-green-500 to-emerald-500',
      'from-purple-500 to-pink-500',
      'from-red-500 to-rose-500',
      'from-teal-500 to-cyan-500'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Streak Card */}
        <div className="group relative bg-gradient-to-br from-orange-50 via-white to-red-50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Learning Streak</p>
                <p className="text-xs text-gray-500">Consecutive days</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">{streakStats?.currentStreak || 0}</span>
              <span className="text-lg font-medium text-gray-500">days</span>
            </div>
            {streakStats?.lastActiveDate && (
              <p className="text-xs text-gray-400 mt-2">
                Last active: {new Date(streakStats.lastActiveDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </p>
            )}
            {streakStats?.currentStreak > 0 && (
              <div className="mt-3 flex items-center gap-1">
                {[...Array(Math.min(streakStats.currentStreak, 7))].map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < streakStats.currentStreak ? 'bg-orange-500' : 'bg-gray-200'}`} />
                ))}
                {streakStats.currentStreak > 7 && <span className="text-xs text-orange-500 ml-1">+{streakStats.currentStreak - 7}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Longest Streak Card */}
        <div className="group relative bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Longest Streak</p>
                <p className="text-xs text-gray-500">Personal best</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">{streakStats?.longestStreak || 0}</span>
              <span className="text-lg font-medium text-gray-500">days</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(i)} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white`}>
                    {i}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-500">{streakStats?.totalDaysActive || 0} total active days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <Clock className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-lg font-bold text-gray-900">{formatWatchTime(streakStats?.totalWatchTimeMinutes || 0)}</p>
          <p className="text-xs text-gray-500">Watch Time</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <BookOpen className="w-5 h-5 text-green-600 mb-2" />
          <p className="text-lg font-bold text-gray-900">{streakStats?.totalLessonsCompleted || 0}</p>
          <p className="text-xs text-gray-500">Lessons</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-100">
          <Target className="w-5 h-5 text-pink-600 mb-2" />
          <p className="text-lg font-bold text-gray-900">{streakStats?.totalQuizzesCompleted || 0}</p>
          <p className="text-xs text-gray-500">Quizzes</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
          <Zap className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-lg font-bold text-gray-900">{streakStats?.totalPoints || 0}</p>
          <p className="text-xs text-gray-500">Points</p>
        </div>
      </div>

      {/* Activity Calendar */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Activity Calendar
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[100px] text-center">
              {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {[...Array(getFirstDayOfMonth())].map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {[...Array(getDaysInMonth())].map((_, i) => {
            const day = i + 1;
            const activity = monthlyActivity[day];
            const isActive = activity?.active;
            const isTodayDate = isToday(day);

            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all cursor-pointer hover:scale-110 ${
                  isActive
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-400'
                } ${isTodayDate ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                title={activity ? `${activity.minutes} min, ${activity.lessons} lessons` : 'No activity'}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-green-400 to-emerald-500" />
            <span className="text-xs text-gray-500">Active Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-50" />
            <span className="text-xs text-gray-500">No Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded ring-2 ring-indigo-500" />
            <span className="text-xs text-gray-500">Today</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['weekly', 'monthly', 'overall'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActivePeriod(tab)}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                activePeriod === tab
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {tab === 'weekly' && <TrendingUp className="w-4 h-4" />}
                {tab === 'monthly' && <Calendar className="w-4 h-4" />}
                {tab === 'overall' && <Trophy className="w-4 h-4" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </span>
              {activePeriod === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              )}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                index < 3 ? 'bg-gradient-to-r from-amber-50/50 to-transparent' : ''
              }`}
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                entry.rank === 1
                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg'
                  : entry.rank === 2
                  ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                  : entry.rank === 3
                  ? 'bg-gradient-to-br from-orange-400 to-amber-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {entry.rank <= 3 ? (
                  <Trophy className="w-4 h-4" />
                ) : (
                  entry.rank
                )}
              </div>

              {/* Avatar */}
              <div className="relative">
                {entry.profilePicture ? (
                  <img
                    src={entry.profilePicture}
                    alt={entry.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center text-white font-bold text-sm shadow`}>
                    {getInitials(entry.name)}
                  </div>
                )}
                {entry.streak > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <Flame className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{entry.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatWatchTime(entry.watchTimeMinutes)}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {entry.lessonsCompleted}
                  </span>
                  {entry.streak > 0 && (
                    <span className="text-xs text-orange-500 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {entry.streak}d
                    </span>
                  )}
                </div>
              </div>

              {/* Points & Badges */}
              <div className="text-right">
                <p className="font-bold text-indigo-600">{entry.points.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  {entry.badges.slice(0, 2).map((badge) => {
                    const Icon = BADGE_ICONS[badge] || Award;
                    return (
                      <div key={badge} className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center" title={badge}>
                        <Icon className="w-3 h-3 text-amber-600" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No leaderboard data available</p>
            </div>
          )}
        </div>

        {/* Your Rank - Fixed at bottom */}
        {userRank && userRank.rank && (
          <div className="sticky bottom-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
                #{userRank.rank}
              </div>
              <div>
                <p className="font-semibold">Your Rank</p>
                <p className="text-xs text-white/70">{userRank.totalPoints.toLocaleString()} points</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4" /> {userRank.currentStreak} day streak
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {formatWatchTime(userRank.totalWatchTimeMinutes)}
              </span>
            </div>
          </div>
        )}

        {/* Not in top - show anyway */}
        {userRank && !userRank.rank && (
          <div className="sticky bottom-0 bg-gray-100 p-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Your Position</p>
                <p className="text-xs text-gray-500">Keep learning to rank up!</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" /> {userRank.totalPoints} pts
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> {userRank.totalLessonsCompleted} lessons
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}