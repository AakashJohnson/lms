import { useState, useEffect } from 'react';
import { Eye, ArrowLeft, Loader2, RefreshCw, Download, X, Users, Mail, Phone, Building, BookOpen, GraduationCap, FileSpreadsheet, Upload, Funnel, ChevronDown, Sparkles, BarChart3, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { toast } from 'sonner';

interface TrainerManagementProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

interface Trainer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organization?: string;
  totalCourses: number;
  totalBatches: number;
  totalStudents: number;
  isActive: boolean;
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organization?: string;
  department?: string;
  batch?: string;
  enrolledCourses: number;
  completedCourses: number;
  progress: number;
  isActive: boolean;
  createdAt: string;
}

export function TrainerManagement({ userRole }: TrainerManagementProps) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Fetch all trainers
  useEffect(() => {
    if (userRole === 'admin') {
      fetchTrainers();
    }
  }, [userRole]);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      // Call backend API to get all trainers with their stats
      const response = await axiosInstance.get('/admin/trainers-overview');
      console.log('✅ Trainers Overview Response:', response.data);
      
      if (response.data.success) {
        setTrainers(response.data.data);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch trainers:', error);
      console.error('Error response:', error.response);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerStudents = async (trainerId: string) => {
    setLoadingStudents(true);
    try {
      // Call backend API to get students for specific trainer
      const response = await axiosInstance.get(`/admin/trainer/${trainerId}/students`);
      console.log('✅ Trainer Students Response:', response.data);
      
      if (response.data.success) {
        // Transform data to match Student interface
        const transformedStudents = response.data.data.map((student: any) => ({
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.mobile,
          organization: student.organization,
          department: student.department?.name || 'N/A',
          batch: student.batch?.name || student.batchName || 'N/A',
          enrolledCourses: 0, // Can be calculated if needed
          completedCourses: 0,
          progress: 0,
          isActive: student.isActive,
          createdAt: student.createdAt,
        }));
        setStudents(transformedStudents);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch trainer students:', error);
      console.error('Error response:', error.response);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewStudents = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    fetchTrainerStudents(trainer._id);
  };

  const handleBack = () => {
    setSelectedTrainer(null);
    setStudents([]);
  };

  // If viewing specific trainer's students
  if (selectedTrainer) {
    return (
      <div className="min-h-screen bg-slate-50 space-y-6 pb-12">
        {/* Back Button Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Trainers
            </button>
          </div>
          <button
            onClick={() => fetchTrainerStudents(selectedTrainer._id)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Trainer Header Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="flex items-start gap-6 justify-between flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {selectedTrainer.firstName.charAt(0)}{selectedTrainer.lastName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {selectedTrainer.firstName} {selectedTrainer.lastName}
                </h1>
                <p className="text-slate-600 mt-1">{selectedTrainer.email}</p>
                {selectedTrainer.organization && (
                  <p className="text-slate-500 text-sm mt-1">{selectedTrainer.organization}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{selectedTrainer.totalCourses}</p>
                <p className="text-xs text-slate-600 font-medium">Courses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{selectedTrainer.totalBatches}</p>
                <p className="text-xs text-slate-600 font-medium">Batches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{selectedTrainer.totalStudents}</p>
                <p className="text-xs text-slate-600 font-medium">Students</p>
              </div>
            </div>
          </div>
        </div>

        {/* Students Table Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Assigned Students</h3>
                <p className="text-sm text-slate-500 mt-1">Students trained by {selectedTrainer.firstName}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                {students.length} student{students.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Table Content */}
          {loadingStudents ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-slate-500 font-medium">Loading students...</p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-20 h-20 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium">No Students Found</p>
              <p className="text-slate-500 text-sm mt-2">This trainer has no assigned students yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">S.No.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Organization</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Batch</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Courses</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student, index) => (
                    <tr key={student._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Joined: {new Date(student.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2 text-slate-900">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-xs">{student.email}</span>
                          </div>
                          {student.phone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-xs">{student.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-slate-900">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs">{student.organization || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {student.department || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          {student.batch || 'Not Assigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-semibold text-slate-900">{student.enrolledCourses} enrolled</p>
                          <p className="text-xs text-emerald-600">
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            {student.completedCourses} completed
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ProgressBar progress={student.progress} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                          student.isActive 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-2 inline-block ${
                            student.isActive ? 'bg-emerald-600' : 'bg-rose-600'
                          }`} />
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          {students.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <p className="text-sm text-slate-600 font-medium">
                Showing <span className="text-slate-900 font-semibold">{students.length}</span> student{students.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Trainers List View
  return (
    <div className="min-h-screen bg-slate-50 space-y-6 pb-12">
      {/* Premium Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <Sparkles className="w-8 h-8 text-white/80" />
            <span className="text-sm font-medium bg-white/20 px-4 py-1 rounded-full">Premium</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Trainer Management</h1>
          <p className="text-lg text-white/90">Manage trainers, view assigned students, and track training progress</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 lg:gap-4">
        <button
          onClick={fetchTrainers}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={() => setShowBulkModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
        >
          <Upload className="w-4 h-4" />
          Bulk Import
        </button>
        <button
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <StatCard 
          label="Total Trainers" 
          value={trainers.length.toString()} 
          description="Registered trainers"
          icon={Users}
          accent="blue"
          loading={loading}
        />
        <StatCard 
          label="Total Batches" 
          value={trainers.reduce((sum, t) => sum + t.totalBatches, 0).toString()}
          description="Assigned batches"
          icon={GraduationCap}
          accent="purple"
          loading={loading}
        />
        <StatCard 
          label="Total Students" 
          value={trainers.reduce((sum, t) => sum + t.totalStudents, 0).toString()}
          description="Linked students"
          icon={Users}
          accent="green"
          loading={loading}
        />
        <StatCard 
          label="Total Courses" 
          value={trainers.reduce((sum, t) => sum + t.totalCourses, 0).toString()}
          description="Mapped courses"
          icon={BookOpen}
          accent="orange"
          loading={loading}
        />
      </div>

      {/* Filters Section Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Funnel className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search trainers by name, email, or organization..."
              className="w-full px-4 py-2.5 pl-10 border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Trainers Table Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Trainers</h3>
            <p className="text-sm text-slate-500 mt-1">Manage trainers and view assigned students</p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
            {trainers.length} trainer{trainers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-slate-500 font-medium">Loading trainers...</p>
            </div>
          </div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-20 h-20 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium">No Trainers Found</p>
            <p className="text-slate-500 text-sm mt-2 mb-6">Import trainers to get started</p>
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">S.No.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Trainer Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact Details</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Courses</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Batches</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {trainers.map((trainer, index) => (
                  <tr key={trainer._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {trainer.firstName.charAt(0)}{trainer.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {trainer.firstName} {trainer.lastName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{trainer.organization || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2 text-slate-900">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs">{trainer.email}</span>
                        </div>
                        {trainer.phone && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-xs">{trainer.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <CountBadge count={trainer.totalCourses} color="blue" label="course" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <CountBadge count={trainer.totalBatches} color="purple" label="batch" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <CountBadge count={trainer.totalStudents} color="green" label="student" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewStudents(trainer)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <Eye className="w-4 h-4" />
                        View Students
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {trainers.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-600 font-medium">
              Showing <span className="text-slate-900 font-semibold">{trainers.length}</span> trainer{trainers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <BulkImportTrainersModal
          onClose={() => setShowBulkModal(false)}
          onImported={() => {
            setShowBulkModal(false);
            fetchTrainers();
          }}
        />
      )}
    </div>
  );
}

// Reusable Components

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: any;
  accent: 'blue' | 'purple' | 'green' | 'orange';
  loading?: boolean;
}

function StatCard({ label, value, description, icon: Icon, accent, loading = false }: StatCardProps) {
  const accentClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    green: 'from-emerald-50 to-emerald-100 border-emerald-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200',
  };

  const iconClasses = {
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    green: 'text-emerald-600 bg-emerald-100',
    orange: 'text-orange-600 bg-orange-100',
  };

  const textClasses = {
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    green: 'text-emerald-700',
    orange: 'text-orange-700',
  };

  const barColors = {
    blue: ['bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600'],
    purple: ['bg-purple-300', 'bg-purple-400', 'bg-purple-500', 'bg-purple-600'],
    green: ['bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600'],
    orange: ['bg-orange-300', 'bg-orange-400', 'bg-orange-500', 'bg-orange-600'],
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br ${accentClasses[accent]} border rounded-2xl p-6 animate-pulse`}>
        <div className="h-12 bg-slate-200 rounded-lg mb-4" />
        <div className="h-6 bg-slate-200 rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${accentClasses[accent]} border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconClasses[accent]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex items-end justify-end gap-px h-8">
          <div className={`w-1 h-2.5 rounded-px opacity-40 ${barColors[accent][0]}`} />
          <div className={`w-1 h-3.5 rounded-px opacity-55 ${barColors[accent][1]}`} />
          <div className={`w-1 h-5 rounded-px opacity-70 ${barColors[accent][2]}`} />
          <div className={`w-1 h-6 rounded-px ${barColors[accent][3]}`} />
        </div>
      </div>
      <p className="text-4xl font-bold text-slate-900 mb-1">{value}</p>
      <p className={`text-sm font-semibold ${textClasses[accent]} mb-1`}>{label}</p>
      <p className="text-xs text-slate-600">{description}</p>
    </div>
  );
}

// Progress Bar Component - shows percentage with visual bar using CSS classes
function ProgressBar({ progress }: { progress: number }) {
  const safeProgress = Math.min(100, Math.max(0, progress));
  
  // Map progress to Tailwind width classes (20% increments)
  const progressClass = safeProgress >= 90 ? 'w-full' : 
                        safeProgress >= 80 ? 'w-5/6' :
                        safeProgress >= 70 ? 'w-4/5' :
                        safeProgress >= 60 ? 'w-3/4' :
                        safeProgress >= 50 ? 'w-3/5' :
                        safeProgress >= 40 ? 'w-1/2' :
                        safeProgress >= 30 ? 'w-2/5' :
                        safeProgress >= 20 ? 'w-1/4' :
                        safeProgress >= 10 ? 'w-1/6' : 'w-1/12';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className={`bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all ${progressClass}`}
        />
      </div>
      <span className="text-sm font-medium text-slate-900 min-w-max">{safeProgress}%</span>
    </div>
  );
}

// Count Badge Component
interface CountBadgeProps {
  count: number;
  color: 'blue' | 'purple' | 'green';
  label: string;
}

function CountBadge({ count, color, label }: CountBadgeProps) {
  const classes = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${classes[color]} hover:shadow-md transition-all`}>
      {count}
    </span>
  );
}

// Bulk Import Trainers Modal Component
function BulkImportTrainersModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const downloadTemplate = () => {
    const headers = ['firstName', 'lastName', 'email', 'mobile', 'organization', 'specialization'];
    const sampleRow = ['John', 'Doe', 'john.doe@example.com', '9876543210', 'NCUI Training Center', 'Cooperative Management'];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trainer-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setError('CSV file is empty or invalid');
        setBusy(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['firstname', 'lastname', 'email', 'mobile'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setError(`Missing required columns: ${missingHeaders.join(', ')}`);
        setBusy(false);
        return;
      }

      const usersToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;

        const user: any = {};
        headers.forEach((header, index) => {
          user[header] = values[index];
        });

        // Validate required fields
        if (!user.firstname || !user.lastname || !user.email || !user.mobile) {
          continue;
        }

        usersToImport.push({
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email,
          mobile: user.mobile.replace(/\D/g, '').slice(-10),
          organization: user.organization || '',
          specialization: user.specialization ? user.specialization.split(';').map((s: string) => s.trim()) : [],
        });
      }

      if (usersToImport.length === 0) {
        setError('No valid trainer records found in CSV');
        setBusy(false);
        return;
      }

      // Call backend API
      const response = await axiosInstance.post('/admin/users/bulk-import', {
        role: 'trainer',
        users: usersToImport,
      });

      if (response.data.success) {
        setSuccess(`Successfully imported ${usersToImport.length} trainer(s)!`);
        toast.success(`Imported ${usersToImport.length} trainer(s)`);
        setTimeout(() => {
          onImported();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err?.response?.data?.message || 'Import failed. Check your CSV and try again.');
      toast.error('Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                Bulk Import Trainers
              </h2>
              <p className="text-sm text-gray-500 mt-1">CSV · one row per trainer · saves to MongoDB</p>
            </div>
            <button
              onClick={onClose}
              title="Close modal"
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download the CSV template below</li>
              <li>Fill in trainer details (firstName, lastName, email, mobile are required)</li>
              <li>Upload the completed CSV file</li>
              <li>Trainers will be saved to the database</li>
            </ol>
          </div>

          {/* Download Template Button */}
          <button
            type="button"
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl font-medium text-gray-800 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
          >
            <Download className="w-4 h-4" />
            Download Trainer CSV Template
          </button>

          {/* Upload Area */}
          <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/40 transition-all">
            <Upload className="w-10 h-10 text-gray-400" />
            <span className="font-medium text-gray-900">
              {busy ? 'Importing to database…' : 'Drop CSV here or click to browse'}
            </span>
            <span className="text-xs text-gray-500">
              Will save to <strong>trainers</strong> collection in MongoDB
            </span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              disabled={busy}
              onChange={handleFile}
            />
          </label>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-800 font-medium">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
