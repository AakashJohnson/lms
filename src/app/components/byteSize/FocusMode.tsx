import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Pause, RotateCcw, Check, Bookmark, Brain, BarChart2,
  MessageCircle, ChevronLeft, ChevronRight, Lightbulb, Target,
  Zap, Volume2, VolumeX, Maximize, Minimize, Bot
} from 'lucide-react';
import { MicroLesson, updateProgress, submitQuiz, toggleBookmark } from '../../services/byteSizeService';
import confetti from 'canvas-confetti';
import AITutor from './AITutor';
import { toAbsoluteAssetUrl } from '../../utils/fileUrl';

interface FocusModeProps {
  lesson: MicroLesson;
  onClose: () => void;
  darkMode: boolean;
  userRole?: 'admin' | 'trainer' | 'participant';
}

type ViewMode = 'content' | 'notes' | 'flashcards' | 'quiz';

export default function FocusMode({ lesson, onClose, darkMode, userRole }: FocusModeProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const [viewMode, setViewMode] = useState<ViewMode>('content');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(lesson.userProgress?.completionPercentage || 0);
  const [isBookmarked, setIsBookmarked] = useState(lesson.userProgress?.isBookmarked || false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; xpEarned: number } | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [showNotes, setShowNotes] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);

  const difficultyColors = {
    beginner: 'bg-emerald-500',
    intermediate: 'bg-amber-500',
    advanced: 'bg-red-500'
  };

  const videoUrl = useMemo(() => getLessonVideoUrl(lesson), [lesson]);
  const displayContent = useMemo(() => cleanLessonContent(lesson.content), [lesson.content]);
  const hasPlayableVideo = Boolean(videoUrl);
  const requestedClipStart = useMemo(() => getByteClipStart(lesson), [lesson]);
  const requestedClipDuration = useMemo(() => Math.max(1, Number(lesson.duration || 1) * 60), [lesson.duration]);

  useEffect(() => {
    completedRef.current = false;
    setProgress(lesson.userProgress?.completionPercentage || 0);
    setCurrentTime(0);
    setVideoDuration(0);
    setClipStart(0);
    setClipEnd(0);
  }, [lesson._id, lesson.userProgress?.completionPercentage]);

  // Simulate progress only for text-only bytes. Real videos update progress from the media element.
  useEffect(() => {
    if (hasPlayableVideo) return;
    let interval: NodeJS.Timeout;
    if (isPlaying && progress < 100) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + 0.5, 100);
          if (newProgress >= 100) {
            handleComplete();
          }
          return newProgress;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, progress, hasPlayableVideo]);

  const handleComplete = async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsPlaying(false);
    try {
      await updateProgress({
        lessonId: lesson._id,
        completionPercentage: 100
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B']
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      const res = await toggleBookmark(lesson._id);
      if (res.success) {
        setIsBookmarked(res.data.isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handlePlaybackToggle = async () => {
    if (!hasPlayableVideo || !videoRef.current) {
      setIsPlaying((playing) => !playing);
      return;
    }

    try {
      if (videoRef.current.paused) {
        await videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    } catch (error) {
      console.error('Error playing byte video:', error);
      setIsPlaying(false);
    }
  };

  const handleVideoProgress = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const start = clipStart || 0;
    const end = clipEnd || Math.min(video.duration, start + requestedClipDuration);
    const clipDuration = Math.max(1, end - start);
    if (video.currentTime >= end) {
      video.pause();
      video.currentTime = end;
      setCurrentTime(end);
      setProgress(100);
      handleComplete();
      return;
    }
    setCurrentTime(video.currentTime);
    setVideoDuration(clipDuration);
    setProgress(Math.min(100, Math.max(0, ((video.currentTime - start) / clipDuration) * 100)));
  };

  const handleVideoMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const assetDuration = video.duration;
    const safeStart = requestedClipStart < assetDuration - 1 ? requestedClipStart : 0;
    const explicitEnd = Number(lesson.videoEndTime || 0);
    const safeEnd = explicitEnd > safeStart ? Math.min(explicitEnd, assetDuration) : Math.min(assetDuration, safeStart + requestedClipDuration);
    setClipStart(safeStart);
    setClipEnd(safeEnd);
    setVideoDuration(Math.max(1, safeEnd - safeStart));
    setCurrentTime(safeStart);
    video.currentTime = safeStart;
  };

  const seekVideo = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const start = clipStart || 0;
    const end = clipEnd || Math.min(video.duration, start + requestedClipDuration);
    video.currentTime = Math.max(start, Math.min(end, video.currentTime + seconds));
    handleVideoProgress();
  };

  const watchedTime = Math.max(0, currentTime - clipStart);
  const remainingTime = Math.max(0, videoDuration - watchedTime);

  const handleQuizSubmit = async () => {
    try {
      const res = await submitQuiz({
        lessonId: lesson._id,
        answers: quizAnswers
      });
      if (res.success) {
        setQuizResult({
          score: res.data.score,
          passed: res.data.passed,
          xpEarned: res.data.xpEarned
        });
        if (res.data.passed) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const handleCardKnown = (index: number) => {
    setKnownCards(prev => new Set([...prev, index]));
    if (currentCard < lesson.flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col ${
        darkMode ? 'bg-slate-900' : 'bg-slate-50'
      }`}
    >
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 ${
        darkMode ? 'bg-slate-800/80' : 'bg-white/80'
      } backdrop-blur-xl border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X className={`w-6 h-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
          <div>
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {lesson.title}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`flex items-center gap-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${difficultyColors[lesson.difficulty]}`} />
                {lesson.difficulty}
              </span>
              <span className={`flex items-center gap-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <Target className="w-3 h-3" />
                {lesson.duration} min
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <Zap className="w-3 h-3" />
                +{lesson.xpReward} XP
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBookmark}
            className={`p-2 rounded-lg ${isBookmarked ? 'text-indigo-500' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 flex flex-col p-6">
          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'content', label: 'Content', icon: Play },
              { id: 'notes', label: 'AI Notes', icon: Bot },
              { id: 'flashcards', label: 'Flashcards', icon: BarChart2 },
              { id: 'quiz', label: 'Quiz', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === tab.id
                    ? 'bg-indigo-500 text-white'
                    : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content View */}
          <AnimatePresence mode="wait">
            {viewMode === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex-1 rounded-2xl overflow-hidden ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                } shadow-xl`}
              >
                {/* Video/Content Player */}
                <div className={`relative flex items-center justify-center overflow-hidden ${hasPlayableVideo ? 'h-[58vh] min-h-[360px] max-h-[680px] bg-black' : 'aspect-video bg-gradient-to-br from-indigo-500/20 to-purple-500/20'}`}>
                  {hasPlayableVideo ? (
                    <>
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="h-full w-full object-contain"
                        playsInline
                        muted={isMuted}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onTimeUpdate={handleVideoProgress}
                        onLoadedMetadata={handleVideoMetadata}
                        onEnded={handleComplete}
                      />
                      {!isPlaying && (
                        <button
                          onClick={handlePlaybackToggle}
                          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-500 text-white shadow-2xl shadow-indigo-900/30 transition hover:scale-105"
                          aria-label="Play video"
                        >
                          <Play className="ml-1 h-8 w-8" />
                        </button>
                      )}
                      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-slate-950/82 p-3 text-white shadow-2xl backdrop-blur">
                        <div className="mb-3 grid gap-2 text-xs font-semibold text-white/85 sm:grid-cols-4">
                          <span>Watched: {formatTime(watchedTime)}</span>
                          <span>Total: {formatTime(videoDuration)}</span>
                          <span>Left: {formatTime(remainingTime)}</span>
                          <span>{Math.round(progress)}% complete</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => seekVideo(-10)}
                            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20"
                          >
                            -10s
                          </button>
                          <button
                            onClick={handlePlaybackToggle}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400"
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            {isPlaying ? 'Pause' : 'Play'}
                          </button>
                          <button
                            onClick={() => seekVideo(10)}
                            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20"
                          >
                            +10s
                          </button>
                          <button
                            onClick={() => setIsMuted((muted) => !muted)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20"
                          >
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            {isMuted ? 'Unmute' : 'Sound On'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                        {isPlaying ? (
                          <button
                            onClick={handlePlaybackToggle}
                            className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            <Pause className="w-8 h-8 text-white" />
                          </button>
                        ) : (
                          <button
                            onClick={handlePlaybackToggle}
                            className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            <Play className="w-8 h-8 text-white ml-1" />
                          </button>
                        )}
                      </div>
                      <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                        {isPlaying ? 'Playing...' : 'Click to start'}
                      </p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
                    <motion.div
                      className="h-full bg-indigo-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Content Text */}
                <div className="p-6 max-h-64 overflow-y-auto">
                  <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {lesson.aiContent?.summary || lesson.description}
                  </h3>
                  <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                    {displayContent || lesson.description}
                  </p>
                </div>
              </motion.div>
            )}

            {viewMode === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex-1 rounded-2xl overflow-hidden ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                } shadow-xl p-6 overflow-y-auto`}
              >
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  AI-Generated Notes
                </h3>

                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h4 className={`font-semibold mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      Summary
                    </h4>
                    <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      {lesson.aiContent?.summary || 'No summary available'}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  <div>
                    <h4 className={`font-semibold mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      Key Takeaways
                    </h4>
                    <ul className="space-y-2">
                      {lesson.aiContent?.keyTakeaways?.map((takeaway, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                            {takeaway}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Simple Explanation */}
                  <div>
                    <h4 className={`font-semibold mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                      Easy Explanation
                    </h4>
                    <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      {lesson.aiContent?.simpleExplanation}
                    </p>
                  </div>

                  {/* Examples */}
                  <div>
                    <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      Examples
                    </h4>
                    <ul className="space-y-2">
                      {lesson.aiContent?.examples?.map((example, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                            {example}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {viewMode === 'flashcards' && (
              <motion.div
                key="flashcards"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex-1 rounded-2xl overflow-hidden ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                } shadow-xl p-6 flex flex-col`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Flashcards
                  </h3>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {currentCard + 1} / {lesson.flashcards?.length || 0}
                  </span>
                </div>

                {lesson.flashcards && lesson.flashcards.length > 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Flashcard
                      card={lesson.flashcards[currentCard]}
                      darkMode={darkMode}
                      isKnown={knownCards.has(currentCard)}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                      No flashcards available for this lesson
                    </p>
                  </div>
                )}

                {lesson.flashcards && lesson.flashcards.length > 0 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                      onClick={() => setCurrentCard(Math.max(0, currentCard - 1))}
                      disabled={currentCard === 0}
                      className="p-3 rounded-xl bg-slate-200 dark:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCardKnown(currentCard)}
                      className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600"
                    >
                      I Know This
                    </button>
                    <button
                      onClick={() => setCurrentCard(Math.min(lesson.flashcards!.length - 1, currentCard + 1))}
                      disabled={currentCard === lesson.flashcards!.length - 1}
                      className="p-3 rounded-xl bg-slate-200 dark:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {viewMode === 'quiz' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex-1 rounded-2xl overflow-hidden ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                } shadow-xl p-6 overflow-y-auto`}
              >
                {quizResult ? (
                  <div className="text-center py-8">
                    <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      quizResult.passed ? 'bg-emerald-500' : 'bg-red-500'
                    }`}>
                      {quizResult.passed ? (
                        <Check className="w-12 h-12 text-white" />
                      ) : (
                        <RotateCcw className="w-12 h-12 text-white" />
                      )}
                    </div>
                    <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {quizResult.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
                    </h3>
                    <p className={`text-lg mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Score: {quizResult.score}%
                    </p>
                    {quizResult.xpEarned > 0 && (
                      <p className="text-amber-500 font-bold text-xl">
                        +{quizResult.xpEarned} XP Earned!
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setQuizResult(null);
                        setQuizAnswers([]);
                      }}
                      className="mt-6 px-6 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Quiz
                    </h3>
                    {lesson.quiz?.questions?.map((question, qIndex) => (
                      <div key={qIndex} className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                        <p className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {qIndex + 1}. {question.question}
                        </p>
                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => (
                            <button
                              key={oIndex}
                              onClick={() => {
                                const newAnswers = [...quizAnswers];
                                newAnswers[qIndex] = oIndex;
                                setQuizAnswers(newAnswers);
                              }}
                              className={`w-full text-left p-3 rounded-lg transition-all ${
                                quizAnswers[qIndex] === oIndex
                                  ? 'bg-indigo-500 text-white'
                                  : darkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleQuizSubmit}
                      disabled={quizAnswers.length !== lesson.quiz?.questions?.length}
                      className="w-full py-3 rounded-xl bg-indigo-500 text-white font-medium disabled:opacity-50 hover:bg-indigo-600"
                    >
                      Submit Quiz
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar - AI Tutor */}
        {userRole === 'participant' && (
          <div className={`w-80 border-l p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#2bd196] flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                AI Tutor
              </span>
            </div>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Ask questions about this lesson and get instant answers.
            </p>
            <button
              onClick={() => setShowAITutor(true)}
              className="mt-4 w-full py-3 rounded-xl bg-[#2bd196] hover:bg-[#25c088] text-white font-medium transition-all"
            >
              Ask AI Tutor
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAITutor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950"
          >
            <AITutor
              onClose={() => setShowAITutor(false)}
              initialCourseId={String(lesson.course || lesson.courseId || '')}
              initialLessonId={lesson._id}
              initialLessonTitle={lesson.title}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Progress Bar */}
      <div className={`px-6 py-3 ${darkMode ? 'bg-slate-800' : 'bg-white'} border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlaybackToggle}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            {hasPlayableVideo && (
              <>
                <button
                  onClick={() => seekVideo(-10)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  -10s
                </button>
                <button
                  onClick={() => seekVideo(10)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  +10s
                </button>
              </>
            )}
            <div className="w-64">
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {Math.round(progress)}%
            </span>
            {hasPlayableVideo && (
              <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {formatTime(watchedTime)} / {formatTime(videoDuration)} · left {formatTime(remainingTime)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {hasPlayableVideo && (
              <button
                onClick={() => setIsMuted((muted) => !muted)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {isMuted ? 'Unmute' : 'Sound On'}
              </button>
            )}
            {progress >= 100 && (
              <span className="flex items-center gap-2 text-emerald-500">
                <Check className="w-5 h-5" />
                Completed
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getLessonVideoUrl(lesson: MicroLesson): string {
  const directUrl = lesson.contentUrl || '';
  const contentUrl = String(lesson.content || '').match(/\bVideo URL:\s*(https?:\/\/[^\s]+)/i)?.[1] || '';
  const url = directUrl || contentUrl;
  return toAbsoluteAssetUrl(url);
}

function cleanLessonContent(content = ''): string {
  return String(content || '')
    .replace(/\bVideo URL:\s*https?:\/\/\S+/gi, '')
    .replace(/\bVideo Description:\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getByteClipStart(lesson: MicroLesson): number {
  const explicitStart = Number(lesson.videoStartTime || 0);
  if (explicitStart > 0) return explicitStart;
  const order = Math.max(1, Number(lesson.order || 1));
  const durationSeconds = Math.max(1, Number(lesson.duration || 1) * 60);
  return (order - 1) * durationSeconds;
}

function formatTime(seconds = 0): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Flashcard Component
function Flashcard({ card, darkMode, isKnown }: { card: any; darkMode: boolean; isKnown: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={() => setIsFlipped(!isFlipped)}
      className={`w-full max-w-md aspect-[3/2] rounded-2xl cursor-pointer transition-all ${
        isKnown
          ? 'bg-emerald-500/20 border-2 border-emerald-500'
          : darkMode ? 'bg-slate-700' : 'bg-white'
      } shadow-xl flex items-center justify-center p-8`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        className="w-full"
      >
        {!isFlipped ? (
          <div className="text-center">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Term
            </p>
            <h3 className={`text-2xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {card.front}
            </h3>
            <p className={`text-sm mt-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Click to reveal answer
            </p>
          </div>
        ) : (
          <div className="text-center" style={{ transform: 'rotateY(180deg)' }}>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Definition
            </p>
            <h3 className={`text-xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {card.back}
            </h3>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
