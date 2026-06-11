import { useEffect } from 'react';
import { X, Download, FileText, File } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  url: string;
  downloadUrl: string;
  type: string;
  mimeType?: string;
  fileSize?: number;
  originalName?: string;
  extension?: string;
}

interface ResourcePreviewModalProps {
  resource: Resource;
  onClose: () => void;
}

const formatBytes = (bytes?: number, decimals = 2) => {
  if (!bytes) return '';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export function ResourcePreviewModal({ resource, onClose }: ResourcePreviewModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const renderPreview = () => {
    const type = resource.type;
    const url = resource.url;

    if (type === 'image') {
      return (
        <div className="flex items-center justify-center w-full h-full bg-slate-900/40 rounded-xl overflow-hidden p-2">
          <img
            src={url}
            alt={resource.title}
            className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          />
        </div>
      );
    }

    if (type === 'pdf') {
      return (
        <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full"
            title={resource.title}
          />
        </div>
      );
    }

    if (type === 'video') {
      return (
        <div className="flex items-center justify-center w-full bg-black rounded-xl overflow-hidden shadow-2xl">
          <video
            src={url}
            controls
            autoPlay
            className="w-full max-h-[65vh] object-contain"
          />
        </div>
      );
    }

    if (type === 'audio') {
      return (
        <div className="flex flex-col items-center justify-center w-full h-44 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6 shadow-inner">
          <div className="mb-4 text-indigo-600">
            <MusicIcon />
          </div>
          <audio
            src={url}
            controls
            autoPlay
            className="w-full max-w-md h-10 rounded-lg shadow-sm"
          />
        </div>
      );
    }

    // Default fallback for other/unsupported documents
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-xl">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg text-white mb-4">
          <File className="w-8 h-8" />
        </div>
        <h4 className="font-bold text-slate-800 text-lg mb-1">{resource.originalName || resource.title}</h4>
        <p className="text-sm text-slate-500 mb-6">
          This file format ({resource.extension || 'document'}) does not support inline preview.
        </p>
        <a
          href={resource.downloadUrl}
          download
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <Download className="w-4 h-4" />
          Download File
        </a>
      </div>
    );
  };

  const fileSizeString = formatBytes(resource.fileSize);

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-slate-900 font-extrabold text-lg truncate leading-tight">
              {resource.title}
            </h3>
            {fileSizeString && (
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {resource.type.toUpperCase()} • {fileSizeString}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={resource.downloadUrl}
              download
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all hover:scale-105"
              title="Download resource"
              aria-label="Download resource"
            >
              <Download className="w-4 h-4" />
            </a>
            
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 text-slate-700 shadow-sm transition-all hover:scale-105"
              title="Close preview"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 flex flex-col justify-center min-h-[300px]">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}

function MusicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-12 h-12"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9l10.5-3m0 0v13.5m0-13.5L9 10.5m0 0v13.5m0-13.5L3 12m0 0v7.5m0-7.5l6-1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
