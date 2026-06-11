import axios from 'axios';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = process.env.AI_MODEL || 'meta/llama-3.1-70b-instruct';

const createClient = () => {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured in environment');
  }
  return axios.create({
    baseURL: NVIDIA_BASE_URL,
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 120000,
  });
};

export const chatWithAI = async ({ messages, model = DEFAULT_MODEL, temperature = 0.7, max_tokens = 2048 }) => {
  const client = createClient();
  const response = await client.post(`/chat/completions`, {
    model,
    messages,
    temperature,
    max_tokens,
  });
  return response.data.choices[0].message.content;
};

export const generateWithPrompt = async ({ systemPrompt, userPrompt, model = DEFAULT_MODEL, temperature = 0.7 }) => {
  return chatWithAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
    temperature,
  });
};

export const parseJsonResponse = async ({ systemPrompt, userPrompt, model = DEFAULT_MODEL, temperature = 0.3 }) => {
  const content = await generateWithPrompt({ systemPrompt, userPrompt, model, temperature });
  try {
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    throw new Error('Failed to parse AI response as JSON');
  }
};

export const DEFAULT_MODELS = {
  small: 'meta/llama-3.1-8b-instruct',
  medium: 'meta/llama-3.1-70b-instruct',
  large: 'nvidia/llama-3.1-nemotron-70b-instruct',
};

export const selectModel = (mode) => {
  switch (mode) {
    case 'detailed':
      return DEFAULT_MODELS.medium;
    case 'short':
    default:
      return DEFAULT_MODELS.small;
  }
};