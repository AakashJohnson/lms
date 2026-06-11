import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Award, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, Eye, GraduationCap, Mail, Phone, Search, User, Plus, Filter,
  MoreHorizontal, Trash2, Edit, ToggleLeft, ToggleRight, RefreshCw, Loader2,
  Users, TrendingUp, Activity, X, Check
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../utils/axiosConfig';

type UserStatus = 'Active' | 'Pending' | 'Blocked';
type UserRole = 'student' | 'trainer' | 'admin';

interface UserSummary {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  isApproved: boolean;
  department?: { _id: string; name: string };
  enrolledCourses: number;
  completedCourses: number;
  assessmentsCompleted: number;
  certificatesDownloaded: number;
  createdAt: string;
  lastLogin?: string;
}

interface AdminUserInsightsProps {
  selectedUserId: string | null;
  onBackToDashboard: () => void;
  onOpenUser: (userId: string) => void;
  onBackToList: () => void;
}

export function AdminUserInsights({
  selectedUserId,
  onBackToDashboard,
  onOpenUser,
  onBackToList,
}: AdminUserInsightsProps) {
  if (selectedUserId) {
    return <UserDetailPage userId={selectedUserId} onBackToList={onBackToList} />;
  }

  return <UserListPage onBackToDashboard={onBackToDashboard} onOpenUser={onOpenUser} />;
}

