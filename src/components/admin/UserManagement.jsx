import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    isApproved: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [deleteAccount, setDeleteAccount] = useState(false);
  
  // Bulk import states
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportRole, setBulkImportRole] = useState('trainer');
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.isApproved && { isApproved: filters.isApproved }),
        ...(filters.search && { search: filters.search })
      });

      const response = await axiosInstance.get(`/admin/users?${params}`);
      
      setUsers(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        pages: response.data.pagination.pages
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/approve`);
      alert('User approved successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      alert(error.response?.data?.message || 'Failed to approve user');
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;

    try {
      await axiosInstance.put(`/admin/users/${selectedUser._id}/reject`, {
        reason: rejectReason,
        deleteAccount: deleteAccount
      });
      alert('User rejected successfully!');
      setShowModal(false);
      setRejectReason('');
      setDeleteAccount(false);
      fetchUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert(error.response?.data?.message || 'Failed to reject user');
    }
  };

  const handleActivate = async (userId) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/activate`);
      alert('User activated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error activating user:', error);
      alert(error.response?.data?.message || 'Failed to activate user');
    }
  };

  const handleDeactivate = async (userId) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/deactivate`);
      alert('User deactivated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert(error.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      alert('User deleted successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const openRejectModal = (user) => {
    setSelectedUser(user);
    setActionType('reject');
    setShowModal(true);
  };

  const openViewModal = (user) => {
    setSelectedUser(user);
    setActionType('view');
    setShowModal(true);
  };

  // Bulk import functions
  const downloadTemplate = async (role) => {
    try {
      const response = await axiosInstance.get(`/admin/users/bulk-import/template/${role}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${role}-import-template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    
    // Parse CSV file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }
      
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (!csvData.length) {
      alert('Please upload a CSV file first');
      return;
    }

    setImportLoading(true);
    try {
      const response = await axiosInstance.post('/admin/users/bulk-import', {
        role: bulkImportRole,
        users: csvData
      });

      setImportResults(response.data.data);
      alert(`Import completed! ${response.data.data.success.length} users created, ${response.data.data.errors.length} errors.`);
      
      // Refresh user list
      fetchUsers();
      
      // Reset form
      setCsvFile(null);
      setCsvData([]);
      
    } catch (error) {
      console.error('Error importing users:', error);
      alert(error.response?.data?.message || 'Failed to import users');
    } finally {
      setImportLoading(false);
    }
  };

  const openBulkImportModal = () => {
    setShowBulkImport(true);
    setImportResults(null);
    setCsvFile(null);
    setCsvData([]);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'administrator':
        return 'bg-purple-100 text-purple-800';
      case 'trainer':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (isApproved, isActive) => {
    if (!isApproved) return 'bg-yellow-100 text-yellow-800';
    if (!isActive) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (isApproved, isActive) => {
    if (!isApproved) return 'Pending';
    if (!isActive) return 'Inactive';
    return 'Active';
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Name, email, mobile..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="administrator">Administrator</option>
              <option value="trainer">Trainer</option>
              <option value="student">Student</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Approval Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Approval
            </label>
            <select
              value={filters.isApproved}
              onChange={(e) => setFilters({ ...filters, isApproved: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="true">Approved</option>
              <option value="false">Pending</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setFilters({ role: '', status: '', isApproved: '', search: '' });
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Users ({pagination.total})
          </h3>
          <button
            onClick={openBulkImportModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Bulk Import</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.organization || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-sm text-gray-500">{user.mobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(user.isApproved, user.isActive)}`}>
                        {getStatusText(user.isApproved, user.isActive)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {/* View Button */}
                        <button
                          onClick={() => openViewModal(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          👁️
                        </button>

                        {/* Approve Button */}
                        {!user.isApproved && user.role !== 'administrator' && (
                          <button
                            onClick={() => handleApprove(user._id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            ✓
                          </button>
                        )}

                        {/* Reject Button */}
                        {!user.isApproved && user.role !== 'administrator' && (
                          <button
                            onClick={() => openRejectModal(user)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            ✗
                          </button>
                        )}

                        {/* Activate/Deactivate Button */}
                        {user.role !== 'administrator' && (
                          user.isActive ? (
                            <button
                              onClick={() => handleDeactivate(user._id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Deactivate"
                            >
                              🔒
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(user._id)}
                              className="text-green-600 hover:text-green-900"
                              title="Activate"
                            >
                              🔓
                            </button>
                          )
                        )}

                        {/* Delete Button */}
                        {user.role !== 'administrator' && (
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {actionType === 'view' && selectedUser && (
              <>
                <h3 className="text-xl font-semibold mb-4">User Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">First Name</label>
                      <p className="text-gray-900">{selectedUser.firstName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Name</label>
                      <p className="text-gray-900">{selectedUser.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mobile</label>
                      <p className="text-gray-900">{selectedUser.mobile}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Role</label>
                      <p className="text-gray-900">{selectedUser.role}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Organization</label>
                      <p className="text-gray-900">{selectedUser.organization || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Designation</label>
                      <p className="text-gray-900">{selectedUser.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="text-gray-900">
                        {getStatusText(selectedUser.isApproved, selectedUser.isActive)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registered</label>
                      <p className="text-gray-900">
                        {new Date(selectedUser.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Login</label>
                      <p className="text-gray-900">
                        {selectedUser.lastLogin 
                          ? new Date(selectedUser.lastLogin).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {actionType === 'reject' && selectedUser && (
              <>
                <h3 className="text-xl font-semibold mb-4">Reject User</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to reject <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>?
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rejection
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter reason for rejection..."
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="deleteAccount"
                      checked={deleteAccount}
                      onChange={(e) => setDeleteAccount(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="deleteAccount" className="ml-2 text-sm text-gray-700">
                      Delete account permanently
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setRejectReason('');
                      setDeleteAccount(false);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Reject User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Bulk Import Users</h3>
            
            <div className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User Type
                </label>
                <select
                  value={bulkImportRole}
                  onChange={(e) => setBulkImportRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="trainer">Trainers</option>
                  <option value="student">Students</option>
                </select>
              </div>

              {/* Download Template */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Download the CSV template for {bulkImportRole}s and fill it with user data.
                </p>
                <button
                  onClick={() => downloadTemplate(bulkImportRole)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📥 Download {bulkImportRole} Template
                </button>
              </div>

              {/* File Upload */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Step 2: Upload CSV File</h4>
                <p className="text-sm text-green-700 mb-3">
                  Upload the filled CSV file to import {bulkImportRole}s.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {csvFile && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ File uploaded: {csvFile.name} ({csvData.length} records)
                  </p>
                )}
              </div>

              {/* Preview Data */}
              {csvData.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Step 3: Preview Data</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvData.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {row.firstName} {row.lastName}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.email}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.mobile}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.organization}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 5 && (
                      <p className="text-sm text-gray-500 mt-2">
                        ... and {csvData.length - 5} more records
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResults && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Import Results</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResults.success.length}</div>
                      <div className="text-sm text-gray-600">Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                      <div className="text-sm text-gray-600">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                  </div>
                  
                  {importResults.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-red-900 mb-2">Errors:</h5>
                      <div className="max-h-40 overflow-y-auto">
                        {importResults.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700 mb-1">
                            Row {error.row}: {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkImport(false);
                  setCsvFile(null);
                  setCsvData([]);
                  setImportResults(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
              {csvData.length > 0 && (
                <button
                  onClick={handleBulkImport}
                  disabled={importLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importLoading ? 'Importing...' : `Import ${csvData.length} ${bulkImportRole}s`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
