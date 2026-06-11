import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, AlertTriangle, Shield, Camera, Maximize2, X, CheckCircle2,
  AlertCircle, ChevronRight, ChevronLeft, Flag, Send, Eye, EyeOff,
  Activity, Bell, Lock, Loader2, Info
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProctoringSettings {
  preventTabSwitch: boolean;
  requireFullscreen: boolean;
  disableCopyPaste: boolean;
  warnOnTabSwitch: boolean;
  autoSubmitOnViolation: boolean;
  maxViolationsAllowed: number;
  enableWebcam: boolean;
  enableFaceDetection: boolean;
  logSuspiciousActivity: boolean;
}

interface Question {
  id: string;
  type: string;
  questionText: string;
  options?: { text: string; isCorrect: boolean }[];
  points: number;
}

interface Assessment {
  _id: string;
  title: string;
  instructions: string;
  timeLimit: number;
  questions: Question[];
  proctoring?: ProctoringSettings;
}

interface Violation {
  type: string;
  timestamp: Date;
  details: string;
}

interface ActivityLog {
  type: string;
  timestamp: Date;
  details: string;
}

interface AssessmentTakingProps {
  assessment: Assessment;
  onSubmit: (answers: Record<string, any>, proctoring: any) => void;
  onExit: () => void;
  isPreview?: boolean; // Trainer preview mode
  userRole?: 'admin' | 'trainer' | 'participant';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AssessmentTaking({ assessment, onSubmit, onExit, isPreview = false, userRole = 'participant' }: AssessmentTakingProps) {
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(assessment.timeLimit * 60); // seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(!isPreview); // Skip consent for preview
  const [consentGiven, setConsentGiven] = useState(isPreview); // Auto-consent for preview
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false); // Track if auto-submit is in progress
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activityLogQueueRef = useRef<ActivityLog[]>([]);
  const lastActivitySyncRef = useRef<Date>(new Date());
  const isAutoSubmittingRef = useRef(false); // Ref to track auto-submit without closure issues
  const violationCountRef = useRef(0); // Ref to track violation count without closure issues

  const proctoring = assessment.proctoring || {
    preventTabSwitch: true,
    requireFullscreen: false,
    disableCopyPaste: true,
    warnOnTabSwitch: true,
    autoSubmitOnViolation: true, // Auto-submit after max violations
    maxViolationsAllowed: 4, // 4 violations then auto-submit
    enableWebcam: false,
    enableFaceDetection: false,
    logSuspiciousActivity: true,
  };

  const violationCount = violations.length;
  const maxViolations = proctoring.maxViolationsAllowed;

  // ─── Proctoring Functions ─────────────────────────────────────────────────

  const logActivity = useCallback((type: string, details: string) => {
    if (!proctoring.logSuspiciousActivity) return;
    
    const log: ActivityLog = {
      type,
      timestamp: new Date(),
      details,
    };
    
    setActivityLogs(prev => [...prev, log]);
    activityLogQueueRef.current.push(log);
    
    // Sync to backend every 30 seconds
    const now = new Date();
    if (now.getTime() - lastActivitySyncRef.current.getTime() > 30000) {
      syncActivityLogs();
      lastActivitySyncRef.current = now;
    }
  }, [proctoring.logSuspiciousActivity]);

  const syncActivityLogs = async () => {
    if (activityLogQueueRef.current.length === 0) return;
    
    try {
      // TODO: Send to backend API
      console.log('Syncing activity logs:', activityLogQueueRef.current);
      activityLogQueueRef.current = [];
    } catch (error) {
      console.error('Failed to sync activity logs:', error);
    }
  };

