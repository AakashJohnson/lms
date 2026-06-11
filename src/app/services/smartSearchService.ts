import axiosInstance from '../../utils/axiosConfig';

export type SmartSearchResultType =
  | 'courses'
  | 'lessons'
  | 'notes'
  | 'discussions'
  | 'aiNotes'
  | 'flashcards'
  | 'quizzes';

export interface SmartSearchResponse {
  success: boolean;
  data: {
    query: string;
    suggestions: Array<{ label: string }>;
    trending: Array<{ label: string; reason?: string }>;
    results: Record<SmartSearchResultType, any[]>;
  };
}

export const smartSearch = async (params: {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
}) => {
  const res = await axiosInstance.post('/smart-search', params);
  return res.data as SmartSearchResponse;
};

