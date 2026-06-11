import { generateWithPrompt, parseJsonResponse, selectModel } from '../services/ai.service.js';

const DEFAULT_STOPWORDS = new Set([
  'the',
  'and',
  'a',
  'an',
  'to',
  'of',
  'in',
  'for',
  'with',
  'on',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'by',
  'at',
  'or',
  'from',
  'that',
  'this',
  'it',
  'will',
  'can',
  'could',
  'should',
  'may',
  'might',
  'not',
  'but',
  'if',
  'then',
  'than',
  'so',
  'we',
  'you',
  'they',
  'i',
  'your',
  'our',
  'their',
  'them',
  'us',
  'into',
  'about',
  'what',
  'when',
  'where',
  'why',
  'how',
  'who',
  'whom',
  'which',
  'because',
  'also',
  'there',
  'here',
  'over',
  'under',
  'between',
  'within',
  'without',
]);

const stripHtml = (html) => {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const normalizeLectureText = (text) => stripHtml(text)
  .replace(/\[\d{1,2}:\d{2}(?::\d{2})?-\d{1,2}:\d{2}(?::\d{2})?\]/g, ' ')
  .replace(/\b(thank you|thanks|okay|yeah|yes|no)\b[.!?]*/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const splitSentences = (text) => {
  const clean = normalizeLectureText(text);
  if (!clean) return [];
  // Rough sentence splitter (good enough for heuristic notes)
  return clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const words = s.split(/\s+/).filter(Boolean);
      const uniqueWords = new Set(words.map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, '')).filter((word) => word.length > 2));
      return s.length >= 25 && words.length >= 5 && uniqueWords.size >= 4;
    });
};

const extractLectureBody = (text) => {
  const clean = stripHtml(text);
  const markers = ['Video transcript:', 'Lecture content:', 'Lesson content:'];
  for (const marker of markers) {
    const markerIndex = clean.indexOf(marker);
    if (markerIndex !== -1) {
      let body = clean.slice(markerIndex + marker.length).trim();
      for (const nextMarker of ['Topic Questions:', 'Resources:']) {
        const nextIndex = body.indexOf(nextMarker);
        if (nextIndex !== -1) body = body.slice(0, nextIndex).trim();
      }
      return normalizeLectureText(body);
    }
  }
  return normalizeLectureText(clean);
};

