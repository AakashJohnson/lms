
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  UserCheck,
  UserX,
  Download,
  Upload,
  Eye,
  X,
  BookOpen,
  GraduationCap,
  CalendarDays,
  MapPin,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  UserPlus,
  RefreshCw,
  SlidersHorizontal,
  Funnel,
  ArrowRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import { StudentOnboarding, type OnboardingStudentPayload } from './StudentOnboarding';
import axios from 'axios';

// ─── API Config ───────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:5000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStatus = 'Active' | 'Pending' | 'Blocked';
type UserRole = 'Student' | 'Trainer' | 'Admin';

interface LMSUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  registrationDate: string;
  otpVerified: boolean;
  gender?: string;
  dob?: string;
  address?: string;
  state?: string;
  district?: string;
  organization?: string;
  designation?: string;
  qualification?: string;
  enrolledCourses?: string[];
  batchId?: string;
  profilePic?: string;
  notes?: string;
}

// Map backend user → frontend LMSUser
function mapBackendUser(u: any): LMSUser {
  const roleMap: Record<string, UserRole> = {
    administrator: 'Admin',
    trainer: 'Trainer',
    student: 'Student',
  };
  let status: UserStatus = 'Active';
  if (!u.isApproved) status = 'Pending';
  else if (!u.isActive) status = 'Blocked';

  return {
    id: u._id,
    _id: u._id,
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    email: u.email || '',
    phone: u.mobile || '',
    role: roleMap[u.role] || 'Student',
    status,
    registrationDate: u.createdAt ? u.createdAt.split('T')[0] : '',
    otpVerified: u.isMobileVerified || false,
    organization: u.organization || '',
    designation: u.designation || '',
    state: u.state || '',
    district: u.district || '',
    enrolledCourses: [],
    batchId: '',
  };
}

const COURSES = [
  'Cooperative Management Fundamentals',
  'Digital Marketing for Cooperatives',
  'Financial Literacy & Accounting',
  'Legal Compliance for Cooperatives',
];

const BATCHES = ['Batch A - 2026', 'Batch B - 2026', 'Batch C - 2025', 'Batch D - 2025'];

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

