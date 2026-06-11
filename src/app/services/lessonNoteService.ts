import axiosInstance from '../../utils/axiosConfig';

export interface LessonNote {
  _id: string;
  student: string;
  course: {
    _id: string;
    title: string;
  };
  section: string;
  lesson: string;
  title?: string;
  content: string;
  timestamp?: number;
  isImportant: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  course: string;
  section: string;
  lesson: string;
  title?: string;
  content: string;
  timestamp?: number;
  isImportant?: boolean;
  tags?: string[];
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  isImportant?: boolean;
  tags?: string[];
  timestamp?: number;
}

/**
 * Create a new lesson note
 */
export const createLessonNote = async (data: CreateNoteData) => {
  try {
    const response = await axiosInstance.post('/lesson-notes', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get all my notes
 */
export const getMyNotes = async (params?: {
  course?: string;
  section?: string;
  lesson?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const response = await axiosInstance.get('/lesson-notes', { params });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get notes for a specific lesson
 */
export const getLessonNotes = async (courseId: string, sectionId: string, lessonId: string) => {
  try {
    const response = await axiosInstance.get(`/lesson-notes/lesson/${courseId}/${sectionId}/${lessonId}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get single note
 */
export const getNote = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/lesson-notes/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Update note
 */
export const updateNote = async (id: string, data: UpdateNoteData) => {
  try {
    const response = await axiosInstance.put(`/lesson-notes/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Delete note
 */
export const deleteNote = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/lesson-notes/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get notes count for a course
 */
export const getCourseNotesCount = async (courseId: string) => {
  try {
    const response = await axiosInstance.get(`/lesson-notes/count/${courseId}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Search notes
 */
export const searchNotes = async (query: string, courseId?: string) => {
  try {
    const response = await axiosInstance.get('/lesson-notes/search', {
      params: { query, course: courseId }
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export default {
  createLessonNote,
  getMyNotes,
  getLessonNotes,
  getNote,
  updateNote,
  deleteNote,
  getCourseNotesCount,
  searchNotes
};
