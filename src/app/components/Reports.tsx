import { BarChart3, Download, Filter, Calendar, TrendingUp, BookOpen, Clock, Award, Users, Target, CheckCircle2, Loader2, Sparkles, FileText, MoreVertical, Globe, Bell, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { FilterBar } from './FilterBar';
import { useState, useEffect } from 'react';
import { getTrainerDashboard } from '../services/dashboardService';

interface ReportsProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

export function Reports({ userRole }: ReportsProps) {
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [trainerData, setTrainerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch trainer data when component mounts
  useEffect(() => {
    if (userRole === 'trainer') {
      setLoading(true);
      getTrainerDashboard()
        .then(res => {
          if (res.success && res.data) {
            setTrainerData(res.data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch trainer data:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [userRole]);

  // Participant - My Progress Reports
  if (userRole === 'participant') {
    const courseData = [
      { course: 'Cooperative Management Fundamentals', modules: 12, completed: 9, progress: 75, lastAccessed: '2 hours ago', grade: 'A' },
      { course: 'Digital Marketing for Cooperatives', modules: 10, completed: 5, progress: 45, lastAccessed: '1 day ago', grade: 'B+' },
      { course: 'Financial Literacy & Accounting', modules: 15, completed: 14, progress: 90, lastAccessed: '3 hours ago', grade: 'A+' },
      { course: 'Legal Compliance for Cooperatives', modules: 8, completed: 2, progress: 20, lastAccessed: '1 week ago', grade: '-' },
    ];

    const assessmentData = [
      { assessment: 'Module 1-4 Final Assessment', course: 'Cooperative Management', score: 88, status: 'Passed', date: 'Apr 20, 2026' },
      { assessment: 'Midterm Exam', course: 'Financial Literacy', score: 92, status: 'Passed', date: 'Apr 22, 2026' },
    ];

    // Helper SVG for sparkline
    const SparklineSVG = ({ trend }: { trend: string }) => (
      <svg className="w-12 h-6" viewBox="0 0 40 20" preserveAspectRatio="none">
        <path d={trend} stroke="#4F46E5" strokeWidth="1.5" fill="none" />
        <path d={trend} stroke="#4F46E5" strokeWidth="1.5" fill="url(#sparkGradient)" fillOpacity="0.1" />
        <defs>
          <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );

    const statTrends = {
      enrolled: 'M2,15 L8,12 L14,14 L20,8 L26,10 L32,6 L38,9',
      completed: 'M2,18 L8,16 L14,12 L20,8 L26,6 L32,4 L38,2',
      progress: 'M2,16 L8,14 L14,10 L20,8 L26,6 L32,5 L38,3',
      time: 'M2,15 L8,11 L14,13 L20,9 L26,11 L32,7 L38,8',
    };

    return (
      <div className="space-y-6">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden rounded-[22px] border border-indigo-100/80 bg-gradient-to-r from-[#eef1ff] via-[#f6f4ff] to-[#eff8ff] px-5 py-6 md:px-7 md:py-7 shadow-[0_30px_50px_-38px_rgba(37,99,235,0.55)]">
          <div className="absolute inset-0 opacity-45" style={{ backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0.68), rgba(255,255,255,0.14))' }} />
          
          {/* Government Building SVG Illustration - Very Faint */}
          <svg className="absolute right-0 top-0 w-96 h-full opacity-[0.08] mr-[-80px]" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            <g stroke="#4F46E5" strokeWidth="1.5" fill="none">
              {/* Central dome */}
              <circle cx="200" cy="80" r="40" />
              <path d="M160,80 Q200,40 240,80" />
              {/* Main building */}
              <rect x="80" y="100" width="240" height="140" />
              {/* Columns */}
              <line x1="100" y1="100" x2="100" y2="240" strokeWidth="2" />
              <line x1="140" y1="100" x2="140" y2="240" strokeWidth="2" />
              <line x1="180" y1="100" x2="180" y2="240" strokeWidth="2" />
              <line x1="220" y1="100" x2="220" y2="240" strokeWidth="2" />
              <line x1="260" y1="100" x2="260" y2="240" strokeWidth="2" />
              <line x1="300" y1="100" x2="300" y2="240" strokeWidth="2" />
              {/* Windows grid */}
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
              {/* Flag on dome */}
              <polyline points="200,40 210,35 210,50" strokeWidth="1.5" />
            </g>
          </svg>

          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Learning in Progress</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">My Learning Progress</h2>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl">Track your course completion, assessment scores, and achievement milestones across all enrolled programs.</p>
          </div>
        </section>

        {/* Premium Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Enrolled Courses */}
          <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(37,99,235,0.35)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F46E5] to-[#2563EB]" />
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <SparklineSVG trend={statTrends.enrolled} />
            </div>
            <p className="text-3xl font-black text-slate-900">4</p>
            <p className="text-xs text-slate-500 mt-1">Courses Enrolled</p>
          </article>

          {/* Completed */}
          <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(34,197,94,0.35)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <SparklineSVG trend={statTrends.completed} />
            </div>
            <p className="text-3xl font-black text-slate-900">1</p>
            <p className="text-xs text-slate-500 mt-1">Completed</p>
          </article>

          {/* Average Progress */}
          <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(168,85,247,0.35)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <SparklineSVG trend={statTrends.progress} />
            </div>
            <p className="text-3xl font-black text-slate-900">67%</p>
            <p className="text-xs text-slate-500 mt-1">Avg Progress</p>
          </article>

          {/* Study Time */}
          <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(217,119,6,0.35)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <SparklineSVG trend={statTrends.time} />
            </div>
            <p className="text-3xl font-black text-slate-900">42.5h</p>
            <p className="text-xs text-slate-500 mt-1">Study Time</p>
          </article>
        </div>

        {/* Filters */}
        <FilterBar
          onFilterChange={setActiveFilters}
          showCourseFilter={true}
          showExport={true}
        />

        {/* Course Progress Section */}
        <section className="rounded-[22px] border border-slate-200/80 bg-white/90 p-5 md:p-6 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)]">
          <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Course-wise Progress
          </h3>
          <div className="space-y-3">
            {courseData.map((item, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-[16px] border border-slate-200/70 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 p-4 shadow-[0_6px_20px_-30px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_12px_28px_-28px_rgba(79,70,229,0.15)] hover:border-indigo-200/60"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-indigo-50/20 to-transparent" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 text-sm">{item.course}</h4>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {item.completed}/{item.modules} modules • Last accessed: {item.lastAccessed}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-2xl font-black text-indigo-600">{item.progress}%</span>
                      {item.grade !== '-' && (
                        <p className="text-xs text-slate-600 mt-1">Grade: <span className="font-semibold text-slate-900">{item.grade}</span></p>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#14B8A6] transition-all duration-500 ease-out shadow-[0_0_12px_rgba(79,70,229,0.4)]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Assessment Performance Section */}
        <section className="rounded-[22px] border border-slate-200/80 bg-white/90 p-5 md:p-6 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)]">
          <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            Assessment Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessmentData.map((item, idx) => (
              <article
                key={idx}
                className="group relative overflow-hidden rounded-[16px] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 shadow-[0_6px_20px_-30px_rgba(16,185,129,0.15)] transition-all duration-300 hover:shadow-[0_12px_28px_-28px_rgba(16,185,129,0.25)] hover:border-emerald-300/80"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 text-sm">{item.assessment}</h4>
                      <p className="text-xs text-slate-600 mt-1">{item.course}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-2xl font-black text-emerald-600">{item.score}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-700 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-600">{item.date}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Download Report Button */}
        <div className="flex gap-3 pt-2">
          <button className="inline-flex items-center gap-2 px-5 py-3 rounded-[14px] bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white text-sm font-semibold shadow-[0_12px_28px_-28px_rgba(79,70,229,0.4)] hover:shadow-[0_18px_38px_-30px_rgba(79,70,229,0.5)] transition-all duration-300 hover:scale-[1.01]">
            <Download className="w-4 h-4" />
            Download My Progress Report
          </button>
        </div>
      </div>
    );
  }

  // Trainer - Student Analytics
  if (userRole === 'trainer') {
    // Calculate dynamic stats from trainer data
    const totalStudents = trainerData?.summary?.totalStudents || 0;
    const totalCourses = trainerData?.summary?.totalCourses || 0;
    const courses = trainerData?.courses || [];
    
    // Calculate average completion rate
    const avgCompletion = courses.length > 0
      ? Math.round(courses.reduce((sum: number, c: any) => {
          const rate = c.enrollmentCount > 0 ? (c.completedCount / c.enrollmentCount) * 100 : 0;
          return sum + rate;
        }, 0) / courses.length)
      : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Student Analytics & Performance</h2>
          <p className="text-gray-600 mt-1">Monitor your students' progress and engagement</p>
        </div>

        {/* Filters */}
        <FilterBar
          onFilterChange={setActiveFilters}
          showCourseFilter={true}
          showBatchFilter={true}
          showExport={true}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* Stats - Dynamic Data */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                    <p className="text-sm text-gray-700">Total Students</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalCourses}</p>
                    <p className="text-sm text-gray-700">Total Courses</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{avgCompletion}%</p>
                    <p className="text-sm text-gray-700">Avg Completion</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {courses.reduce((sum: number, c: any) => sum + (c.completedCount || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-700">Completed</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{trainerData?.summary?.publishedCourses || 0}</p>
                    <p className="text-sm text-gray-700">Published</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Course-wise Student Performance - Dynamic Data */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-semibold text-lg text-gray-900">Course-wise Student Performance</h3>
              </div>
              {courses.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium mb-2">No Courses Yet</p>
                  <p className="text-gray-400 text-sm">Create your first course to see student analytics here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Course Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Students</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Completed</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Avg Rating</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Completion Rate</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {courses.map((course: any, idx: number) => {
                        const completionRate = course.enrollmentCount > 0
                          ? Math.round((course.completedCount / course.enrollmentCount) * 100)
                          : 0;
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{course.title}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold">{course.enrollmentCount || 0}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="font-semibold">{course.completedCount || 0}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500">⭐</span>
                                <span className="font-semibold text-gray-900">
                                  {course.ratings?.average?.toFixed(1) || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${completionRate}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold">{completionRate}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                course.isPublished
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {course.isPublished ? 'Published' : 'Draft'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Export */}
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all">
            <Download className="w-5 h-5" />
            Export Student Reports
          </button>
        </div>
      </div>
    );
  }

  // Admin - Platform Reports (Original Code)
  const reportTypes = [
    {
      id: 1,
      name: 'Course Completion Report',
      description: 'Track course completion rates across all programmes',
      icon: '📊',
      lastGenerated: '2026-04-28',
    },
    {
      id: 2,
      name: 'Participant Performance Report',
      description: 'Detailed analysis of learner assessment scores',
      icon: '📈',
      lastGenerated: '2026-04-27',
    },
    {
      id: 3,
      name: 'Attendance Report',
      description: 'Live session attendance tracking and analysis',
      icon: '✅',
      lastGenerated: '2026-04-29',
    },
    {
      id: 4,
      name: 'Certificate Download Report',
      description: 'Monitor certificate generation and downloads',
      icon: '🏆',
      lastGenerated: '2026-04-26',
    },
  ];

  const recentReports = [
    {
      id: 1,
      title: 'Monthly Progress Report - April 2026',
      type: 'Course Completion',
      generatedBy: 'Admin',
      date: '2026-04-28',
      records: 1247,
    },
    {
      id: 2,
      title: 'Assessment Performance - Batch A',
      type: 'Performance',
      generatedBy: 'Dr. Rajesh Kumar',
      date: '2026-04-27',
      records: 145,
    },
    {
      id: 3,
      title: 'Live Sessions Attendance - Week 17',
      type: 'Attendance',
      generatedBy: 'Prof. Anita Sharma',
      date: '2026-04-26',
      records: 342,
    },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto px-6 lg:px-10 py-6">
      {/* Page Title + decorative background */}
      <div className="relative overflow-visible">
        <div className="absolute -right-16 -top-8 w-80 h-56 rounded-full bg-gradient-to-br from-indigo-100/40 to-cyan-50/30 blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -right-40 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-purple-100/30 to-indigo-50/20 blur-2xl opacity-50 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950">Platform Reports &amp; Analytics</h2>
          <p className="text-sm md:text-base text-slate-600 mt-1">Generate and download comprehensive reports</p>
        </div>
      </div>

      {/* Compact Filters Bar (collapsible visual) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm h-14 flex items-center px-4 gap-3 hover:shadow-md transition-all duration-300 cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">Filters</div>
              <div className="text-xs text-slate-500">Program, batch, date range, role</div>
            </div>
            <ChevronDown className="w-5 h-5 text-slate-500" />
          </div>
        </div>

        {/* Right-side header controls removed: keep global BrandingBar for language/notifications/profile */}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: 'Reports Generated', value: '24', helper: 'All time', icon: BarChart3, from: 'from-blue-50', to: 'to-indigo-50' },
          { title: 'Downloads', value: '187', helper: 'All time', icon: Download, from: 'from-purple-50', to: 'to-violet-50' },
          { title: 'This Month', value: '12', helper: 'Apr 2026', icon: Calendar, from: 'from-green-50', to: 'to-emerald-50' },
          { title: 'Report Types', value: '4', helper: 'Available', icon: BookOpen, from: 'from-yellow-50', to: 'to-amber-50' },
        ].map((s, i) => {
          const Icon = s.icon as any;
          return (
            <article key={i} className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className={`flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center` }>
                  {Icon ? <Icon className="w-6 h-6 text-slate-900" /> : null}
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-sm text-slate-600">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.helper}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Generate New Report */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-slate-900">Generate New Report</h3>
          <button className="text-sm text-slate-500 hover:text-slate-700">Manage templates</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              className="rounded-2xl border border-slate-100 p-5 text-left bg-white hover:shadow-lg hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                  {report.id === 1 && <BarChart3 className="w-5 h-5 text-indigo-600" />}
                  {report.id === 2 && <TrendingUp className="w-5 h-5 text-purple-600" />}
                  {report.id === 3 && <Calendar className="w-5 h-5 text-green-600" />}
                  {report.id === 4 && <Award className="w-5 h-5 text-amber-600" />}
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">{report.name}</h4>
                <p className="text-xs text-slate-500">{report.description}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-slate-400">Last: {new Date(report.lastGenerated).toLocaleDateString('en-IN')}</p>
                <div className="inline-flex items-center gap-2">
                  <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition"><Sparkles className="w-4 h-4 text-slate-600" /></button>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Report Filters Panel */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Filter className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900">Report Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Programme</label>
            <select className="w-full px-4 h-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700">
              <option>All Programmes</option>
              <option>Cooperative Management</option>
              <option>Digital Marketing</option>
              <option>Financial Literacy</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Batch</label>
            <select className="w-full px-4 h-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700">
              <option>All Batches</option>
              <option>Batch A - 2026</option>
              <option>Batch B - 2026</option>
              <option>Batch C - 2025</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Date Range</label>
            <select className="w-full px-4 h-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700">
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>This Quarter</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Role</label>
            <select className="w-full px-4 h-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700">
              <option>All Roles</option>
              <option>Participants</option>
              <option>Trainers</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-3 rounded-xl font-medium hover:shadow-lg transition-all">
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
          <button className="bg-gray-50 text-slate-700 px-5 py-3 rounded-xl font-medium hover:bg-gray-100 transition-all">
            Reset Filters
          </button>
        </div>
      </section>

      {/* Recent Reports - table/card hybrid */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-slate-900">Recent Reports</h3>
          <button className="text-sm text-indigo-600 hover:underline">View all reports</button>
        </div>
        <div className="divide-y divide-slate-100">
          {recentReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 mb-2">{report.title}</h4>
                <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">{report.type}</span>
                  <span>Generated by: {report.generatedBy}</span>
                  <span>•</span>
                  <span>{new Date(report.date).toLocaleDateString('en-IN')}</span>
                  <span>•</span>
                  <span>{report.records.toLocaleString()} records</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100 hover:shadow transition text-sm text-rose-600">
                  <FileText className="w-4 h-4" /> PDF
                </button>
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100 hover:shadow transition text-sm text-emerald-600">
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button className="p-2 rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100">
                  <MoreVertical className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Performance */}
      {userRole === 'admin' && (
        <section className="bg-gradient-to-br from-green-50 to-emerald-50 border border-emerald-100 rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-2">System Performance</h4>
              <p className="text-sm text-slate-600 mb-3">Platform optimized for handling 1 lakh concurrent users with real-time data processing</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-emerald-700">System Status: Optimal</span>
                <button className="ml-auto text-sm text-indigo-600 hover:underline">View details</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Floating AI Assistant */}
      <div className="fixed right-6 bottom-6 z-50">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-lg border border-slate-100 px-4 py-2 hover:shadow-2xl transition-all duration-300">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-slate-900">AI Assistant</div>
            <div className="text-xs text-slate-500">Ask me anything</div>
          </div>
        </div>
      </div>
    </div>
  );
}
