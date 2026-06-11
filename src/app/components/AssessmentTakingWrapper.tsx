import { useState, useEffect, useRef } from 'react';
import { AssessmentTaking } from './AssessmentTaking';
import { PreExamChecklist } from './exam/PreExamChecklist';
import { getAssessment, submitAssessment } from '../services/assessmentService';
import { 
  createExamSession, 
  generateDeviceFingerprint, 
  collectSystemInfo,
  getGeoLocation 
} from '../services/examSessionService';
import { ExamSessionManager, NetworkMonitor } from '../services/ExamHeartbeat';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AssessmentTakingWrapperProps {
  assessmentId: number | string;
  onBack: () => void;
  onSubmit?: (answers: Record<string, any>, proctoring: any) => void;
  isPreview?: boolean; // For trainer preview mode
  userRole?: 'admin' | 'trainer' | 'participant';
}

export function AssessmentTakingWrapper({ assessmentId, onBack, onSubmit, isPreview = false, userRole = 'participant' }: AssessmentTakingWrapperProps) {
  const [assessment, setAssessment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreExamChecklist, setShowPreExamChecklist] = useState(false);
  const [preExamChecksPassed, setPreExamChecksPassed] = useState(false);
  
  // Session management
  const sessionManagerRef = useRef<ExamSessionManager | null>(null);
  const networkMonitorRef = useRef<NetworkMonitor | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const deviceFingerprintRef = useRef<string>(generateDeviceFingerprint());

  useEffect(() => {
    loadAssessment();
  }, [assessmentId]);

  useEffect(() => {
    // Show pre-exam checklist for students (not for trainers in preview mode)
    if (assessment && !isPreview && userRole === 'participant' && !preExamChecksPassed) {
      setShowPreExamChecklist(true);
    }
  }, [assessment, isPreview, userRole, preExamChecksPassed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionManagerRef.current) {
        sessionManagerRef.current.cleanup();
      }
      if (networkMonitorRef.current) {
        networkMonitorRef.current.stop();
      }
    };
  }, []);

  const loadAssessment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getAssessment(assessmentId.toString());
      
      if (response.success && response.data) {
        // Transform the data to match AssessmentTaking component expectations
        const transformedAssessment = {
          _id: response.data._id || assessmentId.toString(),
          title: response.data.title || 'Untitled Assessment',
          instructions: response.data.instructions || 'Please read each question carefully and select the best answer.',
          timeLimit: response.data.timeLimit || 0,
          questions: (response.data.questions || []).map((q: any) => ({
            ...q,
            id: q._id || q.id, // Ensure each question has an 'id' field
          })),
          proctoring: {
            // Force enable proctoring - always on for assessments
            preventTabSwitch: true,
            requireFullscreen: false,
            disableCopyPaste: true,
            warnOnTabSwitch: true,
            autoSubmitOnViolation: true, // Auto-submit after max violations
            maxViolationsAllowed: 4, // 4 violations then auto-submit
            enableWebcam: false,
            enableFaceDetection: false,
            logSuspiciousActivity: true,
          },
        };
        
        setAssessment(transformedAssessment);
      } else {
        setError(response.message || 'Failed to load assessment');
        toast.error(response.message || 'Failed to load assessment');
      }
    } catch (err: any) {
      console.error('Error loading assessment:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load assessment. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Create exam session after pre-exam checks pass
  const createSession = async () => {
    if (isPreview || userRole !== 'participant') {
      return;
    }

    setIsCreatingSession(true);

    try {
      console.log('🔐 Creating exam session...');

      const systemInfo = await collectSystemInfo();
      const geoLocation = await getGeoLocation();

      const response = await createExamSession({
        assessmentId: assessment._id,
        deviceFingerprint: deviceFingerprintRef.current,
        systemInfo,
        geoLocation: geoLocation || undefined
      });

      if (response.success && response.data) {
        const { sessionId, token, expiryTime } = response.data;
        setSessionId(sessionId);

        sessionManagerRef.current = new ExamSessionManager(deviceFingerprintRef.current);
        sessionManagerRef.current.initialize(sessionId, token, expiryTime);
        sessionManagerRef.current.startHeartbeat({
          onConnectionLoss: () => toast.error('Connection lost', { description: 'Auto-submitting...', duration: 5000 }),
          onConnectionRestore: () => toast.success('Connection restored', { duration: 3000 }),
          onAutoSubmit: () => handleAutoSubmit()
        });

        networkMonitorRef.current = new NetworkMonitor({ onOnline: () => {}, onOffline: () => {} });
        networkMonitorRef.current.start();

        console.log('✅ Exam session created:', sessionId);
      }
      // If session creation fails (404 etc.), we still allow the exam to proceed
    } catch (error: any) {
      // Session service not available — log but don't block the student
      console.warn('⚠️ Exam session service unavailable, proceeding without session tracking:', error.message);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleAutoSubmit = () => {
    // This will be called by heartbeat on connection loss or time expiry
    // Implement auto-submit logic here
    toast.warning('Auto-submitting assessment...', {
      description: 'Your assessment is being submitted automatically',
      duration: 3000
    });
    
    // TODO: Trigger actual submission
    setTimeout(() => {
      onBack();
    }, 3000);
  };

  const handleSubmit = async (answers: Record<string, any>, proctoringData: any) => {
    // Skip API call for preview mode
    if (isPreview) {
      toast.info('Preview mode - submission not saved', {
        description: 'This is a preview. No data was submitted.',
      });
      setTimeout(() => onBack(), 1500);
      return;
    }

    try {
      // Transform answers to match backend format
      const transformedAnswers = Object.entries(answers).map(([questionId, answer]) => {
        // Find the question to get its _id and order
        const question = assessment.questions.find((q: any) => {
          // Handle both string and object IDs
          const qId = q._id || q.id;
          return String(qId) === String(questionId);
        });
        
        // Use the question's _id, or if not found, use the questionId from answers
        const actualQuestionId = question?._id || questionId;
        
        console.log('Transforming answer:', { questionId, actualQuestionId, question: question?.questionText });
        
        return {
          questionId: actualQuestionId,
          questionNumber: question?.order ?? 0,
          selectedOption: typeof answer === 'number' ? answer : undefined,
          selectedOptions: Array.isArray(answer) ? answer : undefined,
          textAnswer: typeof answer === 'string' ? answer : undefined,
          blanks: Array.isArray(answer) && question?.type === 'fillblank' ? answer : undefined,
          tfAnswer: typeof answer === 'boolean' ? answer : undefined,
          timeTaken: 0, // Could track per-question time if needed
        };
      });

      // Calculate total time taken
      const timeTaken = proctoringData?.timeTaken || 0;

      console.log('Submitting assessment:', {
        assessmentId: assessment._id,
        answersCount: transformedAnswers.length,
        transformedAnswers,
        proctoring: proctoringData,
        timeTaken
      });

      const response = await submitAssessment(assessment._id, {
        answers: transformedAnswers,
        proctoring: proctoringData,
        timeTaken,
        courseId: null, // Optional - can be added later if needed
      });
      
      if (response.success) {
        const { score, isPassed, attemptNumber } = response.data!;
        
        toast.success('Assessment submitted successfully!', {
          description: `Score: ${score.percentage}% | ${isPassed ? 'Passed ✅' : 'Failed ❌'} | Attempt #${attemptNumber}`,
          icon: isPassed ? '🎉' : '📝',
          duration: 5000,
        });
        
        // Call parent onSubmit if provided
        if (onSubmit) {
          onSubmit(answers, proctoringData);
        } else {
          // Default: go back to assessment list after showing result
          setTimeout(() => {
            onBack();
          }, 3000);
        }
      } else {
        toast.error(response.message || 'Failed to submit assessment');
      }
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to submit assessment. Please try again.';
      toast.error(errorMsg);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Loading Assessment...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we prepare your assessment</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Assessment</h2>
          <p className="text-gray-600 mb-6">
            {error || 'The assessment could not be loaded. Please try again.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={loadAssessment}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show pre-exam checklist for students
  if (showPreExamChecklist && !preExamChecksPassed) {
    return (
      <PreExamChecklist
        examId={assessment._id}
        examTitle={assessment.title}
        onAllChecksPassed={async () => {
          setPreExamChecksPassed(true);
          setShowPreExamChecklist(false);
          
          // Create exam session after checks pass
          await createSession();
        }}
        onCancel={onBack}
      />
    );
  }

  // Show loading while creating session
  if (isCreatingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Starting Exam Session...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we set up your secure exam environment</p>
        </div>
      </div>
    );
  }

  // Render AssessmentTaking component with loaded data
  return (
    <AssessmentTaking
      assessment={assessment}
      onSubmit={handleSubmit}
      onExit={onBack}
      isPreview={isPreview}
      userRole={userRole}
    />
  );
}
