import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Share2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Certificate, downloadCertificate, getMyCertificates, shareCertificate } from '../services/certificateService';
import { PremiumCard, PremiumHero, PremiumPageShell, PremiumStatCard } from './premium/PremiumPage';

interface CertificatesProps {
  userRole: 'admin' | 'trainer' | 'participant' | 'student';
}

export function Certificates({ userRole }: CertificatesProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await getMyCertificates();
      setCertificates(response.data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificateId: string) => {
    try {
      setDownloading(certificateId);
      await downloadCertificate(certificateId);
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async (certificateId: string) => {
    try {
      const response = await shareCertificate(certificateId);
      await navigator.clipboard.writeText(response.data.shareUrl);
      toast.success('Verification link copied to clipboard');
    } catch (error) {
      console.error('Error sharing certificate:', error);
      toast.error('Failed to get share link');
    }
  };

  if (loading) {
    return (
      <PremiumPageShell>
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-indigo-600" />
            <p className="font-semibold text-slate-600">Loading certificates...</p>
          </div>
        </div>
      </PremiumPageShell>
    );
  }

  if (selectedCertificate) {
    return (
      <CertificateViewer
        certificate={selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
        onDownload={handleDownload}
        onShare={handleShare}
        downloading={downloading}
      />
    );
  }

  const validCount = certificates.filter((certificate) => certificate.status === 'valid').length;

  return (
    <PremiumPageShell>
      <PremiumHero
        title={userRole === 'participant' || userRole === 'student' ? 'My Certificates' : 'Certificates'}
        subtitle="View, verify, download, and share your official CEAS-LMS learning credentials."
        eyebrow="Verified learning credentials"
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard label="Certificates" value={certificates.length} detail="Total earned" icon={Award} tone="from-indigo-50 via-blue-50 to-white" accent="text-indigo-600" />
        <PremiumStatCard label="Valid" value={validCount} detail="Verification ready" icon={CheckCircle} tone="from-emerald-50 via-teal-50 to-white" accent="text-emerald-600" />
        <PremiumStatCard label="Shareable" value="QR" detail="Secure proof links" icon={Share2} tone="from-violet-50 via-purple-50 to-white" accent="text-violet-600" />
        <PremiumStatCard label="Exports" value="PDF" detail="Download anytime" icon={Download} tone="from-pink-50 via-rose-50 to-white" accent="text-pink-600" />
      </div>

      {certificates.length === 0 ? (
        <PremiumCard className="flex min-h-[360px] flex-col items-center justify-center border-dashed border-indigo-200 p-12 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-indigo-50 text-indigo-600">
            <Award className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-black text-slate-950">No Certificates Yet</h3>
          <p className="mt-2 max-w-md text-sm font-medium text-slate-500">Complete courses to earn verified certificates and download official proof of completion.</p>
        </PremiumCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <article
              key={certificate._id}
              className="group overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(79,70,229,.12)]"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/12 blur-2xl" />
                <Award className="absolute bottom-0 right-4 h-28 w-28 opacity-15" />
                <div className="relative mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16 backdrop-blur">
                    <Award className="h-7 w-7" />
                  </div>
                  {certificate.status === 'valid' ? <CheckCircle className="h-6 w-6 text-green-200" /> : <XCircle className="h-6 w-6 text-red-200" />}
                </div>
                <h3 className="relative text-lg font-black">Certificate of Completion</h3>
                <p className="relative mt-1 text-sm font-medium text-indigo-100">ID: {certificate.certificateId}</p>
              </div>

              <div className="p-6">
                <h4 className="mb-3 line-clamp-2 text-base font-black text-slate-950">{certificate.course.title}</h4>
                <div className="mb-4 space-y-2 text-sm font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <span>Completed: {new Date(certificate.completionDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-500" />
                    <span>Issued: {new Date(certificate.issueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mb-5">
                  {certificate.status === 'valid' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      <CheckCircle className="h-3 w-3" />
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                      <XCircle className="h-3 w-3" />
                      Revoked
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedCertificate(certificate)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg">
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <button onClick={() => handleDownload(certificate.certificateId)} disabled={downloading === certificate.certificateId} className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50" aria-label="Download certificate">
                    {downloading === certificate.certificateId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleShare(certificate.certificateId)} className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200" aria-label="Share certificate">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PremiumPageShell>
  );
}

function CertificateViewer({
  certificate,
  onClose,
  onDownload,
  onShare,
  downloading,
}: {
  certificate: Certificate;
  onClose: () => void;
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
  downloading: string | null;
}) {
  const verificationUrl = `${window.location.origin}/verify/${certificate.verificationToken}`;

  return (
    <PremiumPageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={onClose} className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Certificates
        </button>
        <div className="flex gap-3">
          <button onClick={() => onDownload(certificate.certificateId)} disabled={downloading === certificate.certificateId} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50">
            {downloading === certificate.certificateId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          <button onClick={() => onShare(certificate.certificateId)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      <PremiumCard className="p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/35 to-sky-50/40 p-8 text-center">
            <Sparkles className="absolute left-6 top-6 h-20 w-20 text-indigo-100" />
            <div className="relative mb-8 flex items-center justify-center gap-3">
              <Award className="h-12 w-12 text-indigo-600" />
              <h1 className="text-4xl font-black tracking-tight text-slate-950">CERTIFICATE</h1>
            </div>
            <h2 className="text-2xl font-bold text-slate-700">OF COMPLETION</h2>
            <div className="py-8">
              <p className="mb-4 text-slate-600">This is to certify that</p>
              <h3 className="mb-4 text-3xl font-black text-slate-950">{certificate.metadata.studentName}</h3>
              <p className="mb-4 text-slate-600">has successfully completed the course</p>
              <h4 className="text-2xl font-black text-indigo-600">{certificate.course.title}</h4>
            </div>
            <div className="flex flex-col justify-center gap-6 text-sm font-medium text-slate-600 sm:flex-row sm:gap-12">
              <div>
                <p className="font-bold text-slate-900">Completion Date</p>
                <p>{new Date(certificate.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Certificate ID</p>
                <p className="font-mono">{certificate.certificateId}</p>
              </div>
            </div>
            {certificate.qrCodeUrl && (
              <div className="mt-8 flex justify-center">
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <img src={`http://localhost:5000${certificate.qrCodeUrl}`} alt="Certificate QR code" className="mx-auto h-32 w-32" />
                  <p className="mt-2 text-xs font-semibold text-slate-500">Scan to verify</p>
                </div>
              </div>
            )}
            <div className="mt-8 rounded-2xl bg-white/75 p-4">
              <p className="mb-2 text-sm font-bold text-slate-600">Verification URL</p>
              <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 break-all text-sm font-bold text-indigo-600 hover:text-indigo-700">
                {verificationUrl}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-6">
              {certificate.status === 'valid' ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 font-bold text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  This certificate is valid
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 font-bold text-red-700">
                  <XCircle className="h-5 w-5" />
                  This certificate has been revoked
                </div>
              )}
            </div>
          </div>
        </div>
      </PremiumCard>
    </PremiumPageShell>
  );
}
