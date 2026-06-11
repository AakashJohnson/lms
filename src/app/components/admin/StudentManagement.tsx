import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Search, Download, Clock, BookOpen, Award, TrendingUp, Pencil, Trash2, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../../utils/axiosConfig';

interface StudentManagementProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  batch?: string;
  enrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  avgProgress: number;
  totalTimeSpent: number; // in hours
  avgTimePerCourse: number; // in hours
  certificatesEarned: number;
  lastActive: string;
  joinedDate: string;
  isActive: boolean;
  organization?: string;
  designation?: string;
}

interface CourseProgress {
  courseId: string;
  courseName: string;
  progress: number;
  timeSpent: number;
  status: 'not-started' | 'in-progress' | 'completed';
  enrolledDate: string;
  completedDate?: string;
}

export function StudentManagement({ userRole }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit & Delete modal states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchStudents();
    }
  }, [userRole]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Fetch students with enrollment statistics from new endpoint
      const response = await axiosInstance.get('/admin/students-with-stats');
      console.log('✅ Students API Response:', response.data);
      
      if (response.data.success && response.data.data) {
        // Transform backend data to match our Student interface
        const transformedStudents = response.data.data.map((student: any) => ({
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.mobile,
          department: student.department?.name || 'N/A',
          batch: student.batch?.name || 'N/A',
          enrolledCourses: student.enrolledCourses || 0,
          completedCourses: student.completedCourses || 0,
          inProgressCourses: student.inProgressCourses || 0,
          avgProgress: student.avgProgress || 0,
          totalTimeSpent: student.totalTimeSpent || 0,
          avgTimePerCourse: student.avgTimePerCourse || 0,
          certificatesEarned: student.certificatesEarned || 0,
          lastActive: student.lastLogin || student.updatedAt || new Date().toISOString(),
          joinedDate: student.createdAt || new Date().toISOString(),
          isActive: student.isActive !== undefined ? student.isActive : true,
          organization: student.organization || '',
          designation: student.designation || '',
        }));
        
        console.log('✅ Transformed Students:', transformedStudents);
        setStudents(transformedStudents);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch students:', error);
      console.error('Error response:', error.response);
      // Demo data - Add more students
      setStudents([
        {
          _id: '1',
          firstName: 'Rahul',
          lastName: 'Verma',
          email: 'rahul.verma@example.com',
          phone: '+91 9876500001',
          department: 'Finance',
          batch: 'Batch A - 2026',
          enrolledCourses: 5,
          completedCourses: 3,
          inProgressCourses: 2,
          avgProgress: 68,
          totalTimeSpent: 45.5,
          avgTimePerCourse: 9.1,
          certificatesEarned: 3,
          lastActive: '2026-05-06',
          joinedDate: '2026-01-15',
          isActive: true,
        },
        {
          _id: '2',
          firstName: 'Sneha',
          lastName: 'Gupta',
          email: 'sneha.gupta@example.com',
          phone: '+91 9876500002',
          department: 'Marketing',
          batch: 'Batch A - 2026',
          enrolledCourses: 4,
          completedCourses: 4,
          inProgressCourses: 0,
          avgProgress: 100,
          totalTimeSpent: 38.2,
          avgTimePerCourse: 9.55,
          certificatesEarned: 4,
          lastActive: '2026-05-07',
          joinedDate: '2026-01-20',
          isActive: true,
        },
        {
          _id: '3',
          firstName: 'Vikram',
          lastName: 'Singh',
          email: 'vikram.singh@example.com',
          phone: '+91 9876500003',
          department: 'Operations',
          batch: 'Batch B - 2026',
          enrolledCourses: 3,
          completedCourses: 1,
          inProgressCourses: 2,
          avgProgress: 45,
          totalTimeSpent: 22.8,
          avgTimePerCourse: 7.6,
          certificatesEarned: 1,
          lastActive: '2026-05-05',
          joinedDate: '2026-02-01',
          isActive: true,
        },
        {
          _id: '4',
          firstName: 'Priya',
          lastName: 'Sharma',
          email: 'priya.sharma@example.com',
          phone: '+91 9876500004',
          department: 'HR',
          batch: 'Batch A - 2026',
          enrolledCourses: 6,
          completedCourses: 2,
          inProgressCourses: 4,
          avgProgress: 55,
          totalTimeSpent: 32.4,
          avgTimePerCourse: 5.4,
          certificatesEarned: 2,
          lastActive: '2026-05-07',
          joinedDate: '2026-01-18',
          isActive: true,
        },
        {
          _id: '5',
          firstName: 'Amit',
          lastName: 'Patel',
          email: 'amit.patel@example.com',
          phone: '+91 9876500005',
          department: 'IT',
          batch: 'Batch B - 2026',
          enrolledCourses: 4,
          completedCourses: 3,
          inProgressCourses: 1,
          avgProgress: 78,
          totalTimeSpent: 41.2,
          avgTimePerCourse: 10.3,
          certificatesEarned: 3,
          lastActive: '2026-05-06',
          joinedDate: '2026-01-25',
          isActive: true,
        },
        {
          _id: '6',
          firstName: 'Neha',
          lastName: 'Reddy',
          email: 'neha.reddy@example.com',
          phone: '+91 9876500006',
          department: 'Finance',
          batch: 'Batch C - 2026',
          enrolledCourses: 3,
          completedCourses: 1,
          inProgressCourses: 2,
          avgProgress: 42,
          totalTimeSpent: 18.6,
          avgTimePerCourse: 6.2,
          certificatesEarned: 1,
          lastActive: '2026-05-04',
          joinedDate: '2026-02-10',
          isActive: true,
        },
        {
          _id: '7',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          email: 'rajesh.kumar@example.com',
          phone: '+91 9876500007',
          department: 'Marketing',
          batch: 'Batch A - 2026',
          enrolledCourses: 5,
          completedCourses: 5,
          inProgressCourses: 0,
          avgProgress: 100,
          totalTimeSpent: 52.8,
          avgTimePerCourse: 10.56,
          certificatesEarned: 5,
          lastActive: '2026-05-07',
          joinedDate: '2026-01-12',
          isActive: true,
        },
        {
          _id: '8',
          firstName: 'Anjali',
          lastName: 'Desai',
          email: 'anjali.desai@example.com',
          phone: '+91 9876500008',
          department: 'Operations',
          batch: 'Batch B - 2026',
          enrolledCourses: 4,
          completedCourses: 2,
          inProgressCourses: 2,
          avgProgress: 62,
          totalTimeSpent: 28.4,
          avgTimePerCourse: 7.1,
          certificatesEarned: 2,
          lastActive: '2026-05-06',
          joinedDate: '2026-01-28',
          isActive: true,
        },
        {
          _id: '9',
          firstName: 'Karan',
          lastName: 'Mehta',
          email: 'karan.mehta@example.com',
          phone: '+91 9876500009',
          department: 'IT',
          batch: 'Batch C - 2026',
          enrolledCourses: 3,
          completedCourses: 0,
          inProgressCourses: 3,
          avgProgress: 28,
          totalTimeSpent: 12.3,
          avgTimePerCourse: 4.1,
          certificatesEarned: 0,
          lastActive: '2026-05-03',
          joinedDate: '2026-02-15',
          isActive: true,
        },
        {
          _id: '10',
          firstName: 'Pooja',
          lastName: 'Joshi',
          email: 'pooja.joshi@example.com',
          phone: '+91 9876500010',
          department: 'HR',
          batch: 'Batch A - 2026',
          enrolledCourses: 6,
          completedCourses: 4,
          inProgressCourses: 2,
          avgProgress: 72,
          totalTimeSpent: 48.6,
          avgTimePerCourse: 8.1,
          certificatesEarned: 4,
          lastActive: '2026-05-07',
          joinedDate: '2026-01-22',
          isActive: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    setLoadingDetails(true);
    try {
      const response = await axiosInstance.get(`/admin/students/${studentId}/details`);
      console.log('✅ Student Details Response:', response.data);
      
      if (response.data.success && response.data.data.courses) {
        setCourseProgress(response.data.data.courses);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch student details:', error);
      console.error('Error response:', error.response);
      // Demo course progress data
      setCourseProgress([
        {
          courseId: '1',
          courseName: 'Cooperative Management Fundamentals',
          progress: 100,
          timeSpent: 12.5,
          status: 'completed',
          enrolledDate: '2026-01-20',
          completedDate: '2026-02-15',
        },
        {
          courseId: '2',
          courseName: 'Financial Planning for Cooperatives',
          progress: 75,
          timeSpent: 8.3,
          status: 'in-progress',
          enrolledDate: '2026-02-20',
        },
        {
          courseId: '3',
          courseName: 'Digital Transformation Workshop',
          progress: 100,
          timeSpent: 10.2,
          status: 'completed',
          enrolledDate: '2026-03-01',
          completedDate: '2026-03-25',
        },
      ]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentDetails(student._id);
  };

  const handleEditClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditEmail(student.email);
    setEditPhone(student.phone || '');
    setEditOrganization(student.organization || '');
    setEditDesignation(student.designation || '');
    setEditIsActive(student.isActive);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSaving(true);
    try {
      await axiosInstance.put(`/admin/users/${editingStudent._id}`, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        mobile: editPhone,
        organization: editOrganization,
        designation: editDesignation,
        isActive: editIsActive,
      });
      toast.success('Student record updated successfully!');
      fetchStudents();
      setEditingStudent(null);
    } catch (err: any) {
      console.error('Failed to update student:', err);
      toast.error(err.response?.data?.message || 'Failed to update student record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingStudent) return;
    setSaving(true);
    try {
      await axiosInstance.delete(`/admin/users/${deletingStudent._id}`);
      toast.success('Student record deleted successfully!');
      fetchStudents();
      setDeletingStudent(null);
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      toast.error(err.response?.data?.message || 'Failed to delete student record.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setCourseProgress([]);
  };

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.batch?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Student Detail View
  if (selectedStudent) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              title="Go back to student list"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedStudent.firstName} {selectedStudent.lastName}
              </h2>
              <p className="text-sm text-gray-500">{selectedStudent.email}</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Enrolled Courses</p>
                <p className="text-2xl font-semibold text-gray-900">{selectedStudent.enrolledCourses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{selectedStudent.completedCourses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Time</p>
                <p className="text-2xl font-semibold text-gray-900">{selectedStudent.totalTimeSpent}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Time/Course</p>
                <p className="text-2xl font-semibold text-gray-900">{selectedStudent.avgTimePerCourse}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Student Information</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Department</p>
              <p className="font-medium text-gray-900">{selectedStudent.department || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Batch</p>
              <p className="font-medium text-gray-900">{selectedStudent.batch || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Joined Date</p>
              <p className="font-medium text-gray-900">{new Date(selectedStudent.joinedDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Active</p>
              <p className="font-medium text-gray-900">{new Date(selectedStudent.lastActive).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Course Progress */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Course Progress</h3>
          </div>
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {courseProgress.map((course) => (
                <div key={course.courseId} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{course.courseName}</h4>
                      <p className="text-xs text-gray-500">
                        Enrolled: {new Date(course.enrolledDate).toLocaleDateString()}
                        {course.completedDate && ` • Completed: ${new Date(course.completedDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Time Spent</p>
                        <p className="text-sm font-medium text-gray-900">{course.timeSpent}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Progress</p>
                        <p className="text-sm font-medium text-gray-900">{course.progress}%</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        course.status === 'completed' ? 'bg-green-100 text-green-700' :
                        course.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {course.status === 'completed' ? 'Completed' :
                         course.status === 'in-progress' ? 'In Progress' :
                         'Not Started'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Students List View
  return (
    <div className="space-y-6">
      {/* Premium Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 p-8 md:p-12 border border-white/5 mb-8">
        {/* Premium Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Radial Gradient Blur Circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full mix-blend-screen filter blur-3xl" />

        {/* Content Wrapper */}
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Icon Box with Glow */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50 border border-indigo-400/40">
                <Users className="w-10 h-10 md:w-12 md:h-12 text-white" />
              </div>
            </div>
          </div>

          {/* Title with Gradient & Subtitle */}
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 leading-tight">
              Student <span className="bg-gradient-to-r from-violet-300 to-purple-400 bg-clip-text text-transparent">Management</span> Hub
            </h1>
            <p className="text-base md:text-lg text-slate-300/90">
              Real-time oversight of student enrollments, progress tracking, and academic performance management
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 lg:flex-col">
            <button
              onClick={fetchStudents}
              title="Refresh student list"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl text-indigo-100 text-sm font-bold hover:bg-white/10 hover:text-white transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20"
              aria-label="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => {
                toast.success('Preparing CSV student report export...', { icon: '📊' });
              }}
              title="Export student directory"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/40 transition-all border border-indigo-400/30"
              aria-label="Export"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </section>

      {/* KPI Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:shadow-indigo-500/10 transition-all hover:-translate-y-1 group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs font-bold text-emerald-700">+12%</span>
            </div>
          </div>
          <p className="text-slate-600 text-sm font-semibold mb-1">Total Students</p>
          <p className="text-3xl font-black text-slate-900">{students.length}</p>
        </div>

        {/* Active Students Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:shadow-emerald-500/10 transition-all hover:-translate-y-1 group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs font-bold text-emerald-700">+8%</span>
            </div>
          </div>
          <p className="text-slate-600 text-sm font-semibold mb-1">Active Students</p>
          <p className="text-3xl font-black text-slate-900">{students.filter(s => s.isActive).length}</p>
        </div>

        {/* Total Enrollments Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all hover:-translate-y-1 group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs font-bold text-emerald-700">+15%</span>
            </div>
          </div>
          <p className="text-slate-600 text-sm font-semibold mb-1">Total Enrollments</p>
          <p className="text-3xl font-black text-slate-900">{students.reduce((sum, s) => sum + s.enrolledCourses, 0)}</p>
        </div>

        {/* Average Progress Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:shadow-orange-500/10 transition-all hover:-translate-y-1 group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs font-bold text-emerald-700">+5%</span>
            </div>
          </div>
          <p className="text-slate-600 text-sm font-semibold mb-1">Avg Progress</p>
          <p className="text-3xl font-black text-slate-900">{students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.avgProgress, 0) / students.length) : 0}%</p>
        </div>
      </section>

      {/* Modern Search & Filter Panel */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, email, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium placeholder-slate-400 text-slate-700 transition-all"
              />
            </div>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-3 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Enhanced Student Table */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 flex-col gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-bold">Fetching student records...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="font-extrabold text-slate-600 text-sm">No students found. Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">S.No.</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Enrolled</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => {
                  const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}` || 'S';
                  const gradientPalette = [
                    'from-purple-500 to-purple-600',
                    'from-blue-500 to-blue-600',
                    'from-emerald-500 to-emerald-600',
                    'from-pink-500 to-pink-600',
                    'from-violet-500 to-violet-600',
                    'from-sky-500 to-sky-600',
                    'from-teal-500 to-teal-600'
                  ];
                  const grad = gradientPalette[index % gradientPalette.length];

                  return (
                    <tr
                      key={student._id}
                      onClick={() => handleStudentClick(student)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-slate-700 font-bold text-sm">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{student.firstName} {student.lastName}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                          {student.department || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-100">
                          {student.batch || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs">
                          {student.enrolledCourses}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs">
                          {student.completedCourses}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-[150px]">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                              style={{ width: `${student.avgProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8 text-right">{student.avgProgress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.isActive ? (
                          <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                            ✓ Active
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                            ✕ Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => handleEditClick(e, student)}
                            className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 flex items-center justify-center transition-all group/edit hover:border-indigo-300"
                            title="Edit Student"
                            aria-label="Edit Student"
                          >
                            <Pencil className="w-4 h-4 text-slate-400 group-hover/edit:text-indigo-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingStudent(student);
                            }}
                            className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200 flex items-center justify-center transition-all group/delete hover:border-red-300"
                            title="Delete Student"
                            aria-label="Delete Student"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 group-hover/delete:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Premium Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95">
            <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Edit Student Profile</h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-white/80 hover:text-white transition-colors text-2xl font-bold leading-none"
                title="Close dialog"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter first name"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">Last Name</label>
                  <input
                    type="text"
                    placeholder="Enter last name"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">Organization</label>
                  <input
                    type="text"
                    placeholder="Enter organization"
                    value={editOrganization}
                    onChange={(e) => setEditOrganization(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">Designation</label>
                  <input
                    type="text"
                    placeholder="Enter designation"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Account Status</p>
                  <p className="text-xs text-slate-600">Active students can log in to the platform</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  title="Toggle account status"
                  aria-label={`Account status: ${editIsActive ? 'active' : 'inactive'}`}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    editIsActive ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                      editIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-8 transform transition-all animate-in zoom-in-95">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Delete Student Record?</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Are you sure you want to permanently delete the record for{' '}
              <span className="font-semibold text-slate-900">
                {deletingStudent.firstName} {deletingStudent.lastName}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeletingStudent(null)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteSubmit}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
