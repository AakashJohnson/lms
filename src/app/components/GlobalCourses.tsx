import { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Play, Clock, Users, Star, 
  Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, Radio, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getGlobalCourses, enrollInCourse, getCourse as fetchCourseAPI } from '../services/courseService';
import { CourseInfoModal } from './myCourses/CourseInfoModal';
import { stripHtml } from './myCourses/courseInfoHelpers';
import { CoursePlayer } from './course/CoursePlayer';
import type { Course } from './myCourses/types';

export function GlobalCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOption, setSortOption] = useState('recent');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);

  // Info Modal State
  const [infoCourse, setInfoCourse] = useState<any | null>(null);
  const [infoCourseData, setInfoCourseData] = useState<any | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [courseInfoCache, setCourseInfoCache] = useState<Record<string, any>>({});
  
  // Interaction states
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [playingCourse, setPlayingCourse] = useState<string | null>(null);

  // Categories list matching Course.model.js
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'management', label: 'Cooperative Management' },
    { value: 'finance', label: 'Financial Literacy' },
    { value: 'marketing', label: 'Digital Marketing' },
    { value: 'legal', label: 'Legal Compliance' },
    { value: 'technology', label: 'Digital Skills / Tech' },
    { value: 'hr', label: 'HR' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'other', label: 'Other' }
  ];

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset page on new search
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load global courses
  const loadGlobalCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGlobalCourses({
        search: debouncedSearch,
        category: selectedCategory === 'all' ? '' : selectedCategory,
        sort: sortOption,
        page: currentPage,
        limit: 9
      });

      if (res.success) {
        setCourses(res.courses);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCourses(res.pagination.total || 0);
      } else {
        setError('Failed to fetch courses');
      }
    } catch (err: any) {
      console.error('Failed to load global courses:', err);
      setError(err.response?.data?.message || err.message || 'Could not load courses');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, sortOption, currentPage]);

  useEffect(() => {
    loadGlobalCourses();
  }, [loadGlobalCourses]);

  // Open Detailed Info Modal
  const handleOpenCourseInfo = async (course: any) => {
    // Transform global course format to match CourseInfoModal requirements
    const transformedCourse: Course = {
      id: course._id,
      title: course.title,
      category: course.category,
      progress: course.progress || 0,
      enrolled: course.enrolledCount || 0,
      duration: course.duration || 'TBD',
      modules: course.sections?.length || 0,
      lessons: course.lessonsCount || 0,
      trainer: course.teacherName,
      createdAt: '',
      thumbnail: course.thumbnail,
      rating: course.rating || 0,
      status: 'active',
      price: 0
    };

    setInfoCourse(transformedCourse);
    setInfoCourseData(course);

    if (courseInfoCache[course._id]) {
      setInfoCourseData(courseInfoCache[course._id]);
      return;
    }

    setInfoLoading(true);
    try {
      const res = await fetchCourseAPI(course._id);
      if (res.success && res.data) {
        setInfoCourseData(res.data);
        setCourseInfoCache((prev) => ({ ...prev, [course._id]: res.data }));
      }
    } catch (error) {
      toast.error('Could not load course information');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleCloseCourseInfo = () => {
    setInfoCourse(null);
    setInfoCourseData(null);
    setInfoLoading(false);
  };

  // Perform enrollment
  const handleEnroll = async (course: Course) => {
    const courseId = String(course.id);
    setEnrolling(courseId);
    try {
      const res = await enrollInCourse(courseId);
      if (res.success) {
        toast.success(`Enrolled in "${course.title}"!`, { icon: '🎉' });
        
        // Refresh local course list to update enrollment status
        await loadGlobalCourses();
        
        // Auto play course after successful enrollment
        handleCloseCourseInfo();
        setPlayingCourse(courseId);
      } else {
        toast.error(res.message || 'Enrollment failed');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Enrollment failed';
      toast.error(errorMsg);
    } finally {
      setEnrolling(null);
    }
  };

  // Active course view/player mode
  if (playingCourse) {
    return (
      <CoursePlayer
        courseId={playingCourse}
        onBack={() => { setPlayingCourse(null); loadGlobalCourses(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden rounded-[22px] border border-indigo-100/80 bg-gradient-to-r from-[#eef1ff] via-[#f6f4ff] to-[#eff8ff] px-5 py-6 md:px-7 md:py-7 shadow-[0_30px_50px_-38px_rgba(37,99,235,0.55)]">
        <div className="absolute inset-0 opacity-45" style={{ backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0.68), rgba(255,255,255,0.14))' }} />
        
        {/* Government Building SVG Illustration */}
        <svg className="absolute right-0 top-0 w-96 h-full opacity-[0.08] mr-[-80px]" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
          <g stroke="#4F46E5" strokeWidth="1.5" fill="none">
            <circle cx="200" cy="80" r="40" />
            <path d="M160,80 Q200,40 240,80" />
            <rect x="80" y="100" width="240" height="140" />
            <line x1="100" y1="100" x2="100" y2="240" strokeWidth="2" />
            <line x1="140" y1="100" x2="140" y2="240" strokeWidth="2" />
            <line x1="180" y1="100" x2="180" y2="240" strokeWidth="2" />
            <line x1="220" y1="100" x2="220" y2="240" strokeWidth="2" />
            <line x1="260" y1="100" x2="260" y2="240" strokeWidth="2" />
            <line x1="300" y1="100" x2="300" y2="240" strokeWidth="2" />
            <rect x="100" y="120" width="20" height="20" />
            <rect x="130" y="120" width="20" height="20" />
            <rect x="160" y="120" width="20" height="20" />
            <rect x="190" y="120" width="20" height="20" />
            <rect x="220" y="120" width="20" height="20" />
            <rect x="250" y="120" width="20" height="20" />
            <rect x="100" y="155" width="20" height="20" />
            <rect x="130" y="155" width="20" height="20" />
            <rect x="160" y="155" width="20" height="20" />
            <rect x="190" y="155" width="20" height="20" />
            <rect x="220" y="155" width="20" height="20" />
            <rect x="250" y="155" width="20" height="20" />
            <rect x="100" y="190" width="20" height="20" />
            <rect x="130" y="190" width="20" height="20" />
            <rect x="160" y="190" width="20" height="20" />
            <rect x="190" y="190" width="20" height="20" />
            <rect x="220" y="190" width="20" height="20" />
            <rect x="250" y="190" width="20" height="20" />
            <polyline points="200,40 210,35 210,50" strokeWidth="1.5" />
          </g>
        </svg>

        {/* Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">Course Marketplace</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Course Marketplace</h2>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl">Discover courses, learn from experts, and enhance your skills at your own pace.</p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses, categories, or teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
          />
        </div>

        {/* Category */}
        <div className="relative w-full md:w-64">
          <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all appearance-none cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="relative w-full md:w-56">
          <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all appearance-none cursor-pointer"
          >
            <option value="recent">Sort: Most Recent</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="alphabetical">Sort: A - Z</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-[20px] border border-slate-200/80 overflow-hidden animate-pulse shadow-[0_6px_20px_-30px_rgba(0,0,0,0.1)]">
              <div className="aspect-video bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-8 bg-slate-200 rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Courses Found</h3>
          <p className="text-sm text-slate-500 mt-1">Try expanding your search query or selecting a different category.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div 
                key={course._id} 
                className="bg-white rounded-[22px] border border-slate-150 shadow-[0_12px_36px_-32px_rgba(15,23,42,0.12)] overflow-hidden flex flex-col group hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-28px_rgba(79,70,229,0.24)] transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-indigo-200" />
                    </div>
                  )}
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white text-xs font-semibold shadow-sm">
                      {course.category}
                    </span>
                  </div>
                  {/* Info Button */}
                  <div className="absolute top-4 right-4">
                    <button 
                      onClick={() => handleOpenCourseInfo(course)}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md border border-slate-100 shadow flex items-center justify-center hover:bg-white text-indigo-600 transition-colors"
                      title="View course information"
                    >
                      <span className="text-xs font-bold font-serif">i</span>
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Teacher Name */}
                  <p className="text-xs text-indigo-600 font-bold tracking-wider uppercase mb-1.5">{course.teacherName}</p>
                  
                  <h3 className="font-bold text-slate-800 text-base mb-2 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                    {course.title}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold text-slate-700">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{course.rating ? `${course.rating} / 5` : 'New'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{course.enrolledCount} enrolled</span>
                  </div>

                  {/* Description Preview */}
                  {course.shortDescription && (
                    <p className="text-xs text-slate-600 mb-5 line-clamp-2">
                      {stripHtml(course.shortDescription)}
                    </p>
                  )}

                  {/* Course Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-6 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600 font-medium">{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center border-l border-slate-200">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600 font-medium">{course.lessonsCount} lessons</span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-2 mt-auto">
                    {course.isEnrolled ? (
                      <button
                        onClick={() => setPlayingCourse(course._id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white text-sm font-semibold hover:brightness-105 transition-all shadow-[0_8px_16px_rgba(79,70,229,0.18)]"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Continue
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCourseInfo(course)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:brightness-105 transition-all shadow-[0_8px_16px_rgba(16,185,129,0.18)]"
                      >
                        Enroll Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Premium Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/80 pt-6 mt-8">
              <p className="text-xs text-slate-600 font-medium">
                Showing page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span> ({totalCourses} total courses)
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info details Modal */}
      <CourseInfoModal
        isOpen={!!infoCourse}
        course={infoCourse}
        courseInfo={infoCourseData}
        loading={infoLoading}
        onClose={handleCloseCourseInfo}
        onContinue={(course) => {
          handleCloseCourseInfo();
          setPlayingCourse(String(course.id));
        }}
        onEnroll={handleEnroll}
        enrolling={enrolling === infoCourse?.id}
      />
    </div>
  );
}