  const addViolation = useCallback((type: string, details: string) => {
    // Don't add more violations if auto-submit is already in progress (using ref to avoid closure issues)
    if (isAutoSubmittingRef.current) {
      console.log('🛑 Auto-submit in progress, ignoring violation');
      return;
    }
    
    // Check if we've already hit max violations (using ref for immediate check)
    if (violationCountRef.current >= maxViolations) {
      console.log('🛑 Max violations already reached, ignoring');
      return;
    }
    
    // Increment the ref counter immediately
    violationCountRef.current += 1;
    console.log(`⚠️ Violation #${violationCountRef.current} detected: ${type}`);
    
    const violation: Violation = {
      type,
      timestamp: new Date(),
      details,
    };
    
    // Update state
    setViolations(prev => [...prev, violation]);
    
    // Check if max violations reached
    if (violationCountRef.current >= maxViolations && proctoring.autoSubmitOnViolation) {
      console.log('🚨 Max violations reached, triggering auto-submit');
      isAutoSubmittingRef.current = true; // Lock further violations immediately
      setIsAutoSubmitting(true); // Update UI state
      setAutoSubmitCountdown(5);
    }
    
    logActivity(type, details);

    // Always show warning for violations
    if (violationCountRef.current < maxViolations) {
      setShowViolationWarning(true);
    }

    toast.error(`⚠️ VIOLATION ${violationCountRef.current}/${maxViolations}: ${details}`, {
      icon: <AlertTriangle className="w-5 h-5" />,
      duration: 5000,
    });
  }, [maxViolations, proctoring.autoSubmitOnViolation, logActivity]);

  // ─── Tab Switch Detection ─────────────────────────────────────────────────

