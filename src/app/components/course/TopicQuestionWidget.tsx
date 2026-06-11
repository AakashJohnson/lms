import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, HelpCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface LessonQuestion {
  _id?: string;
  id?: string;
  question: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  position: 'start' | 'middle' | 'end';
  timestamp?: number;
}

interface TopicQuestionWidgetProps {
  questions: LessonQuestion[];
  lessonType: string;
  userRole: 'admin' | 'trainer' | 'participant';
  onAnswerSubmit?: (questionId: string, answer: string) => Promise<{ isCorrect: boolean | null; correctAnswer: string; explanation: string }>;
}

export function TopicQuestionWidget({ questions, lessonType, userRole, onAnswerSubmit }: TopicQuestionWidgetProps) {
  const [answers, setAnswers] = useState<Record<string, { answered: boolean; isCorrect: boolean | null; correctAnswer: string; explanation: string }>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Filter questions based on position - show "end" position by default, and "start" at beginning
  const displayQuestions = questions.filter(q => q.position === 'end' || q.position === 'start');

  if (displayQuestions.length === 0) {
    return null;
  }

  const handleSubmitAnswer = async (questionId: string, q: LessonQuestion) => {
    let answer = selectedAnswers[questionId];

    // For short answer, use the text input
    if (q.questionType === 'short-answer') {
      answer = selectedAnswers[questionId] || '';
      if (!answer.trim()) {
        toast.error('Please enter your answer');
        return;
      }
    } else if (!answer) {
      toast.error('Please select an answer');
      return;
    }

    setSubmitting(questionId);
    try {
      let result;
      if (onAnswerSubmit) {
        result = await onAnswerSubmit(questionId, answer);
      } else {
        // Offline check - compare with stored correct answer
        let isCorrect: boolean | null = false;
        let correctAnswer = '';

        if (q.questionType === 'multiple-choice' && q.options) {
          // Check if any option is marked as correct
          const hasCorrectOption = q.options.some(opt => opt.isCorrect === true);
          if (!hasCorrectOption) {
            // No correct answer set by trainer - mark as pending review
            isCorrect = null;
            correctAnswer = 'Answer not configured by instructor';
          } else {
            const selectedOption = q.options.find(opt => opt._id?.toString() === answer || opt.text === answer);
            isCorrect = selectedOption?.isCorrect || false;
            correctAnswer = q.options.find(opt => opt.isCorrect)?.text || '';
          }
        } else if (q.questionType === 'true-false') {
          if (!q.correctAnswer) {
            isCorrect = null;
            correctAnswer = 'Answer not configured by instructor';
          } else {
            isCorrect = answer.toLowerCase() === (q.correctAnswer || '').toLowerCase();
            correctAnswer = q.correctAnswer || '';
          }
        } else {
          // Short answer - needs manual review if no correct answer set
          if (!q.correctAnswer?.trim()) {
            isCorrect = null;
            correctAnswer = 'Answer not configured by instructor';
          } else {
            isCorrect = null; // Short answers always need manual review
            correctAnswer = q.correctAnswer || '';
          }
        }

        result = { isCorrect, correctAnswer, explanation: q.explanation || '' };
      }

      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          answered: true,
          isCorrect: result.isCorrect,
          correctAnswer: result.correctAnswer,
          explanation: result.explanation
        }
      }));

      if (result.isCorrect === true) {
        toast.success('Correct answer!');
      } else if (result.isCorrect === false) {
        toast.error('Incorrect answer');
      }
    } catch (error) {
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">Knowledge Check</h3>
        <span className="text-sm text-gray-500">({displayQuestions.length} questions)</span>
      </div>

      <div className="space-y-6">
        {displayQuestions.map((question, index) => {
          const answerState = answers[question.id || `q-${index}`];
          const selectedAnswer = selectedAnswers[question.id || `q-${index}`];
          const questionId = question.id || `q-${index}`;

          return (
            <div key={questionId} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                  {index + 1}
                </span>
                <p className="font-medium text-gray-800">{question.question}</p>
              </div>

              {question.questionType === 'multiple-choice' && question.options && (
                <div className="ml-9 space-y-2">
                  {question.options.map((option, optIndex) => {
                    const isSelected = selectedAnswer === option.text || selectedAnswer === String(optIndex);
                    const isCorrect = answerState?.answered && option.isCorrect;
                    const isWrong = answerState?.answered && isSelected && !option.isCorrect;

                    return (
                      <button
                        key={optIndex}
                        onClick={() => !answerState?.answered && setSelectedAnswers(prev => ({ ...prev, [questionId]: option.text }))}
                        disabled={answerState?.answered}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          answerState?.answered
                            ? isCorrect
                              ? 'border-green-300 bg-green-50'
                              : isWrong
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200'
                            : isSelected
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </span>
                        <span className={`text-sm ${answerState?.answered ? (isCorrect ? 'text-green-700' : isWrong ? 'text-red-700' : 'text-gray-700') : 'text-gray-700'}`}>
                          {option.text}
                        </span>
                        {answerState?.answered && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                        {answerState?.answered && isWrong && (
                          <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {question.questionType === 'true-false' && (
                <div className="ml-9 flex gap-3">
                  {['True', 'False'].map((option) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = answerState?.answered && question.correctAnswer === option;
                    const isWrong = answerState?.answered && isSelected && question.correctAnswer !== option;

                    return (
                      <button
                        key={option}
                        onClick={() => !answerState?.answered && setSelectedAnswers(prev => ({ ...prev, [questionId]: option }))}
                        disabled={answerState?.answered}
                        className={`px-6 py-2 rounded-lg border font-medium transition-all ${
                          answerState?.answered
                            ? isCorrect
                              ? 'border-green-300 bg-green-50 text-green-700'
                              : isWrong
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-gray-200 text-gray-600'
                            : isSelected
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}

              {question.questionType === 'short-answer' && (
                <div className="ml-9">
                  <textarea
                    value={selectedAnswer || ''}
                    onChange={(e) => setSelectedAnswers(prev => ({ ...prev, [questionId]: e.target.value }))}
                    placeholder="Type your answer here..."
                    disabled={answerState?.answered}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="ml-9 mt-3">
                {!answerState?.answered ? (
                  <button
                    onClick={() => handleSubmitAnswer(questionId, question)}
                    disabled={submitting === questionId || (!selectedAnswers[questionId] && question.questionType !== 'short-answer')}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting === questionId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Submit Answer'
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {answerState.explanation && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                        <strong>Explanation:</strong> {answerState.explanation}
                      </div>
                    )}
                    <div className={`flex items-center gap-2 text-sm ${answerState.isCorrect === true ? 'text-green-600' : answerState.isCorrect === false ? 'text-red-600' : 'text-yellow-600'}`}>
                      {answerState.isCorrect === true ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct!</span>
                        </>
                      ) : answerState.isCorrect === false ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Incorrect. The correct answer is: {answerState.correctAnswer}</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle className="w-4 h-4" />
                          <span>Answer submitted for review</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const formatSecondsToMMSS = (seconds: number): string => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '';
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const parseMMSSToSeconds = (str: string): number => {
  const clean = String(str || '').trim();
  if (!clean) return 0;
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  const parts = clean.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return 0;
};

// Question Editor for Trainers - used in CreateCourse
interface QuestionEditorProps {
  questions: LessonQuestion[];
  onUpdate: (questions: LessonQuestion[]) => void;
}

export function QuestionEditor({ questions, onUpdate }: QuestionEditorProps) {
  const addQuestion = () => {
    onUpdate([
      ...questions,
      {
        question: '',
        questionType: 'multiple-choice',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        explanation: '',
        position: 'end',
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<LessonQuestion>) => {
    const updated = questions.map((q, i) => (i === index ? { ...q, ...updates } : q));
    onUpdate(updated);
  };

  const removeQuestion = (index: number) => {
    onUpdate(questions.filter((_, i) => i !== index));
  };

  const addOption = (qIndex: number) => {
    const updated = questions.map((q, i) => {
      if (i === qIndex) {
        return { ...q, options: [...(q.options || []), { text: '', isCorrect: false }] };
      }
      return q;
    });
    onUpdate(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const updated = questions.map((q, i) => {
      if (i === qIndex && q.options) {
        const newOptions = q.options.map((o, oi) => (oi === oIndex ? { ...o, text } : o));
        return { ...q, options: newOptions };
      }
      return q;
    });
    onUpdate(updated);
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const updated = questions.map((q, i) => {
      if (i === qIndex && q.options) {
        const newOptions = q.options.map((o, oi) => ({ ...o, isCorrect: oi === oIndex }));
        return { ...q, options: newOptions };
      }
      return q;
    });
    onUpdate(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = questions.map((q, i) => {
      if (i === qIndex && q.options && q.options.length > 2) {
        return { ...q, options: q.options.filter((_, oi) => oi !== oIndex) };
      }
      return q;
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={qi} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2 mb-3">
            <span className="text-xs font-medium text-gray-500 mt-2">Q{qi + 1}</span>
            <textarea
              value={q.question}
              onChange={(e) => updateQuestion(qi, { question: e.target.value })}
              placeholder="Enter your question..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
            <button onClick={() => removeQuestion(qi)} className="text-gray-400 hover:text-red-500 mt-2">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Question Type & Position */}
          <div className="flex gap-2 mb-3 ml-8">
            <select
              value={q.questionType}
              onChange={(e) => updateQuestion(qi, { questionType: e.target.value as any })}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="short-answer">Short Answer</option>
            </select>

            <select
              value={q.position}
              onChange={(e) => {
                const nextPos = e.target.value as 'start' | 'middle' | 'end';
                updateQuestion(qi, {
                  position: nextPos,
                  timestamp: nextPos === 'start' ? 0 : nextPos === 'end' ? 30 : (typeof q.timestamp === 'number' ? q.timestamp : 30)
                });
              }}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg"
            >
              <option value="start">At Start</option>
              <option value="middle">In Between</option>
              <option value="end">At End</option>
            </select>

            {q.position === 'middle' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={q.timestamp !== undefined ? formatSecondsToMMSS(q.timestamp) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const secs = parseMMSSToSeconds(val);
                    updateQuestion(qi, { timestamp: secs });
                  }}
                  placeholder="MM:SS"
                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg w-20 font-mono text-center"
                  title="Format: MM:SS or seconds"
                />
                {typeof q.timestamp === 'number' && q.timestamp > 0 && (
                  <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                    ({q.timestamp}s)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Options for Multiple Choice */}
          {q.questionType === 'multiple-choice' && q.options && (
            <div className="ml-8 space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    onClick={() => setCorrectOption(qi, oi)}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}
                  >
                    {opt.isCorrect && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs"
                  />
                  {q.options.length > 2 && (
                    <button onClick={() => removeOption(qi, oi)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addOption(qi)} className="text-xs text-indigo-600 hover:underline">
                + Add Option
              </button>
            </div>
          )}

          {/* True/False */}
          {q.questionType === 'true-false' && (
            <div className="ml-8 flex gap-2">
              <button
                onClick={() => updateQuestion(qi, { correctAnswer: 'True' })}
                className={`px-3 py-1 rounded text-xs border ${
                  q.correctAnswer === 'True' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'
                }`}
              >
                True
              </button>
              <button
                onClick={() => updateQuestion(qi, { correctAnswer: 'False' })}
                className={`px-3 py-1 rounded text-xs border ${
                  q.correctAnswer === 'False' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'
                }`}
              >
                False
              </button>
            </div>
          )}

          {/* Short Answer */}
          {q.questionType === 'short-answer' && (
            <div className="ml-8">
              <input
                type="text"
                value={q.correctAnswer || ''}
                onChange={(e) => updateQuestion(qi, { correctAnswer: e.target.value })}
                placeholder="Correct answer"
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
              />
            </div>
          )}

          {/* Explanation */}
          <div className="ml-8 mt-2">
            <input
              type="text"
              value={q.explanation || ''}
              onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
              placeholder="Explanation (optional)"
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
            />
          </div>
        </div>
      ))}

      <button
        onClick={addQuestion}
        className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
      >
        + Add Question
      </button>

      {questions.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          No questions yet. Add questions to test student understanding.
        </p>
      )}
    </div>
  );
}

// In-Video Question Overlay - Shows questions at specific timestamps during video playback
interface InVideoQuestionOverlayProps {
  questions: LessonQuestion[];
  currentTime: number;
  videoDuration?: number;
  onAnswer: (questionId: string, answer: string) => void;
  onPause?: () => void;
  onPlay?: () => void;
}

export function InVideoQuestionOverlay({ questions, currentTime, videoDuration = 0, onAnswer, onPause, onPlay }: InVideoQuestionOverlayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [answered, setAnswered] = useState(false);
  const [dismissedQuestionIds, setDismissedQuestionIds] = useState<Set<string>>(new Set());
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());

  const questionTypeLabel: Record<LessonQuestion['questionType'], string> = {
    'multiple-choice': 'Choose one',
    'true-false': 'True or False',
    'short-answer': 'Type your answer',
  };

  const keyedQuestions = useMemo(
    () =>
      questions.map((q, index) => ({
        ...q,
        __key: q._id || q.id || `${q.position || 'end'}-${q.timestamp ?? 'na'}-${index}`,
      })),
    [questions]
  );

  const isQuestionActiveNow = (q: LessonQuestion & { __key: string }) => {
    const position = q.position || 'end';
    const ts = typeof q.timestamp === 'number' ? q.timestamp : Number(q.timestamp ?? NaN);
    const safeTimestamp = Number.isFinite(ts) ? ts : position === 'start' ? 0 : 30;

    if (position === 'start') {
      const startSec = (safeTimestamp >= 0 && safeTimestamp < 120) ? safeTimestamp : 0;
      return currentTime >= startSec && currentTime < startSec + 10;
    }

    if (position === 'middle') {
      return currentTime >= safeTimestamp && currentTime < safeTimestamp + 30;
    }

    if (position === 'end') {
      // If safeTimestamp is a small offset (e.g. 30), or 0, treat it as offset from the end.
      const offset = (safeTimestamp > 0 && safeTimestamp < 120) ? safeTimestamp : 30;
      const effectiveEndTimestamp = videoDuration > 0
        ? (videoDuration > offset ? videoDuration - offset : videoDuration * 0.8)
        : null;
      if (effectiveEndTimestamp === null) return false;
      return currentTime >= effectiveEndTimestamp && currentTime < effectiveEndTimestamp + 30;
    }

    return false;
  };

  const activeQuestions = keyedQuestions.filter(
    (q) =>
      isQuestionActiveNow(q) &&
      !dismissedQuestionIds.has(q.__key) &&
      !completedQuestionIds.has(q.__key)
  );

  const question = activeQuestions[0] || null;
  const questionId = question?.__key || '';

  const answerOutcome = useMemo(() => {
    if (!question || !answered) return null;

    let correctAnswerText = '';
    let hasCorrectAnswer = false;

    if (question.questionType === 'multiple-choice' || question.questionType === 'true-false') {
      const correctOpt = question.options?.find((opt: any) => opt.isCorrect === true);
      correctAnswerText = correctOpt?.text || question.correctAnswer || '';
      hasCorrectAnswer = !!correctOpt || !!question.correctAnswer;
    } else {
      correctAnswerText = question.correctAnswer || '';
      hasCorrectAnswer = !!question.correctAnswer?.trim();
    }

    return {
      correctAnswerText,
      hasCorrectAnswer,
      isCorrect: hasCorrectAnswer ? selectedAnswer.toLowerCase() === correctAnswerText.toLowerCase() : null,
    };
  }, [answered, question, selectedAnswer]);

  useEffect(() => {
    setSelectedAnswer('');
    setAnswered(false);
  }, [questionId]);

  useEffect(() => {
    if (question && !answered) {
      onPause?.();
      document.querySelectorAll('video').forEach((video) => {
        video.pause();
      });
    }
  }, [question, answered, onPause]);

  const handleSubmit = () => {
    if (!selectedAnswer || !questionId) return;
    onAnswer(questionId, selectedAnswer);
    setAnswered(true);
    // Don't auto dismiss - let user see the correct answer and explanation
  };

  const handleDismiss = () => {
    if (questionId) {
      setDismissedQuestionIds((prev) => {
        const next = new Set(prev);
        next.add(questionId);
        return next;
      });
      if (answered) {
        setCompletedQuestionIds((prev) => {
          const next = new Set(prev);
          next.add(questionId);
          return next;
        });
      }
    }
    onPlay?.();
  };

  if (!question) return null;

  const shellClassName = 'relative w-full max-w-[40rem] overflow-hidden rounded-[1.75rem] border border-white/60 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)] ring-1 ring-black/5';
  const headerTone = answered
    ? answerOutcome?.isCorrect === true
      ? 'from-emerald-500 via-green-500 to-teal-500'
      : answerOutcome?.isCorrect === false
        ? 'from-rose-500 via-red-500 to-orange-500'
        : 'from-amber-500 via-yellow-500 to-orange-500'
    : 'from-indigo-600 via-violet-600 to-fuchsia-600';

  if (answered) {
    const correctAnswerText = answerOutcome?.correctAnswerText || '';
    const isCorrect = answerOutcome?.isCorrect ?? null;

    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <div className={shellClassName}>
          <div className={`h-2 w-full bg-gradient-to-r ${headerTone}`} />
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${headerTone} flex items-center justify-center shadow-lg shrink-0`}>
                  {isCorrect === true ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : isCorrect === false ? (
                    <XCircle className="w-6 h-6 text-white" />
                  ) : (
                    <HelpCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {questionTypeLabel[question.questionType]}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      isCorrect === true
                        ? 'bg-emerald-100 text-emerald-700'
                        : isCorrect === false
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isCorrect === true ? 'Correct' : isCorrect === false ? 'Review' : 'Submitted'}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 leading-tight">{isCorrect === true ? 'Nice work' : isCorrect === false ? 'Not quite' : 'Answer submitted'}</p>
                  <p className="mt-1 text-sm text-slate-500">{question.question}</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                title="Close"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Your answer</p>
                  <p className="text-sm font-medium text-slate-900 break-words">{selectedAnswer}</p>
                </div>
                <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${isCorrect === true ? 'bg-emerald-100 text-emerald-700' : isCorrect === false ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isCorrect === true ? 'Correct' : isCorrect === false ? 'Incorrect' : 'Needs review'}
                </div>
              </div>

              {isCorrect === false && correctAnswerText && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Correct answer</p>
                  <p className="text-sm font-medium text-emerald-900">{correctAnswerText}</p>
                </div>
              )}

              {isCorrect === null && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800">Correct answer not configured by instructor.</p>
                </div>
              )}
            </div>

            {question.explanation && (
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">Explanation</p>
                <p className="text-sm leading-6 text-slate-700">{question.explanation}</p>
              </div>
            )}

            <button
              onClick={handleDismiss}
              className={`w-full rounded-2xl bg-gradient-to-r ${headerTone} px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-[1.01] active:scale-[0.99]`}
            >
              Continue Watching
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className={shellClassName}>
        <div className={`h-2 w-full bg-gradient-to-r ${headerTone}`} />
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${headerTone} flex items-center justify-center shadow-lg shrink-0`}>
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Quick Check
                  </span>
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                    {questionTypeLabel[question.questionType]}
                  </span>
                </div>
                <p className="text-xl font-bold text-slate-900 leading-tight">Answer this to continue</p>
                <p className="mt-1 text-sm text-slate-500">{question.question}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              title="Close"
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-5">
            {question.questionType === 'multiple-choice' && question.options && (
              <div className="space-y-3">
                {question.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedAnswer(opt.text)}
                    className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                      selectedAnswer === opt.text
                        ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100/60 shadow-lg shadow-indigo-500/10'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                        selectedAnswer === opt.text ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-500 group-hover:border-indigo-300'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold leading-6 text-slate-800">{opt.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {question.questionType === 'true-false' && (
              <div className="grid grid-cols-2 gap-3">
                {['True', 'False'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelectedAnswer(opt)}
                    className={`rounded-2xl border px-5 py-4 text-sm font-semibold transition-all duration-200 ${
                      selectedAnswer === opt
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-100/60 shadow-lg shadow-indigo-500/10'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {question.questionType === 'short-answer' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your response</label>
                <textarea
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopicQuestionWidget;
