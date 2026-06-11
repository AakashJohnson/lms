import { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Award,
  Calendar, Eye, RotateCcw, Loader2, AlertCircle,
  TrendingUp, FileText
} from 'lucide-react';
import { getMyAttempts } from '../services/assessmentService';
import { toast } from 'sonner';

interface StudentSubmissionsProps {
  assessmentId: string;
  assessmentTitle: string;
  onBack: () => void;
  onViewAttempt: (attemptId: string) => void;
  onRetake?: () => void;
  attemptsAllowed?: number;
}

export function StudentSubmissions({
  assessmentId,
  assessmentTitle,
  onBack,
  onViewAttempt,
  onRetake,
  attemptsAllowed = 3,
}: StudentSubmissionsProps) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttempts();
  }, [assessmentId]);

  const loadAttempts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyAttempts(assessmentId);
      if (response.success) {
        // Sort newest first
        const sorted = (response.data || []).sort(
          (a: any, b: any) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        setAttempts(sorted);
      } else {
        setError(response.message || 'Failed to load attempts');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load attempts';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const submittedAttempts = attempts.filter(
    (a) => a.status === 'submitted' || a.status === 'evaluated'
  );
  const bestAttempt = submittedAttempts.reduce(
    (best: any, a: any) =>
      !best || (a.score?.percentage || 0) > (best.score?.percentage || 0) ? a : best,
    null
  );
  const attemptsLeft = Math.max(0, attemptsAllowed - submittedAttempts.length);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Loading your submissions…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Assessments</span>
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessmentTitle}</h1>
              <p className="text-sm text-gray-500 mt-0.5">My Submission History</p>
            </div>
            {onRetake && attemptsLeft > 0 && (
              <button
                onClick={onRetake}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retake ({attemptsLeft} left)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Summary cards */}
        {submittedAttempts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{submittedAttempts.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Attempts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{bestAttempt?.score?.percentage ?? 0}%</p>
              <p className="text-xs text-gray-500 mt-1">Best Score</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{attemptsLeft}</p>
              <p className="text-xs text-gray-500 mt-1">Attempts Left</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${bestAttempt?.isPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {bestAttempt?.isPassed ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-green-700">Passed</p>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-red-600">Not Passed</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Attempts list */}
        {submittedAttempts.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No submissions yet</p>
            <p className="text-sm text-gray-400 mt-1">You haven't attempted this assessment yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">All Attempts</h2>
            {submittedAttempts.map((attempt, index) => {
              const isBest = bestAttempt?._id === attempt._id;
              const isPassed = attempt.isPassed;
              const score = attempt.score?.percentage ?? 0;
              const timeMins = Math.floor((attempt.timeTaken || 0) / 60);
              const timeSecs = (attempt.timeTaken || 0) % 60;

              return (
                <div
                  key={attempt._id}
                  className={`bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-md ${
                    isBest ? 'border-indigo-300' : 'border-gray-200'
                  }`}
                >
                  {isBest && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Best Attempt
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {/* Attempt number circle */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                        isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        #{attempt.attemptNumber || (submittedAttempts.length - index)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-2xl font-bold ${isPassed ? 'text-green-600' : 'text-red-500'}`}>
                            {score}%
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isPassed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isPassed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            {attempt.score?.obtained ?? 0} / {attempt.score?.total ?? 0} pts
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {timeMins}m {timeSecs}s
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {attempt.submittedAt
                              ? new Date(attempt.submittedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onViewAttempt(attempt._id)}
                      className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>

                  {/* Score bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${isPassed ? 'bg-green-500' : 'bg-red-400'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