function UserListPage({ onBackToDashboard, onOpenUser }: { onBackToDashboard: () => void; onOpenUser: (id: string) => void }) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | UserStatus>('All');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const perPage = 10;

  const fetchUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await axiosInstance.get('/users', {
        params: {
          page,
          limit: 100,
          search: query || undefined,
          role: roleFilter !== 'All' ? roleFilter : undefined,
          isActive: statusFilter !== 'All' ? statusFilter === 'Active' : undefined,
        }
      });

      if (response.data.success) {
        const userData = response.data.data || [];
        const mappedUsers: UserSummary[] = userData.map((u: any) => ({
          _id: u._id,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          mobile: u.mobile || '',
          role: u.role || 'student',
          status: u.isActive ? 'Active' : (u.isApproved === false ? 'Pending' : 'Blocked'),
          isActive: u.isActive ?? true,
          isApproved: u.isApproved ?? true,
          department: u.department,
          enrolledCourses: u.enrolledCourses?.length || u.totalCoursesEnrolled || 0,
          completedCourses: u.completedCourses || 0,
          assessmentsCompleted: u.assessmentsCompleted || 0,
          certificatesDownloaded: u.certificatesDownloaded || 0,
          createdAt: u.createdAt || new Date().toISOString(),
          lastLogin: u.lastLogin,
        }));
        setUsers(mappedUsers);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, query, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = query.trim().toLowerCase();
      const name = `${user.firstName} ${user.lastName}`.toLowerCase();
      const queryMatch = !q || name.includes(q) || user.email.toLowerCase().includes(q) || user.mobile.includes(q);
      const statusMatch = statusFilter === 'All' || user.status === statusFilter;
      const roleMatch = roleFilter === 'All' || user.role === roleFilter;
      return queryMatch && statusMatch && roleMatch;
    });
  }, [users, query, statusFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / perPage));
  const paginatedUsers = filteredUsers.slice((page - 1) * perPage, page * perPage);

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      let response;
      if (action === 'delete') {
        if (!confirm('Are you sure you want to delete this user?')) return;
        response = await axiosInstance.delete(`/users/${userId}`);
      } else {
        response = await axiosInstance.put(`/users/${userId}`, {
          isActive: action === 'activate'
        });
      }

      if (response.data.success) {
        toast.success(`User ${action === 'delete' ? 'deleted' : action === 'activate' ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
        setShowActionsMenu(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    if (selectedUsers.size === 0) {
      toast.error('Please select users first');
      return;
    }

    try {
      const response = await axiosInstance.put('/users/bulk-update', {
        userIds: Array.from(selectedUsers),
        isActive: action === 'activate'
      });

      if (response.data.success) {
        toast.success(`${selectedUsers.size} users ${action === 'activate' ? 'activated' : 'deactivated'}`);
        setSelectedUsers(new Set());
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk action failed');
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u._id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const exportUsers = () => {
    const csv = [
      ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Enrolled Courses', 'Completed', 'Joined Date'].join(','),
      ...filteredUsers.map(u => [
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.mobile,
        u.role,
        u.status,
        u.enrolledCourses,
        u.completedCourses,
        new Date(u.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Users exported successfully');
  };

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'Active').length,
    pending: users.filter(u => u.status === 'Pending').length,
    blocked: users.filter(u => u.status === 'Blocked').length,
  }), [users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage all registered users, roles and permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <TrashingIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
              <p className="text-xs text-gray-500">Blocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as 'All' | UserRole);
              setPage(1);
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="All">All Roles</option>
            <option value="student">Student</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'All' | UserStatus);
              setPage(1);
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Blocked">Blocked</option>
          </select>
          <button
            onClick={exportUsers}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
            <span className="text-sm text-gray-600">{selectedUsers.size} selected</span>
            <button
              onClick={() => handleBulkAction('activate')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
            >
              <ToggleRight className="w-4 h-4" /> Activate
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
            >
              <ToggleLeft className="w-4 h-4" /> Deactivate
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Courses</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user._id)}
                          onChange={() => toggleSelectUser(user._id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'trainer' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-100 text-green-700' :
                          user.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="font-medium">{user.completedCourses}</span>
                        <span className="text-gray-400">/</span>
                        <span>{user.enrolledCourses}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenUser(user._id)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setShowActionsMenu(showActionsMenu === user._id ? null : user._id)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {showActionsMenu === user._id && (
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
                                {user.isActive ? (
                                  <button
                                    onClick={() => handleUserAction(user._id, 'deactivate')}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <ToggleLeft className="w-4 h-4" /> Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUserAction(user._id, 'activate')}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <ToggleRight className="w-4 h-4" /> Activate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUserAction(user._id, 'delete')}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginatedUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No users found</p>
              </div>
            )}
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {Math.min(filteredUsers.length, (page - 1) * perPage + 1)}-{Math.min(filteredUsers.length, page * perPage)} of {filteredUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UserDetailPage({ userId, onBackToList }: { userId: string; onBackToList: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        const response = await axiosInstance.get(`/users/${userId}`);
        if (response.data.success) {
          setUser(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetail();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
        <button onClick={onBackToList} className="mt-4 text-indigo-600 hover:underline">
          Back to list
        </button>
      </div>
    );
  }

  const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const userStatus = user.isActive ? 'Active' : (user.isApproved === false ? 'Pending' : 'Blocked');

  const stats = [
    { label: 'Enrolled Courses', value: user.enrolledCourses?.length || user.totalCoursesEnrolled || 0, icon: BookOpen },
    { label: 'Completed Courses', value: user.completedCourses || 0, icon: CheckCircle2 },
    { label: 'Assessments', value: user.assessmentsCompleted || 0, icon: Award },
    { label: 'Learning Days', value: user.learningDays || 0, icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">User Profile</h2>
          <p className="text-gray-600 mt-1">Complete details and activity overview.</p>
        </div>
        <button onClick={onBackToList} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
              {userFullName.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{userFullName || 'Unknown User'}</h3>
              <p className="text-gray-500">{user.email}</p>
              <p className="text-gray-500">{user.mobile}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${
              userStatus === 'Active' ? 'bg-green-100 text-green-700' :
              userStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {userStatus}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${
              user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
              user.role === 'trainer' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {user.role}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Department</p>
            <p className="font-medium">{user.department?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500">Joined</p>
            <p className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500">Last Login</p>
            <p className="font-medium">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'Never'}</p>
          </div>
          <div>
            <p className="text-gray-500">Unique ID</p>
            <p className="font-medium">{user.uniqueId || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <item.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            <p className="text-sm text-gray-600">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Enrolled Courses */}
      {user.enrolledCourses?.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">Enrolled Courses</h4>
          <div className="space-y-3">
            {(user.enrolledCourses as any[]).slice(0, 5).map((course: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{course.title || course}</p>
                  <p className="text-xs text-gray-500">Progress: {course.progress || 0}%</p>
                </div>
                {course.progress >= 100 && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple icon component
function TrashingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}