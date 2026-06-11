import { generateAiLessonNotesAI, generateAiLessonNotesHeuristic } from './aiNotesGenerator.js';
import { parseJsonResponse, selectModel } from '../services/ai.service.js';

const truncate = (s, max) => {
  const str = String(s || '').trim();
  if (str.length <= max) return str;
  return `${str.slice(0, Math.max(0, max - 3))}...`;
};

const buildCardsFromAiNotes = ({ aiNotes, mode }) => {
  const keyTakeaways = aiNotes?.keyTakeaways || [];
  const keywords = (aiNotes?.mindMap?.branches || [])
    .flatMap((b) => b.items || [])
    .slice(0, mode === 'detailed' ? 12 : 8);

  const takeaways = (keyTakeaways || []).slice(0, mode === 'detailed' ? 14 : 10);

  const cards = [];

  const cardCount = mode === 'detailed' ? 18 : 12;
  for (let i = 0; i < Math.min(cardCount, Math.max(keywords.length, takeaways.length)); i++) {
    const kw = keywords[i] || `concept-${i + 1}`;
    const take = takeaways[i] || keyTakeaways[i % Math.max(1, keyTakeaways.length)] || '';

    const front = i < 4
      ? `Explain: ${kw}`
      : `Why does ${kw} matter in this lesson?`;

    const back = take
      ? take
      : `Focus on the definition and how ${kw} is used/applied in this lesson.`;

    const difficulty = i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard';

    cards.push({
      front: truncate(front, 180),
      back: truncate(back, 1200),
      difficulty,
    });
  }

  // Ensure at least some cards exist
  if (cards.length === 0) {
    cards.push({
      front: 'What is the main idea of this lesson?',
      back: 'Re-read the lesson content and write 3 key points from memory.',
      difficulty: 'medium',
    });
  }

  return cards;
};

export const generateAiFlashcardsHeuristicFromLesson = async ({ lessonTitle, lesson, mode }) => {
  const lessonText = [lesson.content, Array.isArray(lesson.questions) ? lesson.questions.map((q) => q.question).slice(0, 20).join(' ') : '']
    .filter(Boolean)
    .join('\n\n')
    .trim();

  let aiNotes;
  let cards;

  try {
    aiNotes = await generateAiLessonNotesAI({
      lessonTitle: lessonTitle || 'Lesson',
      contentText: lessonText,
      mode,
    });

    const model = selectModel(mode);
    const detailLevel = mode === 'detailed' ? 'Generate 12-18 detailed flashcards.' : 'Generate 8-12 concise flashcards.';

    const flashcardPrompt = `You are a flashcard generator. Based on the following lesson notes, generate flashcards.

Lesson: ${lessonTitle || 'Lesson'}
Key Takeaways: ${(aiNotes.keyTakeaways || []).join(', ')}

${detailLevel}

Each flashcard should have:
- "front": The question/prompt (max 180 chars)
- "back": The answer/description (max 1200 chars)
- "difficulty": "easy", "medium", or "hard"

Return a JSON array of flashcard objects with keys: front, back, difficulty.`;

    const generatedCards = await parseJsonResponse({
      systemPrompt: 'You are a flashcard generator. Return ONLY valid JSON array.',
      userPrompt: flashcardPrompt,
      model,
      temperature: 0.5,
    });

    if (Array.isArray(generatedCards) && generatedCards.length > 0) {
      cards = generatedCards.map(c => ({
        front: truncate(c.front || '', 180),
        back: truncate(c.back || '', 1200),
        difficulty: ['easy', 'medium', 'hard'].includes(c.difficulty) ? c.difficulty : 'medium',
      }));
    } else {
      cards = buildCardsFromAiNotes({ aiNotes, mode });
    }
  } catch (error) {
    console.warn('AI flashcard generation failed, using heuristic fallback:', error.message);
    aiNotes = generateAiLessonNotesHeuristic({
      lessonTitle: lessonTitle || 'Lesson',
      contentText: lessonText,
      mode,
    });
    cards = buildCardsFromAiNotes({ aiNotes, mode });
  }

  return { cards, aiNotes };
};