const topKeywords = (text, limit = 10) => {
  const clean = extractLectureBody(text).toLowerCase();
  const tokens = clean
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && t.length <= 20);

  const counts = new Map();
  for (const t of tokens) {
    if (DEFAULT_STOPWORDS.has(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
};

const pickSentencesContainingKeywords = (sentences, keywords, max = 6) => {
  const selected = [];
  const used = new Set();

  for (const kw of keywords) {
    const found = sentences.find((s) => s.toLowerCase().includes(kw.toLowerCase()));
    if (found && !used.has(found)) {
      selected.push(found);
      used.add(found);
    }
    if (selected.length >= max) break;
  }
  return selected;
};

const toMindMap = (keywords, lessonTitle) => {
  const buckets = [
    { label: 'Core Concepts', count: 3 },
    { label: 'Key Terms', count: 3 },
    { label: 'How It Works', count: 3 },
    { label: 'Practical Focus', count: 3 },
  ];

  const branches = [];
  let i = 0;
  for (const b of buckets) {
    const items = keywords.slice(i, i + b.count);
    i += b.count;
    if (items.length === 0) continue;
    branches.push({ label: b.label, items });
  }

  return {
    root: lessonTitle || 'Lesson',
    branches: branches.length
      ? branches
      : [
          { label: 'Overview', items: keywords.slice(0, 5) },
          { label: 'Revision', items: keywords.slice(5, 10) },
        ],
  };
};

const generateInterview = (keywords, takeaways, mode) => {
  const num = mode === 'detailed' ? 9 : 6;
  const base = [];

  for (let i = 0; i < Math.min(num, keywords.length); i++) {
    const kw = keywords[i];
    const takeaway = takeaways[i] || '';
    const question = `Explain ${kw} and why it matters in this lesson.`;
    const answer = takeaway
      ? `In this lesson, ${kw} is discussed as follows: ${takeaway}`
      : `${kw} is an important concept covered in the lesson. Focus on its definition, purpose, and how it is applied.`;
    const difficulty = i < 2 ? 'easy' : i < 5 ? 'medium' : 'hard';
    base.push({ question, answer, difficulty });
  }

  // Add a couple of deeper questions if detailed
  if (mode === 'detailed') {
    base.push({
      question: 'What are the common mistakes students make with these concepts, and how can you avoid them?',
      answer:
        'Review the key terms and takeaways, compare them across sections, and practice by answering the revision questions while explaining the “why”.',
      difficulty: 'hard',
    });
  }

  return base.slice(0, num);
};

const generateExamples = (takeaways, mode) => {
  const num = mode === 'detailed' ? 6 : 4;
  const out = [];
  const src = takeaways.filter(Boolean).slice(0, num);
  for (let i = 0; i < Math.min(num, src.length); i++) {
    out.push(`Example ${i + 1}: Apply the idea of “${src[i]}” to a real lesson scenario—identify the goal, outline steps, and check the outcome.`);
  }
  if (out.length === 0) {
    out.push('Example: Choose one concept from the lesson and explain it in your own words, then give a simple scenario where it is used.');
  }
  return out;
};

const generateRevision = (takeaways, keywords, mode) => {
  const quick = mode === 'detailed' ? 10 : 6;
  const bullets = [];

  const pick = takeaways.length ? takeaways : keywords;
  for (let i = 0; i < Math.min(quick, pick.length); i++) {
    const item = pick[i];
    bullets.push(`• ${item}`);
  }

  const questions = [];
  const qCount = mode === 'detailed' ? 8 : 5;
  for (let i = 0; i < Math.min(qCount, keywords.length); i++) {
    const kw = keywords[i];
    questions.push(`- How would you teach ${kw} to a beginner?`);
  }

  return [
    'Revision Checklist',
    '',
    '1) Re-read the summary and key takeaways.',
    '2) Review the mind map categories and connect concepts.',
    '3) Answer the quick questions without looking, then correct yourself.',
    '',
    'Key Points',
    bullets.join('\n'),
    '',
    'Quick Questions',
    questions.join('\n'),
  ].join('\n');
};

export const generateAiLessonNotesAI = async ({ lessonTitle, contentText, mode = 'short' }) => {
  const model = selectModel(mode);
  const detailLevel = mode === 'detailed' ? 'Provide comprehensive, detailed content with thorough explanations.' : 'Provide concise, focused content.';

  const systemPrompt = `You are an expert educational content generator. Create structured lesson notes from the provided lesson content. Your output must be valid JSON.`;

  const userPrompt = `${detailLevel}

Lesson Title: ${lessonTitle || 'Untitled Lesson'}

Lesson Content:
${contentText}

Generate lesson notes with the following structure:
1. summary: A 2-4 sentence overview of the lesson
2. keyTakeaways: Array of 5-8 key learning points (for detailed) or 4-5 (for short)
3. mindMap: Object with "root" (lesson title) and "branches" (array of 4 categories with "label" and "items" arrays)
4. interviewQuestions: Array of 5-8 objects with "question", "answer", and "difficulty" (easy/medium/hard)
5. examples: Array of 3-6 practical examples or application scenarios
6. revisionMaterial: A structured revision checklist with key points and practice questions

Return ONLY valid JSON, no additional text.`;

  try {
    const result = await parseJsonResponse({ systemPrompt, userPrompt, model, temperature: 0.5 });
    return {
      summary: result.summary || '',
      keyTakeaways: result.keyTakeaways || [],
      mindMap: result.mindMap || { root: lessonTitle || 'Lesson', branches: [] },
      interviewQuestions: result.interviewQuestions || [],
      examples: result.examples || [],
      revisionMaterial: result.revisionMaterial || '',
    };
  } catch (error) {
    console.error('AI generation failed, falling back to heuristic:', error.message);
    return generateAiLessonNotesHeuristic({ lessonTitle, contentText, mode });
  }
};

export const generateAiLessonNotesHeuristic = ({ lessonTitle, contentText, mode = 'short' }) => {
  const lectureText = extractLectureBody(contentText);
  const sentences = splitSentences(lectureText);
  const keywords = topKeywords(lectureText, mode === 'detailed' ? 12 : 8);

  const summarySentenceCount = mode === 'detailed' ? 6 : 3;
  const summarySentences = sentences.slice(0, summarySentenceCount);
  const summary =
    summarySentences.length > 0
      ? summarySentences.join(' ')
      : 'No lecture transcript was available to generate video AI notes. Please add the lecture transcript or detailed lecture notes and regenerate.';

  const keyTakeawaysSentences = pickSentencesContainingKeywords(
    sentences,
    keywords,
    mode === 'detailed' ? 8 : 5,
  );

  const keyTakeaways =
    keyTakeawaysSentences.length > 0
      ? keyTakeawaysSentences.map((s) => s.length > 180 ? `${s.slice(0, 177)}...` : s)
      : keywords.length
        ? keywords.map((k) => `Understand “${k}” and how it connects to the rest of the lesson.`).slice(0, mode === 'detailed' ? 7 : 5)
        : [];

  const mindMap = toMindMap(keywords, lessonTitle);
  const interviewQuestions = generateInterview(keywords, keyTakeaways, mode);
  const examples = generateExamples(keyTakeaways, mode);
  const revisionMaterial = generateRevision(keyTakeaways, keywords, mode);

  return {
    summary,
    keyTakeaways,
    mindMap,
    interviewQuestions,
    examples,
    revisionMaterial,
  };
};

