import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Building2,
  Users,
  BookOpen,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
  type CreateDepartmentData,
  type UpdateDepartmentData,
} from '../../services/departmentService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
}

const EMPTY_FORM: DepartmentFormData = {
  name: '',
  code: '',
  description: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Fetch departments ─────────────────────────────────────────────────────
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await getDepartments({ isActive: true });
      setDepartments(response.data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error(error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // ── Filtered departments ──────────────────────────────────────────────────
  const filteredDepartments = departments.filter((dept) => {
    const query = searchTerm.toLowerCase();
    return (
      dept.name.toLowerCase().includes(query) ||
      dept.code.toLowerCase().includes(query) ||
      (dept.description && dept.description.toLowerCase().includes(query))
    );
  });

  // ── Statistics ────────────────────────────────────────────────────────────
  const totalDepartments = departments.length;
  const totalBatches = departments.reduce((sum, dept) => sum + (dept.batchCount || 0), 0);
  const totalStudents = departments.reduce((sum, dept) => sum + (dept.studentCount || 0), 0);

  // ── Open modal for create/edit ────────────────────────────────────────────
  const openModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
      });
    } else {
      setEditingDept(null);
      setFormData(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData(EMPTY_FORM);
  };

  // ── Handle form submission ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Department code is required');
      return;
    }
    if (formData.name.length > 100) {
      toast.error('Department name must be 100 characters or less');
      return;
    }
    if (formData.code.length > 10) {
      toast.error('Department code must be 10 characters or less');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDept) {
        // Update existing department
        const updateData: UpdateDepartmentData = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || undefined,
        };
        const response = await updateDepartment(editingDept._id, updateData);
        setDepartments((prev) =>
          prev.map((d) => (d._id === editingDept._id ? response.data : d))
        );
        toast.success('Department updated successfully!', { icon: '✏️' });
      } else {
        // Create new department
        const createData: CreateDepartmentData = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || undefined,
        };
        const response = await createDepartment(createData);
        setDepartments((prev) => [response.data, ...prev]);
        toast.success('Department created successfully!', { icon: '✅' });
      }
      closeModal();
    } catch (error: any) {
      console.error('Error saving department:', error);
      const errorMsg = error.message || 'Failed to save department';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handle delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d._id !== id));
      toast.success('Department deleted successfully!', { icon: '🗑️' });
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting department:', error);
      const errorMsg = error.message || 'Failed to delete department';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-7 text-left">
      {/* Premium Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 rounded-3xl p-8 md:p-12 border border-white/5">
        {/* Premium Grid Pattern Overlay */}
        {/* @ts-expect-error - CSS inline styles for decorative grid pattern */}
        {/* eslint-disable-next-line */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Decorative Blur Circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full mix-blend-screen filter blur-3xl" />

        {/* Content Container */}
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Icon Box with Glow */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-3xl blur-xl opacity-50" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50 border border-indigo-400/40">
                <Building2 className="w-10 h-10 md:w-12 md:h-12 text-white" />
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 leading-tight">
              Department <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">Management</span>
            </h1>
            <p className="text-base md:text-lg text-slate-300/90">
              Establish corporate branches, review registered student metrics, and customize organizational sectors.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 lg:flex-col">
            <button
              type="button"
              onClick={fetchDepartments}
              title="Refresh departments"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl text-indigo-100 text-sm font-bold hover:bg-white/10 hover:text-white transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20"
              aria-label="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => openModal()}
              title="Add new department"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/40 transition-all border border-indigo-400/30"
              aria-label="Add Department"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </div>
        </div>
      </section>

      {/* Premium Statistics Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            label: 'Active Sectors',
            value: totalDepartments,
            icon: Building2,
            gradient: 'from-indigo-600 to-indigo-700',
            bgAccent: 'bg-indigo-50',
            textAccent: 'text-indigo-700',
            trend: '+12%'
          },
          {
            label: 'Total Cohort Batches',
            value: totalBatches,
            icon: BookOpen,
            gradient: 'from-teal-600 to-teal-700',
            bgAccent: 'bg-teal-50',
            textAccent: 'text-teal-700',
            trend: '+8%'
          },
          {
            label: 'Enrolled Department Candidates',
            value: totalStudents,
            icon: Users,
            gradient: 'from-violet-600 to-violet-700',
            bgAccent: 'bg-violet-50',
            textAccent: 'text-violet-700',
            trend: '+5%'
          }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all hover:-translate-y-1 overflow-hidden p-6"
            >
              {/* Faint gradient background */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.bgAccent} opacity-30 rounded-full -mr-12 -mt-12 blur-2xl`} />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.bgAccent} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${card.textAccent}`} />
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live
                  </span>
                </div>
                <p className="text-slate-600 text-sm font-semibold mb-1">{card.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-slate-900">{card.value}</p>
                  <span className="text-xs font-bold text-emerald-600">{card.trend}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Premium Search & Filter Bar */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search branches by code names or descriptions..."
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-medium placeholder-slate-400 text-slate-700 transition-all bg-slate-50/40"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-3 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors rounded-xl hover:bg-slate-100"
              title="Clear search"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Premium Department Table */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-sm font-bold">Loading department sectors...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Code</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wide">Batches</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wide">Students</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((dept, idx) => (
                    <tr
                      key={dept._id}
                      className="hover:bg-indigo-50/30 transition-colors group border-b border-slate-100 last:border-0"
                    >
                      {/* Department Name & Description */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{dept.name}</p>
                            {dept.description && (
                              <p className="text-xs text-slate-500 mt-1">{dept.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                          {dept.code}
                        </span>
                      </td>

                      {/* Batch Count */}
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <BookOpen className="w-4 h-4 text-teal-500" />
                          <span className="text-sm font-bold text-slate-900">{dept.batchCount || 0}</span>
                        </div>
                      </td>

                      {/* Student Count */}
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Users className="w-4 h-4 text-violet-500" />
                          <span className="text-sm font-bold text-slate-900">{dept.studentCount || 0}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openModal(dept)}
                            title="Edit department"
                            className="w-9 h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 flex items-center justify-center transition-all group/edit"
                            aria-label="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-indigo-600 group-hover/edit:text-indigo-700" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(dept._id)}
                            title="Delete department"
                            className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 flex items-center justify-center transition-all group/delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 group-hover/delete:text-red-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDepartments.length === 0 && (
              <div className="py-24 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-slate-100 rounded-full">
                    <Building2 className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
                <p className="font-bold text-slate-700 text-sm mb-1">
                  {searchTerm ? 'No departments found' : 'No departments yet'}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {searchTerm ? 'Try adjusting your search' : 'Create your first department sector'}
                </p>
                {!searchTerm && (
                  <button
                    type="button"
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Create Department
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Premium Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden transform transition-all">
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingDept ? 'Update Department Branch' : 'Create Department Branch'}
                  </h2>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    {editingDept ? 'Modify sector parameters' : 'Define new department directory'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                title="Close"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {/* Department Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">
                  Department Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Computer Science & Engineering"
                  maxLength={100}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-medium placeholder-slate-400 text-slate-700 transition-all"
                  required
                />
              </div>

              {/* Department Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">
                  Department Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., CSE"
                  maxLength={10}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-bold placeholder-slate-400 text-slate-700 uppercase transition-all"
                  required
                />
                <p className="text-xs text-slate-500 mt-1.5">Unique directory code for identification</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">
                  Sector Overview
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of department objectives and focus areas..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-medium placeholder-slate-400 text-slate-700 transition-all resize-none"
                />
                <p className="text-xs text-slate-500 mt-1.5">{formData.description.length}/500 characters</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingDept ? 'Update Department' : 'Create Department'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              Delete Department?
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              This action will permanently remove this department sector. If active batches exist, deletion may be blocked. This cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Keep Department
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all"
              >
                Delete Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div
          className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
