import axiosInstance from '../../utils/axiosConfig';

export type ForumCategory = 'general' | 'course' | 'lesson' | 'assessment' | 'technical' | 'resource';

export interface ForumPost {
  _id: string;
  author: { firstName: string; lastName: string; profilePicture?: string; email?: string };
  course?: { _id: string; title: string; thumbnail?: string } | null;
  title: string;
  body: string;
  category: ForumCategory;
  tags: string[];
  likes: string[];
  pinned: boolean;
  solved: boolean;
  viewCount: number;
  aiSummary?: string;
  isFlagged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumReply {
  _id: string;
  post: string;
  parentReplyId: string | null;
  author: { firstName: string; lastName: string; profilePicture?: string; email?: string };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const listForumPosts = async (params?: { query?: string; category?: string; tag?: string; limit?: number }) => {
  const search = new URLSearchParams();
  if (params?.query) search.append('query', params.query);
  if (params?.category && params.category !== 'all') search.append('category', params.category);
  if (params?.tag && params.tag !== 'all') search.append('tag', params.tag);
  if (params?.limit) search.append('limit', String(params.limit));

  const res = await axiosInstance.get(`/forum/posts?${search.toString()}`);
  return res.data as { success: boolean; data: ForumPost[] };
};

export const createForumPost = async (data: {
  courseId?: string | null;
  title: string;
  body: string;
  category: ForumCategory;
  tags?: string[];
}) => {
  const res = await axiosInstance.post(`/forum/posts`, data);
  return res.data as { success: boolean; data: ForumPost };
};

export const getForumPost = async (postId: string) => {
  const res = await axiosInstance.get(`/forum/posts/${postId}`);
  return res.data as { success: boolean; data: { post: ForumPost; replies: ForumReply[] } };
};

export const addForumReply = async (postId: string, data: { content: string; parentReplyId?: string | null }) => {
  const res = await axiosInstance.post(`/forum/posts/${postId}/replies`, data);
  return res.data as { success: boolean; data: ForumReply };
};

export const toggleLike = async (postId: string) => {
  const res = await axiosInstance.post(`/forum/posts/${postId}/like`);
  return res.data as { success: boolean; data: ForumPost };
};

export const toggleSolved = async (postId: string) => {
  const res = await axiosInstance.post(`/forum/posts/${postId}/solve`);
  return res.data as { success: boolean; data: ForumPost };
};

export const togglePin = async (postId: string) => {
  const res = await axiosInstance.post(`/forum/posts/${postId}/pin`);
  return res.data as { success: boolean; data: ForumPost };
};

export const aiSummary = async (postId: string) => {
  const res = await axiosInstance.post(`/forum/posts/${postId}/ai/summary`, {});
  return res.data as { success: boolean; data: { summary: string } };
};

export const aiSuggestReply = async (postId: string, userMessage: string) => {
  const res = await axiosInstance.post(`/forum/posts/${postId}/ai/suggest-reply`, { userMessage });
  return res.data as { success: boolean; data: { suggestion: string } };
};

