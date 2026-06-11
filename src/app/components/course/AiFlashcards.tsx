import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Zap, BadgeCheck } from 'lucide-react';
import {
  FlashcardDeck,
  FlashcardDifficulty,
  FlashcardRating,
  generateFlashcards,
  getLatestFlashcardDeck,
  reviewFlashcard,
} from '../../services/aiFlashcardService';
import type { AiLessonNoteMode } from '../../services/aiFlashcardService';

export interface AiFlashcardsProps {
  courseId: string;
  sectionId: string;
  lessonId: string;
}

const difficultyLabel = (d: FlashcardDifficulty) => {
  if (d === 'easy') return { bg: 'bg-green-100 text-green-800', text: 'Easy' };
  if (d === 'hard') return { bg: 'bg-red-100 text-red-800', text: 'Hard' };
  return { bg: 'bg-amber-100 text-amber-800', text: 'Medium' };
};

const isDue = (dueAtIso: string | undefined) => {
  if (!dueAtIso) return true;
  const dueAt = new Date(dueAtIso).getTime();
  return dueAt <= Date.now();
};

const formatDue = (dueAtIso: string | undefined) => {
  if (!dueAtIso) return 'Now';
  const d = new Date(dueAtIso);
  const diff = d.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  if (minutes <= 0) return 'Due now';
  if (minutes < 60) return `Due in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `Due in ${hours}h`;
};

export function AiFlashcards({ courseId, sectionId, lessonId }: AiFlashcardsProps) {
  const [mode, setMode] = useState<AiLessonNoteMode>('short');
  const [loading, setLoading] = useState(false);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);

  const didAutoGenerate = useRef(false);

  const queue = useMemo(() => {
    if (!deck?.cards?.length) return [];
    // Prefer due cards; if none due, show soonest.
    const dueCards = deck.cards.filter((c) => isDue(c.srs?.dueAt));
    if (dueCards.length) return dueCards;
    const soonest = [...deck.cards].sort((a, b) => new Date(a.srs?.dueAt || 0).getTime() - new Date(b.srs?.dueAt || 0).getTime())[0];
    return soonest ? [soonest] : [];
  }, [deck]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setActiveIdx(0);
    setFlipped(false);
  }, [lessonId, sectionId, courseId]);

  const loadDeck = async () => {
    setLoadingDeck(true);
    try {
      const res = await getLatestFlashcardDeck(courseId, sectionId, lessonId);
      if (res.success) setDeck(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load flashcards');
    } finally {
      setLoadingDeck(false);
    }
  };

  useEffect(() => {
    didAutoGenerate.current = false;
    loadDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sectionId, lessonId]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateFlashcards({ courseId, sectionId, lessonId, mode });
      if (res.success) {
        setDeck(res.data);
        toast.success('Flashcards generated');
        didAutoGenerate.current = true;
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate once per lesson if no deck exists.
    if (!loadingDeck && !didAutoGenerate.current && !deck) {
      didAutoGenerate.current = true;
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDeck, deck]);

  const dueCount = useMemo(() => deck?.cards?.filter((c) => isDue(c.srs?.dueAt)).length || 0, [deck]);

  const activeCard = queue[activeIdx];

  const canPrev = activeIdx > 0;
  const canNext = activeIdx < queue.length - 1;

  const swipeState = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);

  const handlePrev = () => {
    if (!canPrev) return;
    setActiveIdx((i) => Math.max(0, i - 1));
    setFlipped(false);
  };

  const handleNext = () => {
    if (!canNext) return;
    setActiveIdx((i) => Math.min(queue.length - 1, i + 1));
    setFlipped(false);
  };

  const review = async (rating: FlashcardRating) => {
    if (!deck || !activeCard) return;
    setLoading(true);
    try {
      const res = await reviewFlashcard({ deckId: deck._id, cardId: activeCard._id, rating });
      if (res.success) setDeck(res.data);
      // After review, move forward if possible.
      setFlipped(false);
      setActiveIdx((idx) => Math.min(idx + 1, Math.max(0, queue.length - 1)));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Flashcards</h3>
              <p className="text-xs text-gray-500">Flip, review, and track progress with spaced repetition</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-medium"
              title="Regenerate flashcards from this lesson"
            >
              <RotateCcw className="w-4 h-4" /> Regenerate
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="text-xs text-gray-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            Due now: <span className="font-bold text-indigo-700">{dueCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 border border-indigo-100 rounded-xl p-1">
            <button
              onClick={() => setMode('short')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'short' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Short
            </button>
            <button
              onClick={() => setMode('detailed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode === 'detailed' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loadingDeck ? (
          <div className="py-10 text-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p>Loading flashcards...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <p className="text-sm font-semibold text-gray-800 mb-1">No flashcards found</p>
            <p className="text-xs text-gray-500 mb-4">Generate flashcards from this lesson content.</p>
            <button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
              Generate Flashcards
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Card <span className="font-bold text-gray-700">{activeIdx + 1}</span> / <span className="font-bold text-gray-700">{queue.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {activeCard ? formatDue(activeCard.srs?.dueAt) : ''}
                </span>
              </div>
            </div>

            {/* Swipe + Flip card */}
            <div
              className="relative"
              onPointerDown={(e) => {
                swipeState.current = { startX: e.clientX, startY: e.clientY, dragging: true };
              }}
              onPointerUp={(e) => {
                const st = swipeState.current;
                swipeState.current = null;
                if (!st?.dragging) return;
                const dx = e.clientX - st.startX;
                const dy = e.clientY - st.startY;
                if (Math.abs(dx) < 60) return;
                if (Math.abs(dy) > 60) return;
                if (dx < 0) handleNext();
                else handlePrev();
              }}
            >
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="w-full text-left"
                aria-label="Flip flashcard"
              >
                <div className="relative h-56 md:h-64">
                  <div
                    className={`absolute inset-0 rounded-2xl border border-gray-200 shadow-sm transition-transform duration-500 [transform-style:preserve-3d] ${
                      flipped ? '[transform:rotateY(180deg)]' : ''
                    }`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl bg-indigo-50 p-5 flex flex-col justify-between border border-indigo-100 [transform:rotateY(0deg)]">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          {activeCard && (
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${difficultyLabel(activeCard.difficulty).bg}`}>
                              {difficultyLabel(activeCard.difficulty).text}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">Tap to flip</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 whitespace-pre-wrap">{activeCard?.front}</p>
                      </div>
                      <p className="text-xs text-gray-600">Swipe left/right for next/previous</p>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl bg-white p-5 flex flex-col justify-between border border-gray-200 [transform:rotateY(180deg)]">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <BadgeCheck className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-indigo-700">Answer</span>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{activeCard?.back}</p>
                      </div>
                      <p className="text-xs text-gray-500">Choose difficulty to schedule</p>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Review buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {flipped ? (
                <>
                  <button
                    disabled={loading}
                    onClick={() => review('again')}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    Again
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => review('hard')}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
                  >
                    Hard
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => review('good')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Good
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => review('easy')}
                    className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    Easy
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setFlipped(true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Reveal Answer
                </button>
              )}
            </div>

            {/* Progress summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-gray-600">
                  Total cards: <span className="font-bold text-gray-800">{deck?.cards?.length || 0}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Mastered (heuristic):{' '}
                  <span className="font-bold text-gray-800">
                    {(deck?.cards || []).filter((c) => (c.srs?.repetitions || 0) >= 4 && (c.srs?.intervalDays || 0) >= 7).length}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Spaced repetition keeps scheduling cards based on your feedback.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

