import { useRef, useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, FileText, Image as ImageIcon, 
  Video, Music, Download, File, Eye, ExternalLink, Library
} from 'lucide-react';
import { ResourcePreviewModal } from './ResourcePreviewModal';

interface Resource {
  id: string;
  title: string;
  url: string;
  downloadUrl: string;
  type: string;
  resourceType?: string;
  assetType?: string;
  kind?: string;
  link?: string;
  href?: string;
  value?: string;
  mimeType?: string;
  fileSize?: number;
  originalName?: string;
  extension?: string;
}

interface LessonResourcesSliderProps {
  resources: Resource[];
}

export function LessonResourcesSlider({ resources }: LessonResourcesSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Check if horizontal scrolling is possible to toggle arrows
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setShowLeftArrow(el.scrollLeft > 5);
      setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [resources]);

  if (!resources || resources.length === 0) return null;

  const normalizeUrl = (url?: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const getResourceType = (resource: Resource) =>
    String(
      resource?.type ||
      resource?.resourceType ||
      resource?.assetType ||
      resource?.kind ||
      ''
    ).toLowerCase();

  const isLinkResource = (resource: Resource) => {
    const type = getResourceType(resource);
    return type === 'link' || type === 'url';
  };

  const isImageResource = (resource: Resource) => {
    const type = getResourceType(resource);
    return type === 'image' || type === 'img';
  };

  const getResourceBadge = (resource: Resource) => {
    if (isImageResource(resource)) return 'IMG';
    if (isLinkResource(resource)) return 'LINK';
    return resource.extension || resource.type;
  };

  const handleResourceClick = (resource: Resource) => {
    if (isLinkResource(resource)) {
      const rawUrl = resource.url || resource.link || resource.href || resource.value;
      const finalUrl = normalizeUrl(rawUrl);

      if (!finalUrl) {
        console.warn('Link resource has no valid URL:', resource);
        return;
      }

      window.open(finalUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setSelectedResource(resource);
  };

  const handleResourceKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, resource: Resource) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleResourceClick(resource);
    }
  };

  const scrollLeft = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollBy({ left: -300, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  const scrollRight = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollBy({ left: 300, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  const getIcon = (type: string) => {
    switch (String(type || '').toLowerCase()) {
      case 'link':
      case 'url':
        return <ExternalLink className="w-6 h-6 text-sky-500" />;
      case 'image':
        return <ImageIcon className="w-6 h-6 text-purple-500" />;
      case 'video':
        return <Video className="w-6 h-6 text-indigo-500" />;
      case 'audio':
        return <Music className="w-6 h-6 text-emerald-500" />;
      case 'pdf':
        return <FileText className="w-6 h-6 text-rose-500" />;
      default:
        return <File className="w-6 h-6 text-slate-500" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (String(type || '').toLowerCase()) {
      case 'link':
      case 'url':
        return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'image':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'video':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'audio':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pdf':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-lg relative group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-slate-900 font-extrabold text-sm flex items-center gap-1.5">
            <Library className="w-4 h-4 text-indigo-600" />
            Lesson Resources
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Download or preview supporting materials for this lesson.
          </p>
        </div>
        {resources.length > 1 && (
          <button
            onClick={() => setShowAllModal(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            View all ({resources.length})
          </button>
        )}
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Scroll Button */}
        {showLeftArrow && (
          <button
            onClick={scrollLeft}
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 transition-all hover:scale-105"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {/* Right Scroll Button */}
        {showRightArrow && (
          <button
            onClick={scrollRight}
            className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 transition-all hover:scale-105"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {/* Scroll Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-none pb-2 scroll-smooth touch-pan-x"
        >
          {resources.map((res) => (
            <div
              key={res.id}
              onClick={() => handleResourceClick(res)}
              onKeyDown={(event) => handleResourceKeyDown(event, res)}
              role="button"
              tabIndex={0}
              className="w-44 h-36 flex-shrink-0 cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:shadow-lg transition-all hover:border-indigo-500 hover:ring-4 hover:ring-indigo-50 flex flex-col justify-between group/card relative overflow-hidden"
            >
              {/* Card content top: Icon and Thumbnail */}
              <div className="flex-1 flex flex-col min-w-0">
                {isImageResource(res) ? (
                  <div className="relative w-full h-16 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-100 flex items-center justify-center">
                    <img
                      src={res.url}
                      alt={res.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-16 rounded-lg bg-slate-50 border border-slate-100 mb-2 flex items-center justify-center group-hover/card:bg-indigo-50/30 transition-colors">
                    {getIcon(res.type)}
                  </div>
                )}

                {/* Card content bottom: Title */}
                <h4 className="text-slate-800 text-xs font-bold truncate leading-tight group-hover/card:text-indigo-600 transition-colors">
                  {res.title}
                </h4>
              </div>

              {/* Card Footer: extension/type badge */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60 text-[10px]">
                <span className={`px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${getBadgeColor(res.type)}`}>
                  {getResourceBadge(res)}
                </span>
                <span className="text-slate-400 group-hover/card:text-indigo-500 transition-colors">
                  {isLinkResource(res) ? <ExternalLink className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox / Modal Preview */}
      {selectedResource && (
        <ResourcePreviewModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

      {/* View All Resources Modal */}
      {showAllModal && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-slate-900 font-extrabold text-lg">All Lesson Resources</h3>
                <p className="text-xs text-slate-500 mt-0.5">List of all available materials for this lesson</p>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 transition-colors text-slate-700 shadow-sm"
              >
                <XIcon />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/50">
              {resources.map((res) => (
                <div
                  key={res.id}
                  onClick={() => {
                    handleResourceClick(res);
                    setShowAllModal(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleResourceClick(res);
                      setShowAllModal(false);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 hover:shadow-lg transition-all hover:border-indigo-500 hover:ring-4 hover:ring-indigo-50 flex flex-col justify-between group/card overflow-hidden"
                >
                  <div className="flex-1 flex flex-col min-w-0">
                    {isImageResource(res) ? (
                      <div className="relative w-full h-16 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-100 flex items-center justify-center">
                        <img
                          src={res.url}
                          alt={res.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-16 rounded-lg bg-slate-50 border border-slate-100 mb-2 flex items-center justify-center">
                        {getIcon(res.type)}
                      </div>
                    )}
                    <h4 className="text-slate-800 text-xs font-bold truncate leading-tight group-hover/card:text-indigo-600 transition-colors">
                      {res.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/60 text-[10px]">
                    <span className={`px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${getBadgeColor(res.type)}`}>
                      {getResourceBadge(res)}
                    </span>
                    {isLinkResource(res) ? (
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
