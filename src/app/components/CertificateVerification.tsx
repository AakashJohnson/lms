import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Award,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  BookOpen,
  Building2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Shield,
  Eye
} from 'lucide-react';
import { verifyCertificate, CertificateVerification as CertificateVerificationData } from '../services/certificateService';

export function CertificateVerification() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<CertificateVerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setError('No verification token provided');
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await verifyCertificate(verificationToken);
      
      if (response.success && response.data) {
        setVerification(response.data);
      } else {
        setError('Certificate not found or invalid');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.response?.data?.message || 'Failed to verify certificate');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error || 'Certificate could not be verified'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const isValid = verification.verified && verification.status === 'valid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <Shield className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Certificate Verification</h1>
          <p className="text-gray-600">Verify the authenticity of this certificate</p>
        </div>

        {/* Verification Status Card */}
        <div className={`bg-white rounded-2xl shadow-xl overflow-hidden mb-6 border-4 ${
          isValid ? 'border-green-500' : 'border-red-500'
        }`}>
          {/* Status Banner */}
          <div className={`p-6 ${
            isValid 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-orange-600'
          } text-white`}>
            <div className="flex items-center justify-center gap-3">
              {isValid ? (
                <>
                  <CheckCircle className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Certificate Verified</h2>
                    <p className="text-green-100">This certificate is authentic and valid</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Certificate Revoked</h2>
                    <p className="text-red-100">This certificate has been revoked and is no longer valid</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Certificate Details */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Student Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-indigo-600" />
                  Student Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
                    <p className="text-base font-semibold text-gray-900">{verification.studentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email Address</p>
                    <p className="text-sm text-gray-700">{verification.studentEmail}</p>
                  </div>
                </div>
              </div>

              {/* Course Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Course Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Course Name</p>
                    <p className="text-base font-semibold text-gray-900">{verification.courseName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completion Date</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(verification.completionDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Certificate Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Certificate ID</p>
                    <p className="text-sm font-mono text-gray-900 bg-gray-100 px-3 py-2 rounded">
                      {verification.certificateId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Issue Date</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(verification.issueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Organization Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Issued By
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Organization</p>
                    <p className="text-base font-semibold text-gray-900">{verification.organizationName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verification Count</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Verified {verification.verificationCount} time{verification.verificationCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revocation Information */}
            {!isValid && verification.revokedAt && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Revocation Details</h4>
                <div className="space-y-1 text-sm text-red-700">
                  <p>
                    <span className="font-medium">Revoked on:</span>{' '}
                    {new Date(verification.revokedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {verification.revokedReason && (
                    <p>
                      <span className="font-medium">Reason:</span> {verification.revokedReason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Last Verified */}
            {verification.lastVerifiedAt && (
              <div className="mt-6 text-center text-xs text-gray-500">
                Last verified: {new Date(verification.lastVerifiedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            How to Verify Authenticity
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Secure Verification</h4>
              <p className="text-xs text-gray-600">
                Each certificate has a unique encrypted token that cannot be duplicated
              </p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Real-Time Check</h4>
              <p className="text-xs text-gray-600">
                Verification is performed in real-time against our secure database
              </p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Official Record</h4>
              <p className="text-xs text-gray-600">
                All certificates are officially issued and tracked by the organization
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            This verification page is publicly accessible and can be shared
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Visit Platform
          </button>
        </div>
      </div>
    </div>
  );
}
