import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Loader2, MessageSquareText, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  AiLessonQuestion as AiLessonQuestionRecord,
  askLessonQuestion,
  getLessonQuestionHistory,
} from '../../services/aiLessonQuestionService';

interface AiLessonQuestionProps {
  courseId: string;
  sectionId: string;
  lessonId: string;
  currentTimestamp?: number;
}

const formatDate = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const contextLabels: Array<[keyof NonNullable<AiLessonQuestionRecord['contextAvailability']>, string]> = [
  ['transcript', 'Transcript'],
  ['summary', 'Summary'],
  ['flashcards', 'Flashcards'],
  ['questionAnswers', 'Q&A'],
  ['resources', 'Resources'],
  ['knowledgeChecks', 'Knowledge Checks'],
];

const defaultAvailability = {
  transcript: true,
  summary: true,
  flashcards: true,
  questionAnswers: true,
  resources: true,
  knowledgeChecks: true,
};

export function AiLessonQuestion({ courseId, sectionId, lessonId, currentTimestamp }: AiLessonQuestionProps) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<AiLessonQuestionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const latestAvailability = history[0]?.contextAvailability;

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getLessonQuestionHistory(courseId, sectionId, lessonId);
      if (res.success) {
        const latestFirst = [...(res.data || [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setHistory(latestFirst);
      }
    } catch {
      toast.error('Failed to load AI question history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sectionId, lessonId]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      toast.error('Please enter your question');
      return;
    }

    setSubmitting(true);
    try {
      const res = await askLessonQuestion({
        courseId,
        sectionId,
        lessonId,
        question: trimmed,
        language: 'auto',
        currentTimestamp: currentTimestamp ?? null,
      });
      if (res.success && res.data) {
        setHistory((items) => [res.data, ...items]);
        setQuestion('');
        toast.success('AI answer generated');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate AI answer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ask AI</h3>
              <p className="text-xs leading-5 text-gray-500">
                AI uses this lesson's transcript, summary, flashcards, questions, and uploaded resources to answer.
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 sm:flex">
            <Sparkles className="h-3.5 w-3.5" />
            Lesson-context aware
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
          <label htmlFor="lesson-ai-question" className="mb-2 block text-sm font-semibold text-gray-900">
            Your question
          </label>
          <textarea
            id="lesson-ai-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask anything about this lesson..."
            maxLength={1200}
            rows={4}
            className="w-full resize-none rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">{question.length}/1200 characters</p>
            <button
              type="button"
              onClick={handleAsk}
              disabled={submitting || !question.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="mb-2 font-semibold">Lesson context AI checks</p>
          <div className="flex flex-wrap gap-2">
            {contextLabels.map(([key, label]) => {
              const known = latestAvailability && key in latestAvailability;
              const available = known ? Boolean(latestAvailability[key]) : true;
              return (
              <span
                key={label}
                className={`inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ${
                  known && !available ? 'text-slate-500 ring-slate-200' : 'text-emerald-700 ring-emerald-100'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {label}{known ? (available ? ' available' : ' missing') : ''}
              </span>
              );
            })}
          </div>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-gray-500">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-600" />
            <p className="text-sm">Loading AI answers...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-800">No AI questions yet</p>
            <p className="mt-1 text-xs text-gray-500">Ask a question to get an instant lesson-aware answer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item._id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-indigo-600">Question</p>
                  <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-sm font-semibold leading-6 text-gray-900">{item.question}</p>
                <div className="mt-4 rounded-xl bg-gray-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">AI Answer</p>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{item.answer}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {contextLabels.map(([key, label]) => {
                    const availability = item.contextAvailability || defaultAvailability;
                    const available = Boolean(availability[key]);
                    return (
                      <span
                        key={key}
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {label} {available ? 'used' : 'missing'}
                      </span>
                    );
                  })}
                  {item.usedGlobalKnowledge && (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
                      Global knowledge allowed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
