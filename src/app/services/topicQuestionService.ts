import axiosInstance from '../../utils/axiosConfig';

export interface TopicQuestion {
  _id: string;
  course: string;
  section: string;
  lesson: string;
  question: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: { _id: string; text: string; isCorrect?: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  order: number;
  createdBy: string;
  isActive: boolean;
}

export interface QuestionAnswer {
  isCorrect: boolean | null;
  correctAnswer: string;
  explanation: string;
}

export const topicQuestionService = {
  // Get questions for a lesson
  getLessonQuestions: async (lessonId: string): Promise<TopicQuestion[]> => {
    const response = await axiosInstance.get(`/topic-questions/lesson/${lessonId}`);
    return response.data.data;
  },

  // Get all questions for a course (trainer/admin only)
  getCourseQuestions: async (courseId: string): Promise<TopicQuestion[]> => {
    const response = await axiosInstance.get(`/topic-questions/course/${courseId}`);
    return response.data.data;
  },

  // Add a new question
  addQuestion: async (data: {
    course: string;
    section: string;
    lesson: string;
    question: string;
    questionType?: string;
    options?: { text: string; isCorrect: boolean }[];
    correctAnswer?: string;
    explanation?: string;
    order?: number;
  }): Promise<TopicQuestion> => {
    const response = await axiosInstance.post('/topic-questions', data);
    return response.data.data;
  },

  // Update a question
  updateQuestion: async (questionId: string, data: Partial<TopicQuestion>): Promise<TopicQuestion> => {
    const response = await axiosInstance.put(`/topic-questions/${questionId}`, data);
    return response.data.data;
  },

  // Delete a question
  deleteQuestion: async (questionId: string): Promise<void> => {
    await axiosInstance.delete(`/topic-questions/${questionId}`);
  },

  // Submit answer
  submitAnswer: async (questionId: string, answer: string): Promise<QuestionAnswer> => {
    const response = await axiosInstance.post(`/topic-questions/${questionId}/answer`, { answer });
    return response.data.data;
  }
};

export default topicQuestionService;