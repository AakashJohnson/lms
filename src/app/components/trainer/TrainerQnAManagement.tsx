import { useState, useEffect } from 'react';
import { MessageCircle, Send, Pin, Filter, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { 
  getTrainerQueries, 
  replyToCourseQuery, 
  updateQueryStatus,
  togglePinQuery,
  CourseQuery 
} from '../../services/courseQueryService';
import { PremiumCard, PremiumHero, PremiumPageShell, PremiumStatCard } from '../premium/PremiumPage';

interface TrainerQnAManagementProps {
  userRole?: 'admin' | 'trainer' | 'participant';
}

export function TrainerQnAManagement({ userRole = 'trainer' }: TrainerQnAManagementProps) {
  const isAdmin = userRole === 'admin';
  const [queries, setQueries] = useState<CourseQuery[]>([]);
  const [grouped, setGrouped] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('');

  useEffect(() => {
    loadQueries();
  }, [statusFilter, categoryFilter, courseFilter]);

  const loadQueries = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (courseFilter) filters.courseId = courseFilter;
      
      const response = await getTrainerQueries(filters);
      setQueries(response.data || []);
      setGrouped(response.grouped || null);
      
      // Extract unique courses from queries for filter dropdown
      if (response.data) {
        const uniqueCourses = Array.from(
          new Map(response.data.map((q: CourseQuery) => [q.course._id, q.course])).values()
        );
        setCourses(uniqueCourses as any[]);
      }
    } catch (error) {
      console.error('Error loading queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (queryId: string) => {
    if (!replyText.trim()) {
      alert('Please enter a reply');
      return;
    }

    try {
      setSubmitting(true);
      await replyToCourseQuery(queryId, replyText.trim());
      setReplyText('');
      setReplyingTo(null);
      loadQueries();
    } catch (error: any) {
      console.error('Error replying:', error);
      alert(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (queryId: string, status: 'pending' | 'answered' | 'closed') => {
    try {
      await updateQueryStatus(queryId, status);
      loadQueries();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleTogglePin = async (queryId: string) => {
    try {
      await togglePinQuery(queryId);
      loadQueries();
    } catch (error) {
      console.error('Error toggling pin:', error);
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
    <PremiumPageShell>
      <PremiumHero
        title={isAdmin ? 'All QMS Queries' : 'Student Questions & Queries'}
        subtitle={isAdmin ? 'View and manage every student question received across all courses.' : 'Manage and respond to student questions from your courses.'}
        eyebrow="Academic support desk"
        icon={MessageCircle}
      />

      {grouped && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PremiumStatCard label="Pending" value={grouped.pending?.length || 0} detail="Needs attention" icon={Clock} tone="from-amber-50 via-yellow-50 to-white" accent="text-amber-600" />
          <PremiumStatCard label="Answered" value={grouped.answered?.length || 0} detail="Responses sent" icon={CheckCircle} tone="from-emerald-50 via-teal-50 to-white" accent="text-emerald-600" />
          <PremiumStatCard label="Total Queries" value={queries.length} detail="Current filter" icon={MessageCircle} tone="from-indigo-50 via-blue-50 to-white" accent="text-indigo-600" />
        </div>
      )}

      {/* Filters */}
      <PremiumCard className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <div className="flex gap-3 flex-1 flex-wrap">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>

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
      </PremiumCard>

      {/* Questions List */}
      {loading ? (
        <PremiumCard className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </PremiumCard>
      ) : queries.length === 0 ? (
        <PremiumCard className="p-12 text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions</h3>
          <p className="text-gray-600">
            {isAdmin
              ? 'No QMS questions have been received yet, or no questions match your filters.'
              : 'No student questions match your filters.'}
          </p>
        </PremiumCard>
      ) : (
        <div className="space-y-4">
          {queries.map((query) => (
            <div
              key={query._id}
              className={`rounded-[24px] p-6 shadow-[0_8px_30px_rgba(99,102,241,.06)] border backdrop-blur-xl transition-all hover:-translate-y-1 ${
                query.isPinned ? 'border-indigo-300 bg-indigo-50/90' : 'border-white/80 bg-white/90'
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
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {query.course?.title || 'Unknown Course'}
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium text-lg">{query.question}</p>
                  {query.lessonReference && (
                    <p className="text-sm text-gray-600 mt-1">📚 {query.lessonReference}</p>
                  )}
                </div>
              </div>

              {/* Query Meta */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Student:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {query.student?.firstName && query.student?.lastName 
                        ? `${query.student.firstName} ${query.student.lastName}`
                        : query.student?.name || 'Unknown Student'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 text-gray-900">{query.student?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Asked on:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(query.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Upvotes:</span>
                    <span className="ml-2 text-gray-900">👍 {query.upvoteCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Existing Replies */}
              {query.replies && query.replies.length > 0 && (
                <div className="space-y-3 mb-4 pl-4 border-l-2 border-indigo-200">
                  {query.replies.map((reply) => (
                    <div key={reply._id} className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{reply.repliedBy?.name || 'Trainer'}</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
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

              {/* Reply Form */}
              {replyingTo === query._id ? (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={4}
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{replyText.length}/2000 characters</p>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleReply(query._id)}
                      disabled={submitting}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Reply
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {replyingTo !== query._id && (
                  <button
                    onClick={() => setReplyingTo(query._id)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Reply
                  </button>
                )}

                <button
                  onClick={() => handleTogglePin(query._id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    query.isPinned 
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Pin className="w-4 h-4" />
                  {query.isPinned ? 'Unpin' : 'Pin'}
                </button>

                {query.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(query._id, 'answered')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Answered
                  </button>
                )}

                {query.status !== 'closed' && (
                  <button
                    onClick={() => handleStatusChange(query._id, 'closed')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PremiumPageShell>
  );
}
