import { useState, useEffect } from 'react';
import { MessageCircle, Send, ThumbsUp, Pin, Lock, Unlock, Filter, Loader2 } from 'lucide-react';
import { 
  getCourseQueries, 
  createCourseQuery, 
  upvoteQuery, 
  toggleQueryVisibility,
  CourseQuery 
} from '../../services/courseQueryService';

interface CourseQnAProps {
  courseId: string;
  userRole: 'student' | 'trainer';
}

export function CourseQnA({ courseId, userRole }: CourseQnAProps) {
  const [queries, setQueries] = useState<CourseQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAskForm, setShowAskForm] = useState(false);
  
  // Form state
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('general');
  const [lessonReference, setLessonReference] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    loadQueries();
  }, [courseId, statusFilter, categoryFilter]);

  const loadQueries = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      
      const response = await getCourseQueries(courseId, filters);
      setQueries(response.data || []);
    } catch (error) {
      console.error('Error loading queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      alert('Please enter your question');
      return;
    }

    try {
      setSubmitting(true);
      await createCourseQuery({
        courseId,
        question: question.trim(),
        category,
        lessonReference: lessonReference.trim() || undefined,
        isPublic
      });
      
      // Reset form
      setQuestion('');
      setCategory('general');
      setLessonReference('');
      setIsPublic(false);
      setShowAskForm(false);
      
      // Reload queries
      loadQueries();
    } catch (error: any) {
      console.error('Error submitting question:', error);
      alert(error.response?.data?.message || 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (queryId: string) => {
    try {
      await upvoteQuery(queryId);
      loadQueries();
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const handleToggleVisibility = async (queryId: string) => {
    try {
      await toggleQueryVisibility(queryId);
      loadQueries();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'course-content': 'bg-blue-100 text-blue-700',
      'lesson': 'bg-purple-100 text-purple-700',
      'assessment': 'bg-orange-100 text-orange-700',
      'technical': 'bg-red-100 text-red-700',
      'general': 'bg-gray-100 text-gray-700'
    };
    return colors[cat] || colors.general;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'answered': 'bg-green-100 text-green-700',
      'closed': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Questions & Answers</h2>
        </div>
        
        {userRole === 'student' && (
          <button
            onClick={() => setShowAskForm(!showAskForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Ask Question
          </button>
        )}
      </div>

      {/* Ask Question Form */}
      {showAskForm && userRole === 'student' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ask Your Question</h3>
          <form onSubmit={handleSubmitQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Question *
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={1000}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{question.length}/1000 characters</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="course-content">Course Content</option>
                  <option value="lesson">Lesson</option>
                  <option value="assessment">Assessment</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Reference (Optional)
                </label>
                <input
                  type="text"
                  value={lessonReference}
                  onChange={(e) => setLessonReference(e.target.value)}
                  placeholder="e.g., Module 2, Lesson 3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make this question public (other students can see it)
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Question
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAskForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <div className="flex gap-3 flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="answered">Answered</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="course-content">Course Content</option>
              <option value="lesson">Lesson</option>
              <option value="assessment">Assessment</option>
              <option value="technical">Technical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : queries.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Yet</h3>
          <p className="text-gray-600">
            {userRole === 'student' 
              ? 'Be the first to ask a question about this course!' 
              : 'No questions have been asked yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queries.map((query) => (
            <div
              key={query._id}
              className={`bg-white rounded-xl p-6 shadow-sm border ${
                query.isPinned ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              {/* Query Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {query.isPinned && <Pin className="w-4 h-4 text-indigo-600" />}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(query.category)}`}>
                      {query.category}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(query.status)}`}>
                      {query.status}
                    </span>
                    {query.isPublic ? (
                      <Unlock className="w-4 h-4 text-green-600" title="Public" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" title="Private" />
                    )}
                  </div>
                  <p className="text-gray-900 font-medium">{query.question}</p>
                  {query.lessonReference && (
                    <p className="text-sm text-gray-600 mt-1">📚 {query.lessonReference}</p>
                  )}
                </div>
              </div>

              {/* Query Meta */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span>Asked by {query.student.name}</span>
                <span>•</span>
                <span>{new Date(query.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>{query.replyCount} {query.replyCount === 1 ? 'reply' : 'replies'}</span>
              </div>

              {/* Replies */}
              {query.replies && query.replies.length > 0 && (
                <div className="space-y-3 mb-4 pl-4 border-l-2 border-indigo-200">
                  {query.replies.map((reply) => (
                    <div key={reply._id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{reply.repliedBy.name}</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                          {reply.repliedByModel}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.repliedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{reply.reply}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleUpvote(query._id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{query.upvoteCount || 0}</span>
                </button>

                {userRole === 'student' && query.student._id === localStorage.getItem('userId') && (
                  <button
                    onClick={() => handleToggleVisibility(query._id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                  >
                    {query.isPublic ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {query.isPublic ? 'Make Private' : 'Make Public'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
