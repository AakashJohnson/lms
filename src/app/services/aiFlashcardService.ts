import axiosInstance from '../../utils/axiosConfig';

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';
export type FlashcardDifficulty = 'easy' | 'medium' | 'hard';
export type AiLessonNoteMode = 'short' | 'detailed';

export interface FlashcardSrsState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string; // ISO
  lastReviewedAt?: string | null;
}

export interface Flashcard {
  _id: string;
  front: string;
  back: string;
  difficulty: FlashcardDifficulty;
  srs: FlashcardSrsState;
}

export interface FlashcardDeck {
  _id: string;
  student: string;
  course: string;
  section: string;
  lesson: string;
  cards: Flashcard[];
  createdAt: string;
}

export const generateFlashcards = async (params: {
  courseId: string;
  sectionId: string;
  lessonId: string;
  mode: AiLessonNoteMode;
}) => {
  const res = await axiosInstance.post('/flashcards/generate', {
    courseId: params.courseId,
    sectionId: params.sectionId,
    lessonId: params.lessonId,
    mode: params.mode,
  });
  return res.data as { success: boolean; data: FlashcardDeck };
};

export const getLatestFlashcardDeck = async (courseId: string, sectionId: string, lessonId: string) => {
  const res = await axiosInstance.get(`/flashcards/latest/${courseId}/${sectionId}/${lessonId}`);
  return res.data as { success: boolean; data: FlashcardDeck | null };
};

export const reviewFlashcard = async (params: { deckId: string; cardId: string; rating: FlashcardRating }) => {
  const res = await axiosInstance.post(`/flashcards/${params.deckId}/${params.cardId}/review`, {
    rating: params.rating,
  });
  return res.data as { success: boolean; data: FlashcardDeck };
};

