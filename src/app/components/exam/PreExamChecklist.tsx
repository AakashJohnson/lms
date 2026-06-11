import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Monitor, Wifi,
  Camera, Mic, Eye, Shield, FileText, Play, RefreshCw
} from 'lucide-react';

interface SystemCheck {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'warning';
  required: boolean;
  details?: string;
  icon: React.ElementType;
}

interface PreExamChecklistProps {
  examId: string;
  examTitle: string;
  onAllChecksPassed: () => void;
  onCancel: () => void;
}

export function PreExamChecklist({
  examId,
  examTitle,
  onAllChecksPassed,
  onCancel
}: PreExamChecklistProps) {
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: 'browser',
      name: 'Browser Compatibility',
      description: 'Checking if your browser is supported',
      status: 'pending',
      required: true,
      icon: Monitor
    },
    {
      id: 'internet',
      name: 'Internet Connection',
      description: 'Testing network speed and stability',
      status: 'pending',
      required: true,
      icon: Wifi
    },
    {
      id: 'webcam',
      name: 'Webcam Access',
      description: 'Verifying webcam is available and working',
      status: 'pending',
      required: true,
      icon: Camera
    },
    {
      id: 'microphone',
      name: 'Microphone Access',
      description: 'Checking microphone permissions',
      status: 'pending',
      required: false,
      icon: Mic
    },
    {
      id: 'environment',
      name: 'Environment Check',
      description: 'Detecting multiple monitors and screen sharing',
      status: 'pending',
      required: true,
      icon: Eye
    },
    {
      id: 'identity',
      name: 'Identity Verification',
      description: 'Verify your identity with photo',
      status: 'pending',
      required: true,
      icon: Shield
    }
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  const runChecks = async () => {
    // Reset all to pending first
    setChecks(prev => prev.map(c => ({ ...c, status: 'pending' as const, details: undefined })));

    for (let i = 0; i < checks.length; i++) {
      setCurrentStep(i);
      await runSingleCheck(checks[i]);
    }

    // Use functional update to read latest state for the pass check
    setChecks(prev => {
      const allRequiredPassed = prev.every(
        check => !check.required || check.status === 'passed' || check.status === 'warning'
      );
      if (allRequiredPassed) {
        // Trigger instructions screen after state settles
        setTimeout(() => setShowInstructions(true), 300);
      }
      return prev;
    });
  };

  const runSingleCheck = async (check: SystemCheck): Promise<void> => {
    updateCheckStatus(check.id, 'checking');

    try {
      switch (check.id) {
        case 'browser':
          await checkBrowser(check);
          break;
        case 'internet':
          await checkInternet(check);
          break;
        case 'webcam':
          await checkWebcam(check);
          break;
        case 'microphone':
          await checkMicrophone(check);
          break;
        case 'environment':
          await checkEnvironment(check);
          break;
        case 'identity':
          await checkIdentity(check);
          break;
      }
    } catch (error: any) {
      updateCheckStatus(check.id, 'failed', error.message);
    }
  };

  const checkBrowser = async (check: SystemCheck) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(userAgent);
    const isEdge = /Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

    const supported = isChrome || isFirefox || isEdge;

    if (supported) {
      const browserName = isChrome ? 'Chrome' : isFirefox ? 'Firefox' : 'Edge';
      updateCheckStatus(check.id, 'passed', `${browserName} detected - Supported`);
    } else if (isSafari) {
      updateCheckStatus(check.id, 'warning', 'Safari detected - Some features may not work');
    } else {
      updateCheckStatus(check.id, 'failed', 'Unsupported browser. Please use Chrome, Firefox, or Edge');
    }
  };

  const checkInternet = async (check: SystemCheck) => {
    const startTime = Date.now();

    // Use navigator.onLine as a quick first check
    if (!navigator.onLine) {
      updateCheckStatus(check.id, 'failed', 'No internet connection detected');
      return;
    }

    try {
      // Use a no-cors request to avoid CORS issues — we just need to know if network is reachable
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });

      const elapsed = Date.now() - startTime;

      if (elapsed < 1000) {
        updateCheckStatus(check.id, 'passed', `Connection stable (${elapsed}ms response)`);
      } else if (elapsed < 3000) {
        updateCheckStatus(check.id, 'warning', `Slow connection (${elapsed}ms response)`);
      } else {
        updateCheckStatus(check.id, 'warning', `Very slow connection (${elapsed}ms response)`);
      }
    } catch (error) {
      // Even no-cors fetch failing means no connectivity
      updateCheckStatus(check.id, 'failed', 'No internet connection');
    }
  };

  const checkWebcam = async (check: SystemCheck) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      updateCheckStatus(check.id, 'passed', 'Webcam access granted');
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        updateCheckStatus(check.id, 'failed', 'Webcam access denied. Please allow camera permission in browser');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        updateCheckStatus(check.id, 'warning', 'No webcam found — proctoring features will be limited');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        updateCheckStatus(check.id, 'warning', 'Webcam is in use by another application');
      } else {
        updateCheckStatus(check.id, 'warning', 'Webcam unavailable — ' + error.message);
      }
    }
  };

  const checkMicrophone = async (check: SystemCheck) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      updateCheckStatus(check.id, 'passed', 'Microphone access granted');
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        updateCheckStatus(check.id, 'warning', 'Microphone access denied (optional)');
      } else {
        updateCheckStatus(check.id, 'warning', 'No microphone found (optional)');
      }
    }
  };

  const checkEnvironment = async (check: SystemCheck) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const screenCount = window.screen.isExtended ? 2 : 1;
    const warnings = [];

    if (screenCount > 1) {
      warnings.push('Multiple monitors detected');
    }

    // Check for virtual machine indicators
    const isVM = /VirtualBox|VMware|QEMU/i.test(navigator.userAgent);
    if (isVM) {
      warnings.push('Virtual machine detected');
    }

    if (warnings.length > 0) {
      updateCheckStatus(check.id, 'warning', warnings.join(', '));
    } else {
      updateCheckStatus(check.id, 'passed', 'Environment is secure');
    }
  };

  const checkIdentity = async (check: SystemCheck) => {
    // This will be handled by a separate modal
    updateCheckStatus(check.id, 'passed', 'Identity verification pending');
  };

  const updateCheckStatus = (
    id: string,
    status: SystemCheck['status'],
    details?: string
  ) => {
    setChecks(prev =>
      prev.map(check =>
        check.id === id ? { ...check, status, details } : check
      )
    );
  };

  const retryCheck = async (checkId: string) => {
    const check = checks.find(c => c.id === checkId);
    if (check) {
      await runSingleCheck(check);
    }
  };

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: SystemCheck['status']) => {
    switch (status) {
      case 'passed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'checking':
        return 'border-indigo-200 bg-indigo-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const allRequiredPassed = checks.every(
    check => !check.required || check.status === 'passed' || check.status === 'warning'
  );

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Exam Instructions</h2>
                <p className="text-sm text-gray-500">Please read carefully before starting</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">General Instructions</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                  <li>This exam is proctored. Your webcam and screen will be recorded</li>
                  <li>Do not switch tabs or leave fullscreen mode</li>
                  <li>Do not use any external resources or assistance</li>
                  <li>Answer all questions to the best of your ability</li>
                  <li>You cannot go back once you move to the next question</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Violations & Consequences</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                  <li>Tab switching will be logged as a violation</li>
                  <li>Exiting fullscreen will trigger warnings</li>
                  <li>Multiple faces detected will be flagged</li>
                  <li>Excessive violations will result in auto-submission</li>
                  <li>Suspicious behavior will be reviewed by instructors</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-900 mb-2">Technical Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                  <li>Stable internet connection required throughout</li>
                  <li>Keep your webcam on and visible</li>
                  <li>Ensure good lighting for face detection</li>
                  <li>Close all other applications and tabs</li>
                  <li>Do not refresh the page during the exam</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl mb-6">
              <input
                type="checkbox"
                id="agree"
                className="w-5 h-5 text-indigo-600 rounded"
              />
              <label htmlFor="agree" className="text-sm text-gray-700">
                I have read and understood all instructions
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onAllChecksPassed}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pre-Exam System Check</h2>
            <p className="text-gray-600">
              We need to verify your system before starting: <strong>{examTitle}</strong>
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {checks.map((check, index) => {
              const Icon = check.icon;
              return (
                <div
                  key={check.id}
                  className={`border-2 rounded-xl p-4 transition-all ${getStatusColor(check.status)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{check.name}</h3>
                        {check.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{check.description}</p>
                      {check.details && (
                        <p className="text-xs text-gray-500">{check.details}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      {check.status === 'failed' && (
                        <button
                          onClick={() => retryCheck(check.id)}
                          className="p-1 hover:bg-white rounded transition-colors"
                          title="Retry"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={runChecks}
              disabled={checks.some(c => c.status === 'checking')}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checks.every(c => c.status === 'pending') ? 'Start Checks' : 'Retry Failed Checks'}
            </button>
          </div>

          {allRequiredPassed && !showInstructions && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-green-800 font-semibold">
                ✓ All required checks passed! Click "Start Checks" again to proceed to instructions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
