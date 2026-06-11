import { useState, useEffect, type ElementType } from 'react';
import {
  Award,
  Search,
  Filter,
  Download,
  Eye,
  XCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  Calendar,
  User,
  BookOpen,
  TrendingUp,
  FileText,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Bot
} from 'lucide-react';
import {
  getAllCertificates,
  revokeCertificate,
  reissueCertificate,
  getCertificateAnalytics,
  Certificate
} from '../../services/certificateService';
import { toast } from 'sonner';

interface Analytics {
  totalCertificates: number;
  validCertificates: number;
  revokedCertificates: number;
  totalVerifications: number;
  recentCertificates: number;
  certificatesByMonth: Array<{ month: string; count: number }>;
}

const PAGE_SIZE = 20;

type StatCardItem = {
  title: string;
  value: number;
  description: string;
  Icon: ElementType;
  tone: string;
  iconTone: string;
  accent: string;
};

function StatCard({ item }: { item: StatCardItem }) {
  const Icon = item.Icon;
  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${item.tone} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
      <div className="absolute inset-0 bg-white/45" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-8 ring-white/70 ${item.iconTone}`}>
            <Icon className="h-7 w-7" strokeWidth={2} />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-slate-950">{item.value}</p>
            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
            <p className="text-xs text-slate-500">{item.description}</p>
          </div>
        </div>
        <div className="flex h-12 items-end gap-1.5 opacity-60">
          <span className={`h-3 w-1.5 rounded-full ${item.accent}`} />
          <span className={`h-5 w-1.5 rounded-full ${item.accent}`} />
          <span className={`h-2 w-1.5 rounded-full ${item.accent}`} />
          <span className={`h-6 w-1.5 rounded-full ${item.accent}`} />
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: 'valid' | 'revoked' }) {
  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle className="h-3.5 w-3.5" />
        Valid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
      <XCircle className="h-3.5 w-3.5" />
      Revoked
    </span>
  );
}

function ActionButton({
  label,
  tone,
  onClick,
  disabled,
  children
}: {
  label: string;
  tone: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${tone} ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5 hover:shadow-sm'}`}
    >
      {children}
    </button>
  );
}

function AssistantButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 px-4 py-3 text-white shadow-xl shadow-indigo-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/20">
          <Bot className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-sm font-semibold">AI Assistant</span>
          <span className="block text-xs text-slate-300">Open chatbot</span>
        </span>
      </button>
    </div>
  );
}

