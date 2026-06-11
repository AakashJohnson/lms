import { useState, useEffect } from 'react';
import * as React from 'react';
import { MessageSquare, Send, Clock, CheckCircle2, XCircle, Bell, Loader2, Sparkles } from 'lucide-react';
import { 
  getMyQueries, 
  createCourseQuery,
  CourseQuery 
} from '../services/courseQueryService';
import { getMyEnrollments } from '../services/courseService';
import { toast } from 'sonner';
import { PremiumCard, PremiumHero, PremiumPageShell, PremiumStatCard } from './premium/PremiumPage';

export function StudentQnA() {
  const [queries, setQueries] = useState<CourseQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  
  // New query form
  const [showNewQueryForm, setShowNewQueryForm] = useState(false);
  const [newQuery, setNewQuery] = useState({
    question: '',
    category: 'general',
    courseId: '',
  });

  useEffect(() => {
    loadQueries();
    loadEnrolledCourses();
  }, []);

  const loadEnrolledCourses = async () => {
    try {
      const response = await getMyEnrollments();
      if (response.success && response.data) {
        setEnrolledCourses(response.data);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load enrolled courses');
    }
  };

  const loadQueries = async () => {
    try {
      setLoading(true);
      const response = await getMyQueries();
      setQueries(response.data || []);
    } catch (error) {
      console.error('Error loading queries:', error);
      toast.error('Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuery = async () => {
    if (!newQuery.question.trim()) {
      toast.error('Please enter your question');
      return;
    }

    if (!newQuery.courseId) {
      toast.error('Please select a course');
      return;
    }

    try {
      setSubmitting(true);
      await createCourseQuery({
        question: newQuery.question.trim(),
        category: newQuery.category,
        courseId: newQuery.courseId,
        isPublic: false,
      });

      toast.success('Query submitted successfully! You will be notified when trainer replies.');
      setNewQuery({ question: '', category: 'general', courseId: '' });
      setShowNewQueryForm(false);
      loadQueries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    pending: { color: 'yellow', label: 'Pending', icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-700' },
    answered: { color: 'green', label: 'Answered', icon: CheckCircle2, bg: 'bg-green-100', text: 'text-green-700' },
    closed: { color: 'gray', label: 'Closed', icon: XCircle, bg: 'bg-gray-100', text: 'text-gray-700' },
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

  const pendingCount = queries.filter(q => q.status === 'pending').length;
  const answeredCount = queries.filter(q => q.status === 'answered').length;
  const closedCount = queries.filter(q => q.status === 'closed').length;

  const selectedQueryData = queries.find(q => q._id === selectedQuery);

  return (
    <PremiumPageShell>
      <PremiumHero
        title="Ask Questions"
        subtitle="Ask course questions and track expert responses from your trainers."
        eyebrow="Trainer supported Q&A"
        icon={MessageSquare}
        action={(
          <button 
            onClick={() => setShowNewQueryForm(!showNewQueryForm)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(79,70,229,.9)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <MessageSquare className="w-5 h-5" />
            {showNewQueryForm ? 'Cancel' : 'Ask Question'}
          </button>
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard label="Pending" value={pendingCount} detail="Awaiting response" icon={Clock} tone="from-amber-50 via-yellow-50 to-white" accent="text-amber-600" />
        <PremiumStatCard label="Answered" value={answeredCount} detail="Trainer replied" icon={CheckCircle2} tone="from-emerald-50 via-teal-50 to-white" accent="text-emerald-600" />
        <PremiumStatCard label="Closed" value={closedCount} detail="Resolved queries" icon={XCircle} tone="from-slate-50 via-gray-50 to-white" accent="text-slate-600" />
        <PremiumStatCard label="Total Queries" value={queries.length} detail="All questions" icon={MessageSquare} tone="from-blue-50 via-sky-50 to-white" accent="text-blue-600" />
      </div>

      {/* New Query Form */}
      {showNewQueryForm && (
        <PremiumCard className="p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">Submit New Question</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Course *</label>
              <select 
                value={newQuery.courseId}
                onChange={(e) => setNewQuery({ ...newQuery, courseId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose a course...</option>
                {enrolledCourses.map((enrollment: any) => (
                  <option key={enrollment._id} value={enrollment.course._id}>
                    {enrollment.course.title}
                  </option>
                ))}
              </select>
              {enrolledCourses.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No enrolled courses found. Please enroll in a course first.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select 
                value={newQuery.category}
                onChange={(e) => setNewQuery({ ...newQuery, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="general">General</option>
                <option value="course-content">Course Content</option>
                <option value="lesson">Lesson</option>
                <option value="assessment">Assessment</option>
                <option value="technical">Technical Support</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Question *</label>
              <textarea
                value={newQuery.question}
                onChange={(e) => setNewQuery({ ...newQuery, question: e.target.value })}
                rows={4}
                maxLength={1000}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Describe your question in detail..."
              />
              <p className="text-xs text-gray-500 mt-1">{newQuery.question.length}/1000 characters</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">You'll be notified</p>
                  <p className="text-xs text-blue-700 mt-1">
                    When your trainer replies, you'll receive a notification in your notification panel and via email.
                  </p>
                </div>
              </div>
            </div>
            <button 
              onClick={handleSubmitQuery}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Question
                </>
              )}
            </button>
          </div>
        </PremiumCard>
      )}

      {/* Query List */}
      {loading ? (
        <PremiumCard className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </PremiumCard>
      ) : queries.length === 0 ? (
        <PremiumCard className="p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Yet</h3>
          <p className="text-gray-600 mb-6">Start by asking your first question to your trainer</p>
          <button 
            onClick={() => setShowNewQueryForm(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            Ask Your First Question
          </button>
        </PremiumCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Query List */}
          <PremiumCard>
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-lg text-gray-900">My Questions</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {queries.map((query) => {
                const status = statusConfig[query.status];
                const StatusIcon = status.icon;
                const hasNewReply = query.replies && query.replies.length > 0 && query.status === 'answered';

                return (
                  <button
                    key={query._id}
                    onClick={() => setSelectedQuery(query._id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors relative ${
                      selectedQuery === query._id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    {hasNewReply && (
                      <div className="absolute top-2 right-2">
                        <span className="flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(query.category)}`}>
                        {query.category}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">{query.question}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{query.course?.title || 'General Query'}</span>
                      <span>{new Date(query.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    {hasNewReply && (
                      <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        New reply received!
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </PremiumCard>

          {/* Right: Query Detail */}
          <PremiumCard>
            {selectedQueryData ? (
              <>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getCategoryColor(selectedQueryData.category)}`}>
                      {selectedQueryData.category}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${statusConfig[selectedQueryData.status].bg} ${statusConfig[selectedQueryData.status].text}`}>
                      {React.createElement(statusConfig[selectedQueryData.status].icon, { className: 'w-3 h-3' })}
                      {statusConfig[selectedQueryData.status].label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">{selectedQueryData.question}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Course: <strong>{selectedQueryData.course?.title || 'General'}</strong></span>
                    <span>•</span>
                    <span>{new Date(selectedQueryData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {selectedQueryData.lessonReference && (
                    <p className="text-sm text-gray-600 mt-2">📚 {selectedQueryData.lessonReference}</p>
                  )}
                </div>
                <div className="p-6 max-h-[500px] overflow-y-auto">
                  {selectedQueryData.replies && selectedQueryData.replies.length > 0 ? (
                    <div className="space-y-4">
                      {selectedQueryData.replies.map((reply) => (
                        <div key={reply._id} className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-900">Trainer Response</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {new Date(reply.repliedAt).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3 whitespace-pre-wrap">{reply.reply}</p>
                          <p className="text-sm text-gray-600">
                            — <strong>{reply.repliedBy?.name || 'Trainer'}</strong>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-900">Pending Response</span>
                      </div>
                      <p className="text-gray-700">
                        Your question has been received and is being reviewed by your trainer. You will receive a notification when they reply.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center text-gray-400">
                  <Sparkles className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>Select a question to view details</p>
                </div>
              </div>
            )}
          </PremiumCard>
        </div>
      )}
    </PremiumPageShell>
  );
}
