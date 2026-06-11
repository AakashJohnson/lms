import { generateWithPrompt, parseJsonResponse } from '../services/ai.service.js';

const BANNED_WORDS = [
  'idiot',
  'stupid',
  'hate',
  'kill',
  'fuck',
  'porn',
  'sex',
  'racist',
];

const countLinks = (text) => {
  const t = String(text || '');
  const m = t.match(/https?:\/\//gi);
  return m ? m.length : 0;
};

const looksLikeSpam = (text) => {
  const t = String(text || '');
  if (!t.trim()) return true;

  // Too many repeated characters (e.g. "!!!!!")
  if (/(.)\1\1\1/.test(t)) return true;

  // Too many links
  if (countLinks(t) > 3) return true;

  // Very long without punctuation
  if (t.length > 1200 && !/[.?!]/.test(t)) return true;

  return false;
};

const looksToxic = (text) => {
  const t = String(text || '').toLowerCase();
  return BANNED_WORDS.some((w) => t.includes(w));
};

export const moderateForumText = ({ text }) => {
  if (looksToxic(text)) {
    return { safe: false, reason: 'Toxic language detected' };
  }
  if (looksLikeSpam(text)) {
    return { safe: false, reason: 'Spam pattern detected' };
  }
  return { safe: true, reason: '' };
};

export const moderateForumTextAI = async ({ text }) => {
  const systemPrompt = 'You are a content moderation assistant. Analyze the text for safety. Return JSON with "safe" (boolean) and "reason" (string explaining any issues).';

  const userPrompt = `Analyze this text for:
1. Toxic/harmful language
2. Spam or promotional content
3. Inappropriate content
4. Personal attacks or harassment

Text to analyze: "${text.slice(0, 2000)}"

Return JSON: { "safe": true/false, "reason": "explanation if not safe" }`;

  try {
    const result = await parseJsonResponse({
      systemPrompt,
      userPrompt,
      model: 'meta/llama-3.1-8b-instruct',
      temperature: 0.2,
    });
    if (typeof result.safe === 'boolean') {
      return { safe: result.safe, reason: result.reason || '' };
    }
  } catch (error) {
    console.warn('AI moderation failed, using heuristic fallback:', error.message);
  }

  return moderateForumText({ text });
};

export const moderateWithAI = async ({ text }) => {
  const heuristicResult = moderateForumText({ text });
  if (!heuristicResult.safe) {
    return heuristicResult;
  }

  try {
    return await moderateForumTextAI({ text });
  } catch {
    return heuristicResult;
  }
};

