import { useEffect, useState } from 'react';
import { Building, CheckCircle2, Clock, Download, Edit, Eye, Loader2, Mail, Phone, Plus, RefreshCw, Search, Trash2, Users, XCircle } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { PremiumCard, PremiumHero, PremiumPageShell, PremiumStatCard } from './premium/PremiumPage';

interface MyStudentsProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organization?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  courses?: string[];
  createdAt: string;
  batch?: {
    _id: string;
    name: string;
    code: string;
  };
}

export function MyStudents({ userRole }: MyStudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    if (userRole === 'trainer') fetchStudents();
  }, [userRole]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/trainer/students');
      if (response.data.success) {
        const studentsData = response.data.data || [];
        setStudents(studentsData.map((student: any) => ({
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.mobile,
          organization: student.organization,
          role: student.role || 'participant',
          isActive: student.isActive,
          isVerified: student.isEmailVerified || false,
          courses: student.enrolledCourses || [],
          createdAt: student.createdAt,
          batch: student.batchInfo,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.isActive).length;
  const pendingStudents = students.filter((student) => !student.isVerified).length;
  const blockedStudents = students.filter((student) => !student.isActive).length;

  const filteredStudents = students.filter((student) => {
    const haystack = `${student.firstName} ${student.lastName} ${student.email || ''} ${student.organization || ''}`.toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && student.isActive) ||
      (filterStatus === 'pending' && !student.isVerified) ||
      (filterStatus === 'blocked' && !student.isActive);
    const matchesRole = filterRole === 'all' || student.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <PremiumPageShell>
      <PremiumHero
        title="Learner Roster"
        subtitle="View, filter, and manage students assigned to your courses and trainer batches."
        eyebrow="Trainer student management"
        icon={Users}
        action={(
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={fetchStudents} className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:bg-indigo-50">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:bg-indigo-50">
              <Download className="h-4 w-4" />
              Import
            </button>
            <button className="hidden h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:bg-indigo-50 xl:flex">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-5 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(79,70,229,.9)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <Plus className="h-4 w-4" />
              Quick Add
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard label="Total Users" value={totalStudents} detail="Assigned learners" icon={Users} tone="from-blue-50 via-sky-50 to-white" accent="text-blue-600" />
        <PremiumStatCard label="Active" value={activeStudents} detail="Currently enabled" icon={CheckCircle2} tone="from-emerald-50 via-teal-50 to-white" accent="text-emerald-600" />
        <PremiumStatCard label="Pending" value={pendingStudents} detail="Needs verification" icon={Clock} tone="from-amber-50 via-yellow-50 to-white" accent="text-amber-600" />
        <PremiumStatCard label="Blocked" value={blockedStudents} detail="Inactive accounts" icon={XCircle} tone="from-red-50 via-rose-50 to-white" accent="text-red-600" />
      </div>

      <PremiumCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-indigo-500" />
          <h3 className="font-black text-slate-950">Filters</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="relative">
            <span className="sr-only">Search students</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or organisation..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </label>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="h-12 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </select>
          <select value={filterRole} onChange={(event) => setFilterRole(event.target.value)} className="h-12 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100">
            <option value="all">All Roles</option>
            <option value="participant">Participant</option>
          </select>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">{filteredStudents.length} results</p>
      </PremiumCard>

      <PremiumCard className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-indigo-200" />
            <p className="mb-2 text-lg font-black text-slate-700">No Students Yet</p>
            <p className="text-sm text-slate-500">Students will appear here when they enroll in your courses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  {['Name', 'Contact', 'Batch', 'Organisation', 'Status', 'Courses', 'Actions'].map((heading) => (
                    <th key={heading} className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="transition-colors hover:bg-indigo-50/35">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 font-black text-white">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-black text-slate-950">{student.firstName} {student.lastName}</p>
                          <p className="text-xs font-medium text-slate-500">Reg. {new Date(student.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-slate-900"><Mail className="h-3 w-3" />{student.email}</div>
                        {student.phone && <div className="mt-1 flex items-center gap-1 text-slate-500"><Phone className="h-3 w-3" />{student.phone}</div>}
                        {!student.isVerified && <span className="text-xs font-bold text-red-600">Not verified</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {student.batch ? (
                        <div className="text-sm"><p className="font-bold text-slate-900">{student.batch.name}</p><p className="text-xs text-slate-500">{student.batch.code}</p></div>
                      ) : <span className="text-sm text-slate-400">None</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-900"><Building className="h-3 w-3" />{student.organization || 'None'}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900">{student.courses?.length || 0}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50" aria-label="View student"><Eye className="h-4 w-4" /></button>
                        <button className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" aria-label="Edit student"><Edit className="h-4 w-4" /></button>
                        <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete student"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumCard>
    </PremiumPageShell>
  );
}