  useEffect(() => {
    console.log('🔒 Tab Switch Detection - preventTabSwitch:', proctoring.preventTabSwitch, 'consentGiven:', consentGiven);
    if (!proctoring.preventTabSwitch || !consentGiven || isAutoSubmitting) return;

    const handleVisibilityChange = () => {
      console.log('👁️ Visibility changed - hidden:', document.hidden);
      if (document.hidden && !isAutoSubmitting) {
        console.log('🚨 TAB SWITCH DETECTED!');
        addViolation('tab_switch', 'Student switched to another tab');
      }
    };

    const handleBlur = () => {
      console.log('💨 Window blur detected');
      if (!isAutoSubmitting) {
        addViolation('focus_lost', 'Student left the assessment window');
        logActivity('focus_lost', 'Window lost focus');
      }
    };

    const handleFocus = () => {
      console.log('🎯 Window focus gained');
      logActivity('focus_gained', 'Window regained focus');
    };

    const handlePageHide = () => {
      console.log('🚪 Page hide - leaving assessment!');
      addViolation('page_leave', 'Student tried to leave the assessment');
    };

    const handlePageShow = () => {
      console.log('🏠 Page show - returned to assessment');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [proctoring.preventTabSwitch, consentGiven, isAutoSubmitting, addViolation, logActivity]);

  // ─── Fullscreen Detection ─────────────────────────────────────────────────

  useEffect(() => {
    if (!proctoring.requireFullscreen || !consentGiven) return;

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      if (!isNowFullscreen) {
        addViolation('fullscreen_exit', 'Student exited fullscreen mode');
        toast.warning('Please return to fullscreen mode', {
          duration: Infinity,
          action: {
            label: 'Enter Fullscreen',
            onClick: enterFullscreen,
          },
        });
      } else {
        logActivity('fullscreen_enter', 'Student entered fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [proctoring.requireFullscreen, consentGiven, addViolation, logActivity]);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      toast.error('Failed to enter fullscreen mode');
    }
  };

  // ─── Copy/Paste Prevention ────────────────────────────────────────────────

  useEffect(() => {
    if (!proctoring.disableCopyPaste || !consentGiven) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logActivity('copy_attempt', 'Student attempted to copy text');
      toast.error('Copy is disabled during this assessment');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('paste_attempt', 'Student attempted to paste text');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      logActivity('cut_attempt', 'Student attempted to cut text');
      toast.error('Cut is disabled during this assessment');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logActivity('right_click', 'Student right-clicked');
      toast.error('Right-click is disabled during this assessment');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent all Ctrl/Cmd combinations that could allow switching
      if (e.ctrlKey || e.metaKey) {
        const blockedKeys = ['c', 'v', 'x', 'a', 'p', 's', 'u', 'i', 'j', 'k', 'o', 'g', 't', 'w', 'n', 'l', 'h', 'e'];

        if (blockedKeys.includes(e.key.toLowerCase())) {
          // For copy/paste - prevent and log violation
          if (['c', 'v', 'x'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            addViolation('copy_paste_blocked', `Blocked: ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key.toUpperCase()}`);
          }
          // For others - just log
          logActivity('keyboard_shortcut_blocked', `Blocked: ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key.toUpperCase()}`);
          e.preventDefault();
        }

        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+K - DevTools
        if (e.shiftKey && ['I', 'J', 'K'].includes(e.key.toUpperCase())) {
          e.preventDefault();
          addViolation('devtools_attempt', 'Student attempted to open Developer Tools');
          toast.error('Developer tools are disabled during assessment!');
        }
      }

      // Prevent F12, Alt+Tab, Escape (exit fullscreen)
      if (e.key === 'F12' || e.key === 'Escape') {
        e.preventDefault();
        if (e.key === 'F12') {
          addViolation('devtools_attempt', 'Student pressed F12');
          toast.error('F12 is disabled during assessment!');
        }
        logActivity('blocked_key', `Blocked key: ${e.key}`);
      }

      // Prevent Alt+Tab switching
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        addViolation('alt_tab_attempt', 'Student attempted Alt+Tab');
        toast.error('Alt+Tab is disabled during assessment!');
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [proctoring.disableCopyPaste, consentGiven, addViolation, logActivity]);

  // ─── Webcam Monitoring ────────────────────────────────────────────────────

  const startWebcam = async () => {
    if (!proctoring.enableWebcam) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(stream);
      setIsRecording(true);
      logActivity('webcam_started', 'Webcam recording started');
      
      // TODO: Implement actual video recording with MediaRecorder
      // const mediaRecorder = new MediaRecorder(stream);
      // mediaRecorder.start();
      
    } catch (error) {
      console.error('Failed to access webcam:', error);
      toast.error('Failed to access webcam. Please grant permission.');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
      setIsRecording(false);
      logActivity('webcam_stopped', 'Webcam recording stopped');
    }
  };

  useEffect(() => {
    if (consentGiven && proctoring.enableWebcam) {
      startWebcam();
    }
    
    return () => {
      stopWebcam();
    };
  }, [consentGiven, proctoring.enableWebcam]);

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!consentGiven || assessment.timeLimit === 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit('Time expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [consentGiven, assessment.timeLimit]);

  // ─── Auto-Submit Countdown ────────────────────────────────────────────────

  useEffect(() => {
    if (autoSubmitCountdown === null) return;

    if (autoSubmitCountdown <= 0) {
      handleAutoSubmit('Maximum violations reached');
      return;
    }

    const timer = setTimeout(() => {
      setAutoSubmitCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoSubmitCountdown]);

  // ─── Submit Handlers ──────────────────────────────────────────────────────

  const handleAutoSubmit = async (reason: string) => {
    setIsSubmitting(true);
    
    await syncActivityLogs();
    
    const proctoringData = {
      violations,
      violationCount: violations.length,
      activityLogs,
      autoSubmitted: true,
      autoSubmitReason: reason,
      consentGiven,
      consentTimestamp: new Date(),
    };
    
    toast.info(`Assessment auto-submitted: ${reason}`);
    onSubmit(answers, proctoringData);
  };

  const handleManualSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    await syncActivityLogs();
    
    const proctoringData = {
      violations,
      violationCount: violations.length,
      activityLogs,
      autoSubmitted: false,
      autoSubmitReason: null,
      consentGiven,
      consentTimestamp: new Date(),
    };
    
    onSubmit(answers, proctoringData);
  };

  // ─── Consent Modal ────────────────────────────────────────────────────────

  const handleConsent = async () => {
    setConsentGiven(true);
    setShowConsentModal(false);
    
    if (proctoring.requireFullscreen) {
      await enterFullscreen();
    }
    
    logActivity('consent_given', 'Student gave consent to proctoring');
  };

  // ─── Answer Handlers ──────────────────────────────────────────────────────

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // ─── Format Time ──────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === assessment.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (showConsentModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Proctoring Consent Required</h2>
              <p className="text-sm text-gray-500">Please review and accept the terms below</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">This assessment uses the following proctoring features:</h3>
            <ul className="space-y-2">
              {proctoring.preventTabSwitch && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Tab Switch Detection:</strong> Switching tabs will be logged as a violation</span>
                </li>
              )}
              {proctoring.requireFullscreen && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Maximize2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Fullscreen Required:</strong> You must remain in fullscreen mode</span>
                </li>
              )}
              {proctoring.disableCopyPaste && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Lock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Copy/Paste Disabled:</strong> Copying and pasting is not allowed</span>
                </li>
              )}
              {proctoring.enableWebcam && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Camera className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Webcam Recording:</strong> Your webcam will record during the assessment</span>
                </li>
              )}
              {proctoring.logSuspiciousActivity && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Activity className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Activity Logging:</strong> All suspicious activities will be logged</span>
                </li>
              )}
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <Bell className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Maximum Violations: {maxViolations}</p>
              <p>
                {proctoring.autoSubmitOnViolation
                  ? `Your assessment will be automatically submitted after ${maxViolations} violations.`
                  : `You are allowed up to ${maxViolations} violations before action is taken.`}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onExit}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Decline & Exit
            </button>
            <button
              onClick={handleConsent}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              I Agree & Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-auto">
      {/* Preview Mode Banner (Trainer/Admin only) */}
      {isPreview && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5" />
            <div>
              <p className="font-semibold">Preview Mode - Trainer View</p>
              <p className="text-xs text-purple-100">Correct answers are highlighted in green</p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Exit Preview
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Exit Button for Students */}
            {!isPreview && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
                    onExit();
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
                <span className="text-sm font-medium">Exit</span>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {assessment.questions.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Violation Counter (Student only) */}
            {!isPreview && proctoring.preventTabSwitch && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${
                violationCount >= maxViolations
                  ? 'bg-red-600 text-white border-red-700' :
                violationCount >= maxViolations - 1
                  ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' :
                violationCount >= maxViolations * 0.5
                  ? 'bg-orange-100 text-orange-700 border-orange-300' :
                'bg-yellow-100 text-yellow-700 border-yellow-300'
              }`}>
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-bold">
                  {violationCount >= maxViolations
                    ? 'AUTO-SUBMITTING...'
                    : `${violationCount}/${maxViolations} Violations`
                  }
                </span>
                {violationCount >= maxViolations - 1 && (
                  <span className="text-xs font-semibold ml-1">
                    ({maxViolations - violationCount} left!)
                  </span>
                )}
              </div>
            )}
            
            {/* Recording Indicator (Student only) */}
            {!isPreview && isRecording && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-sm font-semibold">Recording</span>
              </div>
            )}
            
            {/* Timer */}
            {assessment.timeLimit > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="text-lg font-bold">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Warning Banner - Shows when violations occur */}
      {violationCount > 0 && !isPreview && (
        <div className={`sticky top-[73px] z-30 px-6 py-3 flex items-center justify-center gap-3 ${
          violationCount >= maxViolations - 1
            ? 'bg-red-600 text-white animate-pulse'
            : 'bg-orange-500 text-white'
        }`}>
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">
            {violationCount >= maxViolations - 1
              ? `⚠️ FINAL WARNING: ${maxViolations - violationCount} more violation(s) = AUTO SUBMIT!`
              : `Warning ${violationCount}/${maxViolations}: Tab switching is being monitored. Further violations will lead to auto-submit.`
            }
          </span>
        </div>
      )}

      {/* Auto-Submit Countdown */}
      {autoSubmitCountdown !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Maximum Violations Reached</h2>
            <p className="text-gray-600">
              Your assessment will be automatically submitted in:
            </p>
            <div className="text-6xl font-bold text-red-600">{autoSubmitCountdown}</div>
            <p className="text-sm text-gray-500">
              All your current answers will be saved.
            </p>
          </div>
        </div>
      )}

      {/* Violation Warning Modal */}
      {showViolationWarning && violationCount < maxViolations && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                violationCount >= maxViolations - 1 ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  violationCount >= maxViolations - 1 ? 'text-red-600' : 'text-orange-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Violation Detected</h3>
                <p className="text-sm text-gray-500">This has been logged</p>
              </div>
            </div>
            
            <div className={`border rounded-xl p-4 ${
              violationCount >= maxViolations - 1 
                ? 'bg-red-50 border-red-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <p className={`text-sm mb-2 ${
                violationCount >= maxViolations - 1 ? 'text-red-800' : 'text-orange-800'
              }`}>
                <strong>Violations: {violationCount} of {maxViolations}</strong>
              </p>
              {violationCount >= maxViolations - 1 ? (
                <p className="text-sm text-red-700 font-semibold">
                  ⚠️ FINAL WARNING! One more violation will auto-submit your assessment!
                </p>
              ) : (
                <p className="text-sm text-orange-700">
                  {proctoring.autoSubmitOnViolation
                    ? `If you reach ${maxViolations} violations, your assessment will be automatically submitted.`
                    : `Please avoid further violations.`}
                </p>
              )}
            </div>
            
            <button
              onClick={() => setShowViolationWarning(false)}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className={`bg-white rounded-2xl border border-gray-200 p-8 space-y-6 ${
          isAutoSubmitting ? 'opacity-50 pointer-events-none' : ''
        }`}>
          {/* Question */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Question {currentQuestionIndex + 1}
              </h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
              </span>
            </div>
            <div
              className="text-gray-800 text-lg leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }}
            />
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'mcq' && currentQuestion.options?.map((option, idx) => {
              const isCorrect = option.isCorrect;
              const isSelected = answers[currentQuestion.id] === idx;
              
              return (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                    isPreview && isCorrect
                      ? 'border-green-500 bg-green-50' // Show correct answer in preview
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!isPreview ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={isSelected}
                    onChange={() => !isPreview && handleAnswerChange(currentQuestion.id, idx)}
                    disabled={isPreview}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <span
                    className={`flex-1 ${isPreview && isCorrect ? 'font-semibold text-green-700' : 'text-gray-800'}`}
                    dangerouslySetInnerHTML={{ __html: option.text }}
                  />
                  {isPreview && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                </label>
              );
            })}
            
            {/* True / False */}
            {(currentQuestion.type === 'truefalse' || currentQuestion.type === 'tf') && (
              <div className="flex gap-4">
                {[
                  { label: 'True', value: true },
                  { label: 'False', value: false },
                ].map(({ label, value }) => {
                  const isSelected = answers[currentQuestion.id] === value;
                  const isCorrectOption = isPreview && currentQuestion.tfAnswer === value;
                  return (
                    <label
                      key={label}
                      className={`flex-1 flex items-center justify-center gap-3 p-5 border-2 rounded-xl transition-all text-lg font-semibold ${
                        isPreview && isCorrectOption
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      } ${!isPreview ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        checked={isSelected}
                        onChange={() => !isPreview && handleAnswerChange(currentQuestion.id, value)}
                        disabled={isPreview}
                        className="w-5 h-5 text-indigo-600"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'shortanswer' && (              <div>
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => !isPreview && handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder={isPreview ? "Sample answer area" : "Type your answer here..."}
                  disabled={isPreview}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] disabled:bg-gray-50"
                />
                {isPreview && currentQuestion.sampleAnswer && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 mb-1">Sample Answer:</p>
                    <p className="text-sm text-green-800">{currentQuestion.sampleAnswer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={isFirstQuestion}
            className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          {isLastQuestion ? (
            isPreview ? (
              <button
                onClick={onExit}
                className="flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                <X className="w-5 h-5" />
                Exit Preview
              </button>
            ) : (
              <button
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Assessment
                  </>
                )}
              </button>
            )
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-semibold text-gray-900">
              {currentQuestionIndex + 1} / {assessment.questions.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / assessment.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
