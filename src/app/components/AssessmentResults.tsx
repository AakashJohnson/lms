import { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Clock, Award, ArrowLeft, 
  FileText, Calendar, User, TrendingUp, AlertCircle,
  Eye, Download, Loader2
} from 'lucide-react';
import { getAttemptDetails } from '../services/assessmentService';
import { toast } from 'sonner';

interface AssessmentResultsProps {
  assessmentId: string;
  attemptId: string;
  onBack: () => void;
  userRole?: 'admin' | 'trainer' | 'participant';
}

export function AssessmentResults({ assessmentId, attemptId, onBack, userRole = 'participant' }: AssessmentResultsProps) {
  const [attempt, setAttempt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttemptDetails();
  }, [attemptId]);

  const loadAttemptDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getAttemptDetails(assessmentId, attemptId);
      
      if (response.success && response.data) {
        setAttempt(response.data);
      } else {
        setError(response.message || 'Failed to load results');
        toast.error(response.message || 'Failed to load results');
      }
    } catch (err: any) {
      console.error('Error loading attempt details:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load results. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Loading Results...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Results</h2>
          <p className="text-gray-600 mb-6">{error || 'Could not load assessment results.'}</p>
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

  const { assessment, score, isPassed, answers, submittedAt, timeTaken, attemptNumber, proctoring, user } = attempt;
  const showCorrectAnswers = assessment?.showCorrectAnswers === 'immediate' || 
                             assessment?.showCorrectAnswers === 'after_due' ||
                             userRole !== 'participant';
  
  const isTrainerView = userRole === 'admin' || userRole === 'trainer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trainer/Admin Banner */}
      {isTrainerView && user && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5" />
            <div>
              <p className="font-semibold">Viewing Submission</p>
              <p className="text-xs text-purple-100">
                Student: {user.name} ({user.email})
              </p>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
            Read-Only Mode
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to {isTrainerView ? 'Submissions' : 'Assessments'}</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{assessment?.title || 'Assessment Results'}</h1>
          {isTrainerView && (
            <p className="text-sm text-gray-500 mt-1">
              Viewing {user?.name}'s submission - Attempt #{attemptNumber}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Score Card */}
        <div className={`bg-gradient-to-br ${isPassed ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'} rounded-2xl p-8 text-white shadow-lg`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {isPassed ? (
                  <CheckCircle2 className="w-10 h-10" />
                ) : (
                  <XCircle className="w-10 h-10" />
                )}
                <h2 className="text-3xl font-bold">
                  {isPassed ? 'Passed!' : 'Not Passed'}
                </h2>
              </div>
              <p className="text-white/90">
                {isPassed 
                  ? 'Congratulations! You have successfully passed this assessment.' 
                  : 'Keep practicing! You can retake this assessment.'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold mb-1">{score?.percentage || 0}%</div>
              <div className="text-white/90 text-lg">
                {score?.obtained || 0} / {score?.total || 0} points
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{score?.percentage || 0}%</p>
                <p className="text-xs text-gray-500">Your Score</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{answers?.length || 0}</p>
                <p className="text-xs text-gray-500">Questions</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor((timeTaken || 0) / 60)}m
                </p>
                <p className="text-xs text-gray-500">Time Taken</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">#{attemptNumber || 1}</p>
                <p className="text-xs text-gray-500">Attempt</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Submission Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Submitted: {new Date(submittedAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Duration: {Math.floor((timeTaken || 0) / 60)} minutes {(timeTaken || 0) % 60} seconds</span>
            </div>
            {proctoring?.violationCount > 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span>Violations: {proctoring.violationCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Questions & Answers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Answers</h3>
          <div className="space-y-6">
            {answers?.map((answer: any, index: number) => {
              const question = assessment?.questions?.find((q: any) => 
                String(q._id) === String(answer.questionId)
              );
              
              if (!question) return null;

              const isCorrect = answer.isCorrect;
              const wasAnswered = answer.selectedOption !== undefined || 
                                 answer.textAnswer || 
                                 answer.selectedOptions?.length > 0;

              return (
                <div 
                  key={answer.questionId} 
                  className={`border-2 rounded-xl p-5 ${
                    isCorrect === true ? 'border-green-200 bg-green-50' :
                    isCorrect === false ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">Q{index + 1}.</span>
                        {isCorrect === true && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Correct
                          </span>
                        )}
                        {isCorrect === false && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )}
                        {isCorrect === null && (
                          <span className="flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-200 px-2 py-0.5 rounded-full">
                            <Eye className="w-3 h-3" /> Manual Grading
                          </span>
                        )}
                      </div>
                      <p
                        className="text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: question.questionText }}
                      />
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {answer.marksAwarded || 0} / {question.points || 0}
                      </span>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>

                  {/* MCQ Options */}
                  {question.type === 'mcq' && question.options && (
                    <div className="space-y-2 mt-4">
                      {question.options.map((option: any, optIdx: number) => {
                        const isSelected = answer.selectedOption === optIdx;
                        const isCorrectOption = option.isCorrect;
                        
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                              showCorrectAnswers && isCorrectOption
                                ? 'border-green-500 bg-green-50'
                                : isSelected && !isCorrect
                                ? 'border-red-500 bg-red-50'
                                : isSelected
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              showCorrectAnswers && isCorrectOption
                                ? 'border-green-600 bg-green-600'
                                : isSelected
                                ? 'border-indigo-600 bg-indigo-600'
                                : 'border-gray-300'
                            }`}>
                              {(isSelected || (showCorrectAnswers && isCorrectOption)) && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <span className={`flex-1 ${
                              showCorrectAnswers && isCorrectOption ? 'font-semibold text-green-900' :
                              isSelected ? 'font-medium text-gray-900' :
                              'text-gray-700'
                            }`}>
                              {option.text}
                            </span>
                            {showCorrectAnswers && isCorrectOption && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                            {isSelected && !isCorrect && (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Answer */}
                  {(question.type === 'shortanswer' || question.type === 'longanswer') && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Your Answer:</p>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {answer.textAnswer || <span className="text-gray-400 italic">No answer provided</span>}
                        </p>
                      </div>
                      {showCorrectAnswers && question.sampleAnswer && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-green-900 mb-1">Sample Answer:</p>
                          <p className="text-sm text-green-800">{question.sampleAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {showCorrectAnswers && question.explanation && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
                      <p className="text-sm text-blue-800">{question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Assessments
          </button>
          {/* TODO: Add download/print functionality */}
          {/* <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Results
          </button> */}
        </div>
      </div>
    </div>
  );
}
