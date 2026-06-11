import axiosInstance from '../../utils/axiosConfig';

export interface MicroLesson {
  _id: string;
  course: string;
  section: string;
  order: number;
  title: string;
  description: string;
  content: string;
  contentType: string;
  contentUrl: string;
  videoStartTime?: number;
  videoEndTime?: number;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  xpReward: number;
  aiContent: {
    summary: string;
    keyTakeaways: string[];
    simpleExplanation: string;
    examples: string[];
    analogies: string[];
    revisionNotes: string;
  };
  quiz: {
    questions: QuizQuestion[];
    passingScore: number;
  };
  flashcards: Flashcard[];
  interviewQuestions: InterviewQuestion[];
  topics: string[];
  isPublished: boolean;
  userProgress?: LearningProgress;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
  topic: string;
}

export interface InterviewQuestion {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LearningProgress {
  _id: string;
  user: string;
  course: string;
  microLesson: string;
  watchedTime: number;
  totalDuration: number;
  completionPercentage: number;
  isCompleted: boolean;
  completedAt?: string;
  quizAttempted: boolean;
  quizScore: number;
  quizAttempts: number;
  quizBestScore: number;
  flashcardsReviewed: number;
  flashcardsKnown: number;
  isBookmarked: boolean;
  lastPosition: number;
}

export interface UserStats {
  totalXP: number;
  level: number;
  levelTitle: string;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalLessonsCompleted: number;
  totalCoursesCompleted: number;
  totalWatchTime: number;
  weakAreas: WeakArea[];
  achievements: UserAchievement[];
  weeklyStats: WeeklyStats;
  dailyGoalMinutes: number;
  dailyStreakMet: number;
  availableAchievements: Achievement[];
}

export interface WeakArea {
  topic: string;
  poorScoreCount: number;
  lastReviewedAt: string;
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
  progress: number;
}

export interface WeeklyStats {
  startDate: string;
  lessonsCompleted: number;
  xpEarned: number;
  minutesLearned: number;
  quizzesPassed: number;
}

export interface Achievement {
  _id: string;
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  criteria: { type: string; value: number };
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  levelTitle: string;
  streak: number;
  weeklyXP: number;
}

export interface Recommendation {
  nextLessons: MicroLesson[];
  revisionLessons: MicroLesson[];
  weakAreas: WeakArea[];
  dailyGoal: number;
}

// API Functions

export const analyzeContent = async (params: {
  courseId: string;
  content: string;
  options?: { section?: string };
}) => {
  const res = await axiosInstance.post('/byte-size/analyze', params);
  return res.data as { success: boolean; data: any };
};

export const getCourseMicroLessons = async (courseId: string) => {
  const res = await axiosInstance.get(`/byte-size/course/${courseId}`);
  return res.data as { success: boolean; data: MicroLesson[] };
};

export const getMicroLesson = async (lessonId: string) => {
  const res = await axiosInstance.get(`/byte-size/lesson/${lessonId}`);
  return res.data as { success: boolean; data: MicroLesson };
};

export const updateProgress = async (params: {
  lessonId: string;
  watchedTime?: number;
  completionPercentage?: number;
  lastPosition?: number;
}) => {
  const res = await axiosInstance.post('/byte-size/progress', params);
  return res.data as { success: boolean; data: LearningProgress };
};

export const submitQuiz = async (params: {
  lessonId: string;
  answers: number[];
}) => {
  const res = await axiosInstance.post('/byte-size/quiz', params);
  return res.data as {
    success: boolean;
    data: {
      score: number;
      passed: boolean;
      results: any[];
      xpEarned: number;
    };
  };
};

export const getUserStats = async () => {
  const res = await axiosInstance.get('/byte-size/stats');
  return res.data as { success: boolean; data: UserStats };
};

export const getLeaderboard = async (period?: 'weekly' | 'monthly' | 'all') => {
  const res = await axiosInstance.get('/byte-size/leaderboard', {
    params: { period }
  });
  return res.data as {
    success: boolean;
    data: {
      leaders: LeaderboardEntry[];
      currentUserRank: number | null;
      period: string;
    };
  };
};

export const askAITutor = async (params: {
  message: string;
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
  attachmentId?: string;
  tutorMode?: string;
}, options?: { signal?: AbortSignal }) => {
  const res = await axiosInstance.post('/byte-size/tutor', params, {
    signal: options?.signal,
  });
  return res.data as {
    success: boolean;
    data: {
      conversationId: string;
      message: string;
      sources: any[];
      cached?: boolean;
    };
  };
};

export const uploadTutorAttachment = async (params: {
  file: File;
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
}) => {
  const formData = new FormData();
  formData.append('file', params.file);
  if (params.courseId) formData.append('courseId', params.courseId);
  if (params.lessonId) formData.append('lessonId', params.lessonId);
  if (params.conversationId) formData.append('conversationId', params.conversationId);

  const res = await axiosInstance.post('/byte-size/tutor/attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as {
    success: boolean;
    data: {
      conversationId: string;
      summary: string;
      attachment: {
        _id: string;
        originalName: string;
        mimeType: string;
        size: number;
        fileUrl: string;
        summary: string;
        documentStructure?: {
          chapters?: Array<{ title: string; index: number }>;
          importantConcepts?: Array<{ term: string; score: number }>;
        };
        uploadedAt: string;
        extractedText?: string;
      };
    };
  };
};

export const getTutorConversation = async (params?: {
  courseId?: string;
  lessonId?: string;
}) => {
  const res = await axiosInstance.get('/byte-size/tutor/conversation', {
    params
  });
  return res.data as { success: boolean; data: any };
};

export const toggleBookmark = async (lessonId: string) => {
  const res = await axiosInstance.post('/byte-size/bookmark', { lessonId });
  return res.data as { success: boolean; data: { isBookmarked: boolean } };
};

export const getRecommendations = async () => {
  const res = await axiosInstance.get('/byte-size/recommendations');
  return res.data as { success: boolean; data: Recommendation };
};

export const updateMicroLesson = async (lessonId: string, updates: Partial<MicroLesson>) => {
  const res = await axiosInstance.put(`/byte-size/lesson/${lessonId}`, updates);
  return res.data as { success: boolean; data: MicroLesson };
};

export const deleteMicroLesson = async (lessonId: string) => {
  const res = await axiosInstance.delete(`/byte-size/lesson/${lessonId}`);
  return res.data as { success: boolean; message: string };
};

export const getTeacherCourseBytes = async (courseId: string) => {
  const res = await axiosInstance.get(`/byte-size/teacher/courses/${courseId}/bytes`, {
    params: { _t: Date.now() }
  });
  return res.data as {
    success: boolean;
    data: {
      bytes: MicroLesson[];
      stats: {
        total: number;
        draft: number;
        reviewRequired: number;
        published: number;
        archived: number;
      };
    };
  };
};
