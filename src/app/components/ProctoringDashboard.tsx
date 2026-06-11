import { useState, useEffect } from 'react';
import {
  Shield, AlertTriangle, Eye, Clock, User, FileText,
  ChevronDown, ChevronUp, Activity, Camera, X, CheckCircle2,
  Filter, Search, Download, Calendar
} from 'lucide-react';
import { getFlaggedAttempts, getProctoringData } from '../services/proctoringService';
import { toast } from 'sonner';

interface FlaggedAttempt {
  _id: string;
  student: { name: string; email: string };
  assessment: { title: string };
  violationCount: number;
  autoSubmitted: boolean;
  submittedAt: string;
  score: { percentage: number; obtained: number; total: number };
}

interface ProctoringDetail {
  violations: Array<{ type: string; timestamp: string; details: string }>;
  activityLogs: Array<{ type: string; timestamp: string; details: string }>;
  violationCount: number;
  autoSubmitted: boolean;
  autoSubmitReason?: string;
  consentGiven: boolean;
  webcamRecordingUrl?: string;
}

export function ProctoringDashboard() {
  const [flaggedAttempts, setFlaggedAttempts] = useState<FlaggedAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [proctoringDetail, setProctoringDetail] = useState<ProctoringDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high' | 'auto-submitted'>('all');
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

  useEffect(() => {
    loadFlaggedAttempts();
  }, []);

  const loadFlaggedAttempts = async () => {
    setIsLoading(true);
    try {
      const response = await getFlaggedAttempts();
      if (response.success) {
        setFlaggedAttempts(response.data);
      } else {
        toast.error('Failed to load flagged attempts');
      }
    } catch (error) {
      console.error('Error loading flagged attempts:', error);
      toast.error('Failed to load flagged attempts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProctoringDetail = async (attemptId: string) => {
    try {
      const response = await getProctoringData(attemptId);
      if (response.success) {
        setProctoringDetail(response.data.proctoring);
        setSelectedAttempt(attemptId);
      } else {
        toast.error('Failed to load proctoring details');
      }
    } catch (error) {
      console.error('Error loading proctoring details:', error);
      toast.error('Failed to load proctoring details');
    }
  };

  const filteredAttempts = flaggedAttempts.filter(attempt => {
    const matchesSearch = 
      attempt.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attempt.student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attempt.assessment.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'high' && attempt.violationCount >= 3) ||
      (filterType === 'auto-submitted' && attempt.autoSubmitted);
    
    return matchesSearch && matchesFilter;
  });

  const getViolationSeverity = (count: number) => {
    if (count >= 5) return { color: 'red', label: 'Critical' };
    if (count >= 3) return { color: 'orange', label: 'High' };
    if (count >= 1) return { color: 'yellow', label: 'Medium' };
    return { color: 'green', label: 'Low' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Email', 'Assessment', 'Violations', 'Auto-Submitted', 'Score', 'Submitted At'];
    const rows = filteredAttempts.map(attempt => [
      attempt.student.name,
      attempt.student.email,
      attempt.assessment.title,
      attempt.violationCount,
      attempt.autoSubmitted ? 'Yes' : 'No',
      `${attempt.score.percentage}%`,
      formatDate(attempt.submittedAt),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proctoring-violations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Proctoring Dashboard</h1>
                <p className="text-sm text-gray-500">Monitor and review flagged assessment attempts</p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{flaggedAttempts.length}</p>
                <p className="text-xs text-gray-500">Flagged Attempts</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {flaggedAttempts.filter(a => a.violationCount >= 3).length}
                </p>
                <p className="text-xs text-gray-500">High Violations</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {flaggedAttempts.filter(a => a.autoSubmitted).length}
                </p>
                <p className="text-xs text-gray-500">Auto-Submitted</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(flaggedAttempts.map(a => a.student.email)).size}
                </p>
                <p className="text-xs text-gray-500">Unique Students</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, email, or assessment..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Attempts</option>
                <option value="high">High Violations (3+)</option>
                <option value="auto-submitted">Auto-Submitted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Attempts List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Assessment</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Violations</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Score</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Submitted</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Loading flagged attempts...
                    </td>
                  </tr>
                ) : filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="font-medium">No flagged attempts found</p>
                      <p className="text-sm">All assessments were completed without violations</p>
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((attempt) => {
                    const severity = getViolationSeverity(attempt.violationCount);
                    const isExpanded = expandedAttempt === attempt._id;
                    
                    return (
                      <tr key={attempt._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{attempt.student.name}</p>
                            <p className="text-xs text-gray-500">{attempt.student.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">{attempt.assessment.title}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-${severity.color}-100 text-${severity.color}-700`}>
                            <AlertTriangle className="w-3 h-3" />
                            {attempt.violationCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {attempt.autoSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              <Clock className="w-3 h-3" />
                              Auto-Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-gray-900">{attempt.score.percentage.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">{formatDate(attempt.submittedAt)}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedAttempt(null);
                              } else {
                                setExpandedAttempt(attempt._id);
                                loadProctoringDetail(attempt._id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            {isExpanded ? 'Hide' : 'View'} Details
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {expandedAttempt && proctoringDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Proctoring Details</h2>
                    <p className="text-sm text-gray-500">
                      {proctoringDetail.violationCount} violations · {proctoringDetail.activityLogs.length} activities logged
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setExpandedAttempt(null);
                    setProctoringDetail(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Violations */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Violations ({proctoringDetail.violations.length})
                  </h3>
                  <div className="space-y-2">
                    {proctoringDetail.violations.map((violation, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-red-600">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{violation.type.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{violation.details}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(violation.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Logs */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Activity Logs ({proctoringDetail.activityLogs.length})
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {proctoringDetail.activityLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-xs">
                        <span className="text-gray-400">{formatDate(log.timestamp)}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                          {log.type.replace('_', ' ')}
                        </span>
                        <span className="text-gray-600">{log.details}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webcam Recording */}
                {proctoringDetail.webcamRecordingUrl && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-purple-600" />
                      Webcam Recording
                    </h3>
                    <a
                      href={proctoringDetail.webcamRecordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Recording
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
