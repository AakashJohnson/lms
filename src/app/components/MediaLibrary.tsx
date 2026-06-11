import { Play, Download, Eye, Clock, Filter, Loader2, Search, Upload, Video, Headphones, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { UploadContent } from './media/UploadContent';
import { getMediaLibrary, MediaItem } from '../services/mediaService';
import { toast } from 'sonner';
import { PremiumCard, PremiumHero, PremiumPageShell, PremiumStatCard } from './premium/PremiumPage';

interface MediaLibraryProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

export function MediaLibrary({ userRole }: MediaLibraryProps) {
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Load media from API on mount
  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const filters: any = { limit: 100 };
      const response = await getMediaLibrary(filters);
      setMediaItems(response.data || []);
    } catch (error: any) {
      console.error('Error loading media:', error);
      toast.error(error.response?.data?.message || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  const stats = {
    totalVideos: mediaItems.filter(m => (m as any).mediaType === 'video' || m.type === 'video').length,
    totalAudio: mediaItems.filter(m => (m as any).mediaType === 'audio' || m.type === 'audio').length,
    totalViewers: mediaItems.reduce((sum, m) => sum + (m.uniqueViewersCount || 0), 0),
    totalDuration: mediaItems.reduce((sum, m) => sum + (m.duration || 0), 0)
  };

  // Format duration in hours
  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}.${Math.floor(minutes / 6)}h`;
    }
    return `${minutes}m`;
  };

  // Get unique categories from media items
  const categories = ['All', ...Array.from(new Set(mediaItems.map(m => m.category).filter(Boolean)))];

  // Filter media items based on selectedCategory AND searchQuery
  const filteredMediaItems = mediaItems.filter(item => {
    // Category match
    const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;

    // Search query match
    const titleMatch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const itemCategoryMatch = item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase());

    return categoryMatch && (titleMatch || itemCategoryMatch);
  });

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showUploadWizard && userRole !== 'participant') {
    return (
      <UploadContent
        userRole={userRole as 'admin' | 'trainer'}
        onBack={() => setShowUploadWizard(false)}
        onPublish={async (payload) => {
          setShowUploadWizard(false);
          await loadMedia(); // Reload media after upload
          toast.success('Media uploaded successfully!');
        }}
      />
    );
  }

  return (
    <PremiumPageShell>
      <PremiumHero
        title="Media Library"
        subtitle="Browse audio-visual learning content, lecture recordings, documents, and low-bandwidth study resources."
        eyebrow="Learning resource hub"
        icon={Video}
        action={userRole !== 'participant' && (
          <button
            type="button"
            onClick={() => setShowUploadWizard(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(79,70,229,.9)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Upload className="h-4 w-4" />
            Upload Content
          </button>
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard label="Total Videos" value={stats.totalVideos} detail="Lecture videos" icon={Play} tone="from-violet-50 via-purple-50 to-white" accent="text-violet-600" />
        <PremiumStatCard label="Audio Files" value={stats.totalAudio} detail="Listen anytime" icon={Headphones} tone="from-pink-50 via-rose-50 to-white" accent="text-pink-600" />
        <PremiumStatCard label={userRole === 'participant' ? 'Total Views' : 'Unique Students'} value={stats.totalViewers.toLocaleString()} detail="Resource reach" icon={Eye} tone="from-blue-50 via-sky-50 to-white" accent="text-blue-600" />
        <PremiumStatCard label="Duration" value={formatTotalDuration(stats.totalDuration)} detail="Learning time" icon={Clock} tone="from-emerald-50 via-teal-50 to-white" accent="text-emerald-600" />
      </div>

      {/* Filters & Search */}
      <PremiumCard className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-80 flex-shrink-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or category..."
            className="h-12 w-full rounded-full border border-slate-200 bg-white/85 pl-9 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 flex-1 md:justify-end">
          <button className="flex h-11 flex-shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`h-11 flex-shrink-0 rounded-full px-4 text-sm font-bold transition-all ${
                category === selectedCategory
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_12px_24px_-16px_rgba(79,70,229,.9)]'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-indigo-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </PremiumCard>

      {/* Media Grid */}
      {loading ? (
        <PremiumCard className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </PremiumCard>
      ) : filteredMediaItems.length === 0 ? (
        <PremiumCard className="py-20 text-center">
          <Video className="mx-auto mb-3 h-12 w-12 text-indigo-200" />
          <p className="font-bold text-slate-500">No media found</p>
        </PremiumCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMediaItems.map((item) => (
            <div key={item._id} className="group overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(79,70,229,.12)]">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-200 overflow-hidden">
                {((item as any).mediaType || item.type) === 'video' ? (
                  <video
                    src={item.fileUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    preload="metadata"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      const target = e.target as HTMLVideoElement;
                      target.style.display = 'none';
                      const img = document.createElement('img');
                      img.src = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=225&fit=crop';
                      img.className = 'w-full h-full object-cover';
                      target.parentElement?.appendChild(img);
                    }}
                  />
                ) : (
                  <img
                    src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=225&fit=crop'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedMedia(item._id)}
                    className="bg-white text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                  >
                    <Play className="w-8 h-8 ml-1" />
                  </button>
                </div>
                {/* Duration Badge */}
                {item.duration && (
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(item.duration)}
                  </div>
                )}
                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ((item as any).mediaType || item.type) === 'video'
                      ? 'bg-purple-600 text-white'
                      : ((item as any).mediaType || item.type) === 'audio'
                      ? 'bg-pink-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {((item as any).mediaType || item.type) === 'video' ? '🎥 Video' : ((item as any).mediaType || item.type) === 'audio' ? '🎵 Audio' : '📄 Document'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                    {item.category}
                  </span>
                </div>
                <h3 className="font-black text-slate-950 mb-3 line-clamp-2">{item.title}</h3>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{(item.uniqueViewersCount || 0).toLocaleString()} {userRole === 'participant' ? 'views' : 'students'}</span>
                  </div>
                  <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Low Bandwidth Mode */}
      <PremiumCard className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 text-white">
            <Zap className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">Low Bandwidth Mode</h4>
            <p className="text-sm text-gray-600 mb-4">
              Enable low bandwidth mode to reduce video quality and prioritize audio-only content for faster loading on slower connections.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" />
              <span className="text-sm font-medium text-gray-700">Enable Low Bandwidth Mode</span>
            </label>
          </div>
        </div>
      </PremiumCard>

      {/* Media Player Modal */}
      <Modal
        isOpen={selectedMedia !== null}
        onClose={() => setSelectedMedia(null)}
        title={mediaItems.find(m => m._id === selectedMedia)?.title || ''}
        size="xl"
      >
        {selectedMedia && (() => {
          const media = mediaItems.find(m => m._id === selectedMedia);
          if (!media) return null;

          return (
            <div className="space-y-6">
              {/* Video/Audio Player */}
              <div className="w-full aspect-video max-h-[45vh] sm:max-h-[min(60vh,560px)] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                {((media as any).mediaType || media.type) === 'video' ? (
                  <video 
                    controls 
                    className="w-full h-full object-contain"
                    src={media.fileUrl}
                    poster={media.thumbnailUrl}
                    onPlay={async () => {
                      // Increment view count when video starts playing
                      try {
                        const token = localStorage.getItem('token');
                        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/media/${media._id}/view`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        // Update local state
                        setMediaItems(prev => prev.map(m => 
                          m._id === media._id 
                            ? { ...m, views: ((m as any).viewCount || m.views || 0) + 1, viewCount: ((m as any).viewCount || m.views || 0) + 1 } 
                            : m
                        ));
                      } catch (error) {
                        console.error('Failed to increment view count:', error);
                      }
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : ((media as any).mediaType || media.type) === 'audio' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                    <div className="w-full px-8">
                      <div className="text-center text-white mb-8">
                        <svg className="w-20 h-20 mx-auto mb-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                        </svg>
                        <p className="text-lg font-semibold">{media.title}</p>
                      </div>
                      <audio 
                        controls 
                        className="w-full"
                        src={media.fileUrl}
                        onPlay={async () => {
                          // Increment view count when audio starts playing
                          try {
                            const token = localStorage.getItem('token');
                            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/media/${media._id}/view`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            // Update local state
                            setMediaItems(prev => prev.map(m => 
                              m._id === media._id 
                                ? { ...m, views: ((m as any).viewCount || m.views || 0) + 1, viewCount: ((m as any).viewCount || m.views || 0) + 1 } 
                                : m
                            ));
                          } catch (error) {
                            console.error('Failed to increment view count:', error);
                          }
                        }}
                      >
                        Your browser does not support the audio tag.
                      </audio>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <p className="text-lg">Document Preview</p>
                      <a 
                        href={media.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 inline-block bg-white text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-gray-100"
                        onClick={async () => {
                          // Increment view count when document is opened
                          try {
                            const token = localStorage.getItem('token');
                            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/media/${media._id}/view`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            // Update local state
                            setMediaItems(prev => prev.map(m => 
                              m._id === media._id 
                                ? { ...m, views: ((m as any).viewCount || m.views || 0) + 1, viewCount: ((m as any).viewCount || m.views || 0) + 1 } 
                                : m
                            ));
                          } catch (error) {
                            console.error('Failed to increment view count:', error);
                          }
                        }}
                      >
                        Open Document
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Media Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Category</p>
                  <p className="font-semibold text-gray-900">{media.category}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">{userRole === 'participant' ? 'Views' : 'Unique Students'}</p>
                  <p className="font-semibold text-gray-900">{(media.uniqueViewersCount || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">{formatDuration(media.duration)}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Upload Date</p>
                  <p className="font-semibold text-gray-900">{new Date(media.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" />
                  Play
                </button>
                <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </PremiumPageShell>
  );
}