const EMPTY_USER: Omit<LMSUser, 'id' | 'registrationDate' | 'otpVerified'> = {
  name: '',
  email: '',
  phone: '',
  role: 'Student',
  status: 'Pending',
  gender: '',
  dob: '',
  address: '',
  state: '',
  district: '',
  organization: '',
  designation: '',
  qualification: '',
  enrolledCourses: [],
  batchId: '',
  notes: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface UserManagementProps {
  userRole?: 'admin' | 'trainer';
}

export function UserManagement({ userRole = 'admin' }: UserManagementProps) {
  const [users, setUsers] = useState<LMSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [showOnboardingPage, setShowOnboardingPage] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<LMSUser | null>(null);
  const [viewUser, setViewUser] = useState<LMSUser | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // ── Fetch from backend ────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserRole = currentUser.role; // Backend role: 'administrator', 'trainer', 'student'
    
    console.log('👤 Current user role:', currentUserRole);
    console.log('📋 Component userRole prop:', userRole);
    
    // Only admins and trainers can access user management
    if (currentUserRole !== 'administrator' && currentUserRole !== 'trainer') {
      setApiError('Access Denied: Only administrators and trainers can access user management.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setApiError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setApiError('Not logged in. Please login again.');
        setLoading(false);
        return;
      }
      
      // Use different endpoint based on role
      const endpoint = currentUserRole === 'trainer' 
        ? `${API_BASE}/users/students?limit=500&page=1&role=student`
        : `${API_BASE}/admin/users?limit=500&page=1`;
      
      console.log('🔗 Fetching from:', endpoint);
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('✅ API Response:', res.data);
      
      const mapped = (res.data.data || []).map(mapBackendUser);
      console.log(`✅ Loaded ${mapped.length} users from DB`);
      setUsers(mapped);
    } catch (err: any) {
      console.error('fetchUsers error:', err?.response?.status, err?.response?.data);
      
      // Handle 403 Forbidden specifically
      if (err?.response?.status === 403) {
        setApiError('Access Denied: You do not have permission to view user management.');
      } else {
        setApiError(
          err?.response?.status === 401
            ? 'Session expired. Please login again.'
            : err?.response?.data?.message || 'Failed to load users from server.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q) || u.organization?.toLowerCase().includes(q);
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const matchStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── Status change → backend ───────────────────────────────────────────────
  const updateStatus = async (id: string, status: UserStatus) => {
    try {
      const user = users.find((u) => u.id === id);
      if (status === 'Active') {
        if (user?.status === 'Pending') {
          await axios.put(`${API_BASE}/admin/users/${id}/approve`, {}, { headers: getAuthHeaders() });
        } else {
          await axios.put(`${API_BASE}/admin/users/${id}/activate`, {}, { headers: getAuthHeaders() });
        }
      } else if (status === 'Blocked') {
        await axios.put(`${API_BASE}/admin/users/${id}/deactivate`, {}, { headers: getAuthHeaders() });
      }
      setUsers((u) => u.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Action failed');
    }
  };

  // ── Role change → backend ─────────────────────────────────────────────────
  const updateRole = async (id: string, role: UserRole) => {
    const roleMap: Record<UserRole, string> = { Admin: 'administrator', Trainer: 'trainer', Student: 'student' };
    try {
      await axios.put(`${API_BASE}/admin/users/${id}`, { role: roleMap[role] }, { headers: getAuthHeaders() });
      setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Role update failed');
    }
  };

  // ── Delete → backend ──────────────────────────────────────────────────────
  const deleteUser = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/admin/users/${id}`, { headers: getAuthHeaders() });
      setUsers((u) => u.filter((x) => x.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  // ── Save (add/edit) → backend ─────────────────────────────────────────────
  const saveUser = async (userData: Omit<LMSUser, 'id' | 'registrationDate' | 'otpVerified'>) => {
    if (editUser) {
      try {
        const [firstName, ...rest] = userData.name.split(' ');
        await axios.put(`${API_BASE}/admin/users/${editUser.id}`, { firstName, lastName: rest.join(' ') || '-', organization: userData.organization, designation: userData.designation }, { headers: getAuthHeaders() });
        setUsers((u) => u.map((x) => (x.id === editUser.id ? { ...editUser, ...userData } : x)));
        setEditUser(null);
      } catch (err: any) { alert(err?.response?.data?.message || 'Update failed'); }
    } else {
      try {
        const [firstName, ...rest] = userData.name.split(' ');
        const roleMap: Record<UserRole, string> = { Admin: 'administrator', Trainer: 'trainer', Student: 'student' };
        const importRole = roleMap[userData.role] === 'administrator' ? 'student' : roleMap[userData.role];
        await axios.post(`${API_BASE}/admin/users/bulk-import`, {
          role: importRole,
          users: [{ firstName, lastName: rest.join(' ') || '-', email: userData.email, mobile: userData.phone.replace(/\D/g, '').slice(-10), organization: userData.organization || '', designation: userData.designation || '' }],
        }, { headers: getAuthHeaders() });
        setShowAddModal(false);
        fetchUsers();
      } catch (err: any) { alert(err?.response?.data?.message || 'Add user failed'); }
    }
  };

  const totals = {
    total: users.length,
    active: users.filter((u) => u.status === 'Active').length,
    pending: users.filter((u) => u.status === 'Pending').length,
    blocked: users.filter((u) => u.status === 'Blocked').length,
    trainers: users.filter((u) => u.role === 'Trainer').length,
  };

  // ── Onboarding → backend ──────────────────────────────────────────────────
  const saveFromOnboarding = async (payload: OnboardingStudentPayload) => {
    try {
      const [firstName, ...rest] = payload.name.split(' ');
      await axios.post(`${API_BASE}/admin/users/bulk-import`, {
        role: 'student',
        users: [{ firstName, lastName: rest.join(' ') || '-', email: payload.email, mobile: payload.phone.replace(/\D/g, '').slice(-10), organization: payload.organization || '', designation: payload.designation || '' }],
      }, { headers: getAuthHeaders() });
      setShowOnboardingPage(false);
      fetchUsers();
    } catch (err: any) { alert(err?.response?.data?.message || 'Onboarding failed'); }
  };

  if (showOnboardingPage) {
    return <StudentOnboarding userRole={userRole} onBack={() => setShowOnboardingPage(false)} onComplete={saveFromOnboarding} />;
  }

  const statCards = [
    { label: 'Total Users', value: totals.total, description: 'All registered users', icon: Users, accent: 'blue' as const },
    { label: 'Active', value: totals.active, description: 'Currently active', icon: CheckCircle2, accent: 'green' as const },
    { label: 'Pending', value: totals.pending, description: 'Awaiting approval', icon: Clock, accent: 'amber' as const },
    { label: 'Blocked', value: totals.blocked, description: 'Access restricted', icon: XCircle, accent: 'rose' as const },
    { label: 'Trainers', value: totals.trainers, description: 'Assigned as trainer', icon: Shield, accent: 'violet' as const },
  ];

  const heroActions = [
    { label: 'Refresh', icon: RefreshCw, onClick: fetchUsers, variant: 'neutral' as const, loading },
    { label: 'Bulk import (Excel)', icon: FileSpreadsheet, onClick: () => setShowBulkModal(true), variant: 'neutral' as const },
    { label: 'Export', icon: Download, onClick: () => {}, variant: 'neutral' as const },
    { label: 'Quick add', icon: Plus, onClick: () => setShowAddModal(true), variant: 'soft' as const },
    { label: 'Onboard student', icon: UserPlus, onClick: () => setShowOnboardingPage(true), variant: 'primary' as const },
  ];

  return (
    <div className="relative min-h-screen space-y-6 bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 left-1/3 h-56 w-56 rounded-full bg-cyan-200/20 blur-3xl" />

      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.08),transparent_28%)]" />
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[linear-gradient(135deg,transparent_60%,rgba(79,70,229,0.08)_100%)] opacity-70" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              User Administration
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                {userRole === 'trainer' ? 'My Students' : 'User Management'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                {userRole === 'trainer'
                  ? 'View and manage students in your courses with a clean, focused workflow.'
                  : 'Manage users, roles, and course enrollments from a premium admin workspace.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {heroActions.map((action) => (
              <ActionButton key={action.label} {...action} />
            ))}
          </div>
        </div>
      </section>

      {apiError && <ErrorBanner message={apiError} onRetry={fetchUsers} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading ? Array.from({ length: 5 }, (_, index) => <StatSkeleton key={index} />) : statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
              <Funnel className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Filters</h3>
              <p className="text-sm text-slate-500">Search and narrow the user list</p>
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
            {filtered.length} results
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_180px_180px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone, or organisation..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          >
            <option>All</option>
            <option>Student</option>
            <option>Trainer</option>
            <option>Admin</option>
          </select>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          >
            <option>All</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Blocked</option>
          </select>
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            More Filters
          </button>
        </div>
      </section>

      {totals.pending > 0 && (
        <section className="rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm shadow-orange-200">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Pending Approval Queue</p>
                <p className="text-sm text-slate-600">{totals.pending} user{totals.pending !== 1 ? 's' : ''} are waiting for approval</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter('Pending')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              aria-label="Review queue"
            >
              Review Queue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Users</h3>
            <p className="text-sm text-slate-500">Review users, roles, and approval status</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {userRole === 'trainer' ? 'Trainer view' : 'Admin view'}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    {['User', 'Contact', 'Organisation', 'Role', 'Status', 'Courses', 'Actions'].map((header) => (
                      <th key={header} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onPrimaryAction={() => setShowOnboardingPage(true)} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    {['User', 'Contact', 'Organisation', 'Role', 'Status', 'Courses', 'Actions'].map((header) => (
                      <th key={header} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      userRole={userRole}
                      onView={() => setViewUser(user)}
                      onEdit={() => setEditUser(user)}
                      onDelete={() => deleteUser(user.id)}
                      onStatusChange={(s) => updateStatus(user.id, s)}
                      onRoleChange={(r) => updateRole(user.id, r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 px-5 py-4">
              <PaginationFooter
                filteredCount={filtered.length}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
              />
            </div>
          </>
        )}
      </section>

      {(showAddModal || editUser) && <UserFormModal user={editUser} managerRole={userRole} onSave={saveUser} onClose={() => { setShowAddModal(false); setEditUser(null); }} />}
      {viewUser && <UserProfileModal user={viewUser} onClose={() => setViewUser(null)} />}
      {showBulkModal && (
        <BulkImportStudentsModal
          existingEmails={new Set(users.map((u) => u.email.toLowerCase()))}
          onClose={() => setShowBulkModal(false)}
          onImported={() => { setShowBulkModal(false); fetchUsers(); }}
          defaultRole="Student"
        />
      )}
    </div>
  );
}

function parseBulkCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === ',' && !q) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitRow(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitRow(lines[li]);
    if (cells.every((c) => !c)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function BulkImportStudentsModal({
  existingEmails,
  onClose,
  onImported,
  defaultRole,
}: {
  existingEmails: Set<string>;
  onClose: () => void;
  onImported: () => void;
  defaultRole: UserRole;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importRole, setImportRole] = useState<'trainer' | 'student'>('student');

  const downloadTemplate = () => {
    const isTrainer = importRole === 'trainer';
    // Use "name" column (single field) - easier for users, we split it on import
    const header = isTrainer
      ? 'name,email,phone,organisation,designation,specialization,experience'
      : 'name,email,phone,organisation,batch,courses,state,district,gender,qualification';
    const sample = isTrainer
      ? 'John Doe,john.doe@example.com,9876543210,ABC Cooperative,Senior Trainer,"Management|Finance",5'
      : 'Raj Kumar,raj.kumar@example.com,9876543211,XYZ Cooperative,Batch A - 2026,"Cooperative Management Fundamentals|Financial Literacy & Accounting",Uttar Pradesh,Lucknow,Male,Graduate';
    const blob = new Blob([`${header}\n${sample}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importRole}-import-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.txt')) {
      setError('Please upload a .csv file.');
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseBulkCsv(text);
      if (!parsed.length) {
        setError('No data rows found. Use the template header row exactly as provided.');
        setBusy(false);
        return;
      }

      // Helper: fix Excel scientific notation phone numbers like 9.20E+11 → 9200000000
      const fixPhone = (raw: string): string => {
        if (!raw) return '';
        const trimmed = raw.trim();
        // Handle scientific notation (e.g. 9.20E+11, 9.2E+11, 9.199895E+11)
        if (/^[\d.]+[eE][+\-]?\d+$/.test(trimmed)) {
          // Use BigInt-safe conversion via toFixed to avoid floating point loss
          const num = Number(trimmed);
          // Convert to full integer string without scientific notation
          const full = num.toLocaleString('fullwide', { maximumFractionDigits: 0 }).replace(/,/g, '');
          return full.replace(/\D/g, '').slice(-10);
        }
        return trimmed.replace(/\D/g, '').slice(-10);
      };

      // Helper: split "Full Name" into firstName + lastName
      const splitName = (fullName: string): { firstName: string; lastName: string } => {
        const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return { firstName: 'Unknown', lastName: 'User' };
        if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }; // use same for both if single name
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        return { firstName, lastName };
      };

      // Map CSV rows — supports BOTH old format (name) and new format (firstName/lastName)
      const usersToImport = parsed
        .filter((row) => {
          const hasName = row.name || row.firstname || row.firstName;
          const hasEmail = row.email;
          return hasName && hasEmail;
        })
        .map((row) => {
          // Support both "name" (old template) and "firstName"/"lastName" (new template)
          let firstName: string;
          let lastName: string;
          if (row.name) {
            const split = splitName(row.name);
            firstName = split.firstName;
            lastName = split.lastName;
          } else {
            firstName = (row.firstname || row.firstName || '').trim();
            lastName = (row.lastname || row.lastName || '-').trim();
          }

          const rawPhone = row.phone || row.mobile || '';
          const mobile = fixPhone(rawPhone);

          return {
            firstName,
            lastName,
            email: (row.email || '').trim().toLowerCase(),
            mobile,
            organization: (row.organisation || row.organization || '').trim(),
            designation: (row.designation || '').trim(),
            specialization: (row.specialization || '').trim(),
            experience: parseInt(row.experience || '0') || 0,
          };
        })
        .filter((u) => u.firstName && u.email && u.mobile.length >= 10);

      if (!usersToImport.length) {
        setError('No valid rows found. Ensure name, email, and phone (10 digits) columns are filled.');
        setBusy(false);
        return;
      }

      // Save to backend
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}/admin/users/bulk-import`,
        { role: importRole, users: usersToImport },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = res.data.data;
      const msg = `✅ Import complete!\n${result.success.length} users saved to ${importRole}s collection.${result.errors.length > 0 ? `\n⚠️ ${result.errors.length} errors:\n${result.errors.map((e: any) => `Row ${e.row}: ${e.error}`).join('\n')}` : ''}`;
      alert(msg);
      onImported();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Import failed. Check your CSV and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
              Bulk import users
            </h2>
            <p className="text-sm text-gray-500 mt-1">CSV · one row per user · saves to MongoDB</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close bulk import dialog" title="Close" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-5 flex-1">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select User Type to Import</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImportRole('student')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${importRole === 'student' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="font-semibold text-gray-900">Students</p>
                <p className="text-xs text-gray-500 mt-1">Saves to <code className="bg-gray-100 px-1 rounded">students</code> collection</p>
              </button>
              <button
                type="button"
                onClick={() => setImportRole('trainer')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${importRole === 'trainer' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="font-semibold text-gray-900">Trainers</p>
                <p className="text-xs text-gray-500 mt-1">Saves to <code className="bg-gray-100 px-1 rounded">trainers</code> collection</p>
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-gray-700 space-y-2">
            <p className="font-semibold text-indigo-900">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-indigo-900/85">
              <li>Select user type above (Students or Trainers).</li>
              <li>Download the template and fill in Excel.</li>
              <li>Save as <strong>CSV UTF-8</strong> and upload here.</li>
              <li>Data saves directly to MongoDB!</li>
            </ol>
            <div className="mt-2 pt-2 border-t border-indigo-200">
              <p className="font-semibold text-indigo-900 mb-1">Required columns:</p>
              <code className="text-xs bg-white px-2 py-1 rounded border border-indigo-200 block">
                name, email, phone, organisation
              </code>
              <p className="text-xs text-indigo-700 mt-1">
                ⚠️ Phone must be 10 digits. Excel scientific notation (9.20E+11) is handled automatically.
              </p>
            </div>
          </div>

          <button type="button" onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl font-medium text-gray-800 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
            <Download className="w-4 h-4" />
            Download {importRole} CSV template
          </button>

          <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/40 transition-all">
            <Upload className="w-10 h-10 text-gray-400" />
            <span className="font-medium text-gray-900">{busy ? 'Importing to database…' : 'Drop CSV here or click to browse'}</span>
            <span className="text-xs text-gray-500">Will save to <strong>{importRole}s</strong> collection in MongoDB</span>
            <input type="file" accept=".csv,text/csv,text/plain" className="hidden" disabled={busy} onChange={handleFile} />
          </label>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="w-full py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  userRole,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onRoleChange,
}: {
  user: LMSUser;
  userRole: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: UserStatus) => void;
  onRoleChange: (r: UserRole) => void;
}) {
  const StatusIcon = user.status === 'Active' ? CheckCircle2 : user.status === 'Pending' ? Clock : XCircle;
  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <tr className="group transition-colors hover:bg-slate-50/80">
      <td className="px-5 py-5 align-top">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-sm font-semibold text-white shadow-sm ring-4 ring-indigo-50">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">Reg. {new Date(user.registrationDate).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-5 align-top">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="break-all">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{user.phone}</span>
          </div>
          {user.otpVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              OTP verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <XCircle className="h-3.5 w-3.5" />
              Not verified
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-5 align-top">
        <p className="text-sm font-medium text-slate-700">{user.organization || '—'}</p>
        {user.state && <p className="mt-1 text-xs text-slate-400">{user.state}</p>}
      </td>
      <td className="px-5 py-5 align-top">
        {userRole === 'admin' ? (
          <RoleDropdown value={user.role} onChange={(nextRole) => onRoleChange(nextRole)} />
        ) : (
          <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {user.role}
          </span>
        )}
      </td>
      <td className="px-5 py-5 align-top">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${user.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : user.status === 'Pending' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {user.status}
        </span>
      </td>
      <td className="px-5 py-5 align-top">
        <p className="text-sm text-slate-500">
          {user.enrolledCourses?.length
            ? `${user.enrolledCourses.length} course${user.enrolledCourses.length > 1 ? 's' : ''}`
            : '—'}
        </p>
        {user.batchId && <p className="mt-1 text-xs text-indigo-600">{user.batchId}</p>}
      </td>
      <td className="px-5 py-5 align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <ActionIconButton title="View profile" className="text-slate-500 hover:bg-blue-50 hover:text-blue-600" onClick={onView}>
            <Eye className="h-4 w-4" />
          </ActionIconButton>
          <ActionIconButton title="Edit user" className="text-blue-500 hover:bg-blue-50" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </ActionIconButton>
          {user.status === 'Pending' && (
            <>
              <ActionIconButton title="Approve user" className="text-emerald-500 hover:bg-emerald-50" onClick={() => onStatusChange('Active')}>
                <UserCheck className="h-4 w-4" />
              </ActionIconButton>
              <ActionIconButton title="Reject user" className="text-rose-500 hover:bg-rose-50" onClick={() => onStatusChange('Blocked')}>
                <UserX className="h-4 w-4" />
              </ActionIconButton>
            </>
          )}
          {user.status === 'Active' && (
            <ActionIconButton title="Block user" className="text-rose-500 hover:bg-rose-50" onClick={() => onStatusChange('Blocked')}>
              <UserX className="h-4 w-4" />
            </ActionIconButton>
          )}
          {user.status === 'Blocked' && (
            <ActionIconButton title="Unblock user" className="text-emerald-500 hover:bg-emerald-50" onClick={() => onStatusChange('Active')}>
              <UserCheck className="h-4 w-4" />
            </ActionIconButton>
          )}
          <ActionIconButton
            title="Delete user"
            className="text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => {
              if (confirm(`Delete ${user.name}?`)) onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </ActionIconButton>
        </div>
      </td>
    </tr>
  );
}

// ─── Add / Edit Form Modal ────────────────────────────────────────────────────

function UserFormModal({
  user,
  managerRole,
  onSave,
  onClose,
}: {
  user: LMSUser | null;
  managerRole: 'admin' | 'trainer';
  onSave: (data: Omit<LMSUser, 'id' | 'registrationDate' | 'otpVerified'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<LMSUser, 'id' | 'registrationDate' | 'otpVerified'>>(
    user
      ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          gender: user.gender || '',
          dob: user.dob || '',
          address: user.address || '',
          state: user.state || '',
          district: user.district || '',
          organization: user.organization || '',
          designation: user.designation || '',
          qualification: user.qualification || '',
          enrolledCourses: user.enrolledCourses || [],
          batchId: user.batchId || '',
          notes: user.notes || '',
        }
      : { ...EMPTY_USER, role: managerRole === 'trainer' ? ('Student' as UserRole) : EMPTY_USER.role }
  );
  const [tab, setTab] = useState<'personal' | 'academic' | 'courses'>('personal');
  const [saving, setSaving] = useState(false);

  const set = useCallback(<K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    const payload =
      managerRole === 'trainer' ? { ...form, role: 'Student' as UserRole } : form;
    onSave(payload);
  };

  const TABS = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'academic', label: 'Academic / Work' },
    { id: 'courses', label: 'Courses & Batch' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user ? 'Edit Student / User' : 'Add New Student'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {user ? `Editing ${user.name}` : 'Fill in the details below'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close user form dialog" title="Close" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Email Address" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="email@example.com"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Phone Number">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Gender">
                <select aria-label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputClass}>
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </FormField>
              <FormField label="Date of Birth">
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => set('dob', e.target.value)}
                  aria-label="Date of birth"
                  title="Date of birth"
                  className={inputClass}
                />
              </FormField>
              {managerRole === 'admin' && (
                <FormField label="Role">
                  <select aria-label="Role" value={form.role} onChange={(e) => set('role', e.target.value as UserRole)} className={inputClass}>
                    <option>Student</option>
                    <option>Trainer</option>
                    <option>Admin</option>
                  </select>
                </FormField>
              )}
              <FormField label="Account Status">
                <select aria-label="Account status" value={form.status} onChange={(e) => set('status', e.target.value as UserStatus)} className={inputClass}>
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Blocked</option>
                </select>
              </FormField>
              <FormField label="Address" className="md:col-span-2">
                <textarea
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Street address"
                  rows={2}
                  className={inputClass}
                />
              </FormField>
              <FormField label="State">
                <select aria-label="State" value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="District">
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                  placeholder="District"
                  className={inputClass}
                />
              </FormField>
            </div>
          )}

          {tab === 'academic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Organisation / Society">
                <input
                  type="text"
                  value={form.organization}
                  onChange={(e) => set('organization', e.target.value)}
                  placeholder="e.g. Lucknow Co-op Society"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Designation">
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => set('designation', e.target.value)}
                  placeholder="e.g. Manager"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Qualification">
                <select aria-label="Qualification" value={form.qualification} onChange={(e) => set('qualification', e.target.value)} className={inputClass}>
                  <option value="">Select qualification</option>
                  <option>Below 10th</option>
                  <option>10th Pass</option>
                  <option>12th Pass</option>
                  <option>Diploma</option>
                  <option>Graduate</option>
                  <option>Post Graduate</option>
                  <option>PhD</option>
                </select>
              </FormField>
              <FormField label="Notes" className="md:col-span-2">
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Internal notes about this user…"
                  rows={3}
                  className={inputClass}
                />
              </FormField>
            </div>
          )}

          {tab === 'courses' && (
            <div className="space-y-5">
              <FormField label="Assign to Batch">
                <select
                  aria-label="Batch"
                  value={form.batchId}
                  onChange={(e) => set('batchId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">No batch assigned</option>
                  {BATCHES.map((b) => <option key={b}>{b}</option>)}
                </select>
              </FormField>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enroll in Courses
                </label>
                <div className="space-y-2">
                  {COURSES.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.enrolledCourses?.includes(c) ?? false}
                        onChange={(e) =>
                          set(
                            'enrolledCourses',
                            e.target.checked
                              ? [...(form.enrolledCourses || []), c]
                              : (form.enrolledCourses || []).filter((x) => x !== c)
                          )
                        }
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <BookOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.enrolledCourses && form.enrolledCourses.length > 0 && (
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-indigo-700 mb-2">Enrolled courses:</p>
                  <div className="flex flex-wrap gap-2">
                    {form.enrolledCourses.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full text-xs"
                      >
                        {c}
                        <button
                          onClick={() =>
                            set('enrolledCourses', (form.enrolledCourses || []).filter((x) => x !== c))
                          }
                          aria-label={`Remove ${c}`}
                          title={`Remove ${c}`}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name || !form.email || saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:shadow-lg transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {user ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Profile Modal ───────────────────────────────────────────────────────

function UserProfileModal({ user, onClose }: { user: LMSUser; onClose: () => void }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const StatusIcon = user.status === 'Active' ? CheckCircle2 : user.status === 'Pending' ? Clock : XCircle;
  const statusColor =
    user.status === 'Active' ? 'text-green-600 bg-green-100' :
    user.status === 'Pending' ? 'text-yellow-600 bg-yellow-100' :
    'text-red-600 bg-red-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-t-2xl p-6 text-white">
          <button
            onClick={onClose}
            aria-label="Close profile dialog"
            title="Close"
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold">
              {initials}
            </div>
            <div>
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-indigo-200 text-sm">{user.role}</p>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                <StatusIcon className="w-3 h-3" />
                {user.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <InfoSection title="Contact Information" icon={Mail}>
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Phone" value={user.phone} />
            {user.gender && <InfoRow icon={Users} label="Gender" value={user.gender} />}
            {user.dob && <InfoRow icon={CalendarDays} label="Date of Birth" value={user.dob} />}
          </InfoSection>

          {(user.state || user.organization) && (
            <InfoSection title="Location & Organisation" icon={Building2}>
              {user.organization && <InfoRow icon={Building2} label="Organisation" value={user.organization} />}
              {user.designation && <InfoRow icon={Shield} label="Designation" value={user.designation} />}
              {user.state && <InfoRow icon={MapPin} label="Location" value={`${user.district || ''} ${user.state}`.trim()} />}
              {user.qualification && <InfoRow icon={GraduationCap} label="Qualification" value={user.qualification} />}
            </InfoSection>
          )}

          {(user.enrolledCourses?.length || user.batchId) && (
            <InfoSection title="Enrollment" icon={BookOpen}>
              {user.batchId && <InfoRow icon={Users} label="Batch" value={user.batchId} />}
              {user.enrolledCourses && user.enrolledCourses.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Enrolled Courses:</p>
                  <div className="space-y-1">
                    {user.enrolledCourses.map((c) => (
                      <div key={c} className="flex items-center gap-2 text-sm text-gray-700">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </InfoSection>
          )}

          {user.notes && (
            <InfoSection title="Notes" icon={FileIcon}>
              <p className="text-sm text-gray-600">{user.notes}</p>
            </InfoSection>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white';

function FormField({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ElementType;
  accent: 'blue' | 'green' | 'amber' | 'rose' | 'violet';
}) {
  const palette: Record<typeof accent, { card: string; icon: string; accent: string; bars: string }> = {
    blue: { card: 'from-blue-50 via-white to-indigo-50', icon: 'bg-blue-100 text-blue-600', accent: 'text-blue-600', bars: 'bg-blue-500' },
    green: { card: 'from-emerald-50 via-white to-green-50', icon: 'bg-emerald-100 text-emerald-600', accent: 'text-emerald-600', bars: 'bg-emerald-500' },
    amber: { card: 'from-amber-50 via-white to-yellow-50', icon: 'bg-amber-100 text-amber-600', accent: 'text-amber-600', bars: 'bg-amber-500' },
    rose: { card: 'from-rose-50 via-white to-red-50', icon: 'bg-rose-100 text-rose-600', accent: 'text-rose-600', bars: 'bg-rose-500' },
    violet: { card: 'from-violet-50 via-white to-purple-50', icon: 'bg-violet-100 text-violet-600', accent: 'text-violet-600', bars: 'bg-violet-500' },
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${palette[accent].card} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
      <div className="absolute right-3 top-3 text-6xl font-bold tracking-tighter text-slate-900/5">{label.charAt(0)}</div>
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${palette[accent].icon} shadow-sm`}>
            <Icon className={`h-5 w-5 ${palette[accent].accent}`} />
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-950">{value.toLocaleString()}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex h-full items-end gap-1 pt-4">
          {[18, 32, 24, 42].map((height, index) => (
            <div
              key={index}
              className={`${palette[accent].bars} w-1.5 rounded-full ${index === 3 ? 'opacity-100' : index === 2 ? 'opacity-80' : index === 1 ? 'opacity-60' : 'opacity-40'}`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-11 w-11 rounded-2xl bg-slate-100" />
      <div className="mt-4 h-8 w-20 rounded-lg bg-slate-100" />
      <div className="mt-3 h-4 w-28 rounded-lg bg-slate-100" />
      <div className="mt-2 h-3 w-36 rounded-lg bg-slate-100" />
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  variant,
  loading,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant: 'neutral' | 'soft' | 'primary';
  loading?: boolean;
}) {
  const styles = {
    neutral: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    soft: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    primary: 'border-transparent bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md shadow-cyan-200 hover:shadow-lg',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] ${styles[variant]}`}
    >
      <Icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-rose-900">Failed to load users</p>
          <p className="text-sm text-rose-700">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-rose-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const config = {
    Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Pending: 'border-amber-200 bg-amber-50 text-amber-700',
    Blocked: 'border-rose-200 bg-rose-50 text-rose-700',
  }[status];
  const Icon = status === 'Active' ? CheckCircle2 : status === 'Pending' ? Clock : XCircle;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function RoleDropdown({ value, onChange }: { value: UserRole; onChange: (nextRole: UserRole) => void }) {
  return (
    <div className="relative inline-flex">
      <select
        aria-label="Change role"
        value={value}
        onChange={(e) => onChange(e.target.value as UserRole)}
        className="h-11 appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
      >
        <option>Student</option>
        <option>Trainer</option>
        <option>Admin</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function ActionIconButton({
  title,
  className,
  onClick,
  children,
}: {
  title: string;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent transition-all duration-200 hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </button>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-slate-100" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="h-3 w-24 rounded bg-slate-100" />
          </div>
        </div>
      </td>
      <td className="px-5 py-5"><div className="h-4 w-44 rounded bg-slate-100" /></td>
      <td className="px-5 py-5"><div className="h-4 w-40 rounded bg-slate-100" /></td>
      <td className="px-5 py-5"><div className="h-10 w-28 rounded-xl bg-slate-100" /></td>
      <td className="px-5 py-5"><div className="h-8 w-24 rounded-full bg-slate-100" /></td>
      <td className="px-5 py-5"><div className="h-4 w-20 rounded bg-slate-100" /></td>
      <td className="px-5 py-5">
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-lg bg-slate-100" />
          <div className="h-10 w-10 rounded-lg bg-slate-100" />
          <div className="h-10 w-10 rounded-lg bg-slate-100" />
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ onPrimaryAction }: { onPrimaryAction: () => void }) {
  return (
    <div className="border-t border-slate-200 px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Users className="h-7 w-7" />
      </div>
      <h4 className="mt-4 text-lg font-semibold text-slate-900">No users found</h4>
      <p className="mt-1 text-sm text-slate-500">Try adjusting filters or onboard a new student.</p>
      <button
        type="button"
        onClick={onPrimaryAction}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-semibold text-white shadow-md shadow-cyan-200 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        <UserPlus className="h-4 w-4" />
        Onboard student
      </button>
    </div>
  );
}

function PaginationFooter({
  filteredCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const start = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(filteredCount, page * pageSize);
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-slate-500">
        Showing {start}–{end} of {filteredCount} users
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-all ${page === pageNumber ? 'border-transparent bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-200' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <label className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:self-auto">
          <span className="whitespace-nowrap">Page size</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            <option value={8}>8 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function InfoSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-indigo-500" />
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
      </div>
      <div className="space-y-2 pl-6">{children}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return <BookOpen className={className} />;
}