export function CertificateManagement() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'revoked'>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certsResponse, analyticsResponse] = await Promise.all([
        getAllCertificates({
          status: statusFilter === 'all' ? undefined : statusFilter,
          page,
          limit: 20
        }),
        getCertificateAnalytics()
      ]);

      if (certsResponse.success) {
        setCertificates(certsResponse.data || []);
        if (certsResponse.pagination) {
          setTotalPages(certsResponse.pagination.pages);
        }
      }

      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedCertificate || !revokeReason.trim()) {
      toast.error('Please provide a reason for revocation');
      return;
    }

    try {
      setActionLoading(true);
      const response = await revokeCertificate(selectedCertificate.certificateId, revokeReason);
      
      if (response.success) {
        toast.success('Certificate revoked successfully');
        setShowRevokeModal(false);
        setRevokeReason('');
        setSelectedCertificate(null);
        fetchData();
      }
    } catch (error: any) {
      console.error('Error revoking certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to revoke certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReissue = async (certificateId: string) => {
    if (!confirm('Are you sure you want to reissue this certificate? This will create a new certificate.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await reissueCertificate(certificateId);
      
      if (response.success) {
        toast.success('Certificate reissued successfully');
        fetchData();
      }
    } catch (error: any) {
      console.error('Error reissuing certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to reissue certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.metadata.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.metadata.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const stats: StatCardItem[] = [
    {
      title: 'Total Certificates',
      value: analytics?.totalCertificates ?? 0,
      description: 'All certificates issued',
      Icon: Award,
      tone: 'from-violet-50 via-indigo-50 to-white',
      iconTone: 'bg-indigo-100 text-indigo-600',
      accent: 'bg-indigo-400',
    },
    {
      title: 'Valid',
      value: analytics?.validCertificates ?? 0,
      description: 'Currently valid certificates',
      Icon: CheckCircle,
      tone: 'from-emerald-50 via-green-50 to-white',
      iconTone: 'bg-emerald-100 text-emerald-600',
      accent: 'bg-emerald-400',
    },
    {
      title: 'Revoked',
      value: analytics?.revokedCertificates ?? 0,
      description: 'Revoked certificates',
      Icon: XCircle,
      tone: 'from-rose-50 via-red-50 to-white',
      iconTone: 'bg-rose-100 text-rose-600',
      accent: 'bg-rose-400',
    },
    {
      title: 'Verifications',
      value: analytics?.totalVerifications ?? 0,
      description: 'Total verifications',
      Icon: TrendingUp,
      tone: 'from-purple-50 via-fuchsia-50 to-white',
      iconTone: 'bg-purple-100 text-purple-600',
      accent: 'bg-purple-400',
    },
  ];

  const totalCount = analytics?.totalCertificates ?? filteredCertificates.length;
  const startCount = filteredCertificates.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endCount = filteredCertificates.length ? (page - 1) * PAGE_SIZE + filteredCertificates.length : 0;

  if (loading && !certificates.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 px-4 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute right-0 top-8 h-40 w-40 rounded-full bg-indigo-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 right-8 h-36 w-36 rounded-full bg-cyan-200/20 blur-3xl" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Certificate Management</h2>
          <p className="mt-1 text-sm text-slate-500">Manage and track all issued certificates</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by certificate ID, student name, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search certificates"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              title="Filters"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by status"
                className="h-12 appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="all">All Status</option>
                <option value="valid">Valid</option>
                <option value="revoked">Revoked</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-100"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Certificate ID
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Student
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Course
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Issue Date
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Verifications
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Award className="h-7 w-7" />
                    </div>
                    <p className="text-slate-600 font-medium">No certificates found</p>
                    <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((cert) => {
                  const initials = cert.metadata.studentName
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={cert._id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-slate-900">{cert.certificateId}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cert.certificateId);
                              toast.success('Certificate ID copied');
                            }}
                            className="rounded-md p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
                            title="Copy certificate ID"
                            aria-label="Copy certificate ID"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-xs font-semibold text-white shadow-sm ring-4 ring-indigo-50">
                            {initials || 'SS'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{cert.metadata.studentName}</p>
                            <p className="text-xs text-slate-500">{cert.metadata.studentEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700 max-w-xs truncate">{cert.metadata.courseName}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-500">
                          {new Date(cert.issueDate).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={cert.status} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-600">{cert.verificationCount}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <ActionButton
                            label="View details"
                            tone="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            onClick={() => setSelectedCertificate(cert)}
                          >
                            <Eye className="h-4 w-4" />
                          </ActionButton>
                          {cert.status === 'valid' ? (
                            <ActionButton
                              label="Revoke"
                              tone="bg-rose-50 text-rose-600 hover:bg-rose-100"
                              onClick={() => {
                                setSelectedCertificate(cert);
                                setShowRevokeModal(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </ActionButton>
                          ) : (
                            <ActionButton
                              label="Reissue"
                              tone="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              onClick={() => handleReissue(cert.certificateId)}
                              disabled={actionLoading}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </ActionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Showing {startCount} to {endCount} of {totalCount} certificates</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-40"
                aria-label="Previous page"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 text-sm font-semibold text-white shadow-sm">
                {page}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-40"
                aria-label="Next page"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      <AssistantButton />

      {/* Revoke Modal */}
      {showRevokeModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Revoke Certificate</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Certificate ID: <span className="font-mono font-semibold">{selectedCertificate.certificateId}</span>
              </p>
              <p className="text-sm text-gray-700">
                Student: <span className="font-semibold">{selectedCertificate.metadata.studentName}</span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Revocation *
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Enter the reason for revoking this certificate..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevokeReason('');
                  setSelectedCertificate(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={actionLoading || !revokeReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  'Revoke Certificate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedCertificate && !showRevokeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Certificate Details</h3>
              <button
                onClick={() => setSelectedCertificate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-center">
                {selectedCertificate.status === 'valid' ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Valid Certificate</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">Revoked Certificate</span>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Certificate ID</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">{selectedCertificate.certificateId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Student Name</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedCertificate.metadata.studentName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Student Email</p>
                  <p className="text-sm text-gray-700">{selectedCertificate.metadata.studentEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Course Name</p>
                  <p className="text-sm text-gray-900">{selectedCertificate.metadata.courseName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completion Date</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedCertificate.completionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Issue Date</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedCertificate.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verification Count</p>
                  <p className="text-sm text-gray-700">{selectedCertificate.verificationCount}</p>
                </div>
                {selectedCertificate.lastVerifiedAt && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Verified</p>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedCertificate.lastVerifiedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Revocation Info */}
              {selectedCertificate.status === 'revoked' && selectedCertificate.revokedAt && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-red-900 mb-2">Revocation Details</h4>
                  <div className="space-y-1 text-sm text-red-700">
                    <p>
                      <span className="font-medium">Revoked on:</span>{' '}
                      {new Date(selectedCertificate.revokedAt).toLocaleDateString()}
                    </p>
                    {selectedCertificate.revokedReason && (
                      <p>
                        <span className="font-medium">Reason:</span> {selectedCertificate.revokedReason}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* QR Code */}
              {selectedCertificate.qrCodeUrl && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">QR Code</p>
                  <img
                    src={`http://localhost:5000${selectedCertificate.qrCodeUrl}`}
                    alt="QR Code"
                    className="w-32 h-32 mx-auto"
                  />
                </div>
              )}

              {/* Verification URL */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verification URL</p>
                <p className="text-xs text-gray-700 break-all">
                  {window.location.origin}/verify/{selectedCertificate.verificationToken}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedCertificate(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
