import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  BookOpen,
  Users,
  Building2,
  Loader2,
  X,
  Calendar,
  Filter,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../../utils/axiosConfig';
import {
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  type Batch,
  type CreateBatchData,
  type UpdateBatchData,
} from '../../services/batchService';
import {
  getDepartments,
  type Department,
} from '../../services/departmentService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchFormData {
  name: string;
  code: string;
  department: string;
  year: number;
  startDate: string;
  endDate: string;
  maxStudents: number;
  trainers: string[];
}

const EMPTY_FORM: BatchFormData = {
  name: '',
  code: '',
  department: '',
  year: new Date().getFullYear(),
  startDate: '',
  endDate: '',
  maxStudents: 50,
  trainers: [],
};

interface Filters {
  department: string;
  year: string;
  search: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState<BatchFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    department: '',
    year: '',
    search: '',
  });

  // Batch details modal
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showBatchDetails, setShowBatchDetails] = useState(false);

  // Trainer details modal
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null);
  const [loadingTrainer, setLoadingTrainer] = useState(false);
  const [showTrainerModal, setShowTrainerModal] = useState(false);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params: any = { isActive: true };
      if (filters.department) params.department = filters.department;
      if (filters.year) params.year = parseInt(filters.year);
      if (filters.search) params.search = filters.search;

      const response = await getBatches(params);
      setBatches(response.data || []);
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      toast.error(error.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments({ isActive: true });
      setDepartments(response.data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      const response = await axiosInstance.get('/admin/users', {
        params: { role: 'trainer', isApproved: true }
      });
      if (response.data.success) {
        setTrainers(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching trainers:', error);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchTrainers();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [filters.department, filters.year]);

  // View batch students
  const viewBatchDetails = async (batch: Batch) => {
    setSelectedBatch(batch);
    setShowBatchDetails(true);
    setLoadingStudents(true);

    try {
      // Get students by batch ID using correct endpoint
      const response = await axiosInstance.get(`/batches/${batch._id}/students`);

      if (response.data.success) {
        setBatchStudents(response.data.data || []);
      } else {
        setBatchStudents([]);
      }
    } catch (error: any) {
      console.error('Error fetching batch students:', error);
      setBatchStudents([]);
      setBatchStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // View trainer details
  const handleTrainerClick = async (trainer: any) => {
    setSelectedTrainer(trainer); // set immediate basic info
    setShowTrainerModal(true);
    setLoadingTrainer(true);

    try {
      const response = await axiosInstance.get(`/admin/users/${trainer._id}`);
      if (response.data.success && response.data.data) {
        setSelectedTrainer(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching trainer details:', error);
      toast.error('Failed to load full trainer profile details');
    } finally {
      setLoadingTrainer(false);
    }
  };

  // ── Filtered batches ──────────────────────────────────────────────────────
  const filteredBatches = batches.filter((batch) => {
    if (!filters.search) return true;
    const query = filters.search.toLowerCase();
    return (
      batch.name.toLowerCase().includes(query) ||
      batch.code.toLowerCase().includes(query) ||
      batch.department.name.toLowerCase().includes(query)
    );
  });

  // ── Statistics ────────────────────────────────────────────────────────────
  const totalBatches = batches.length;
  const totalStudents = batches.reduce((sum, batch) => sum + batch.currentStudents, 0);
  const fullBatches = batches.filter(
    (b) => b.maxStudents && b.currentStudents >= b.maxStudents
  ).length;

  // ── Open modal for create/edit ────────────────────────────────────────────
  const openModal = (batch?: Batch) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({
        name: batch.name,
        code: batch.code,
        department: batch.department._id,
        year: batch.year,
        startDate: batch.startDate ? batch.startDate.split('T')[0] : '',
        endDate: batch.endDate ? batch.endDate.split('T')[0] : '',
        maxStudents: batch.maxStudents || 50,
        trainers: (batch as any).trainers?.map((t: any) => typeof t === 'string' ? t : t._id) || [],
      });
    } else {
      setEditingBatch(null);
      setFormData(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBatch(null);
    setFormData(EMPTY_FORM);
  };

  // ── Handle form submission ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Batch name is required');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Batch code is required');
      return;
    }
    if (!formData.department) {
      toast.error('Department is required');
      return;
    }
    if (formData.year < 2020 || formData.year > 2100) {
      toast.error('Year must be between 2020 and 2100');
      return;
    }
    if (formData.maxStudents < 1) {
      toast.error('Max students must be at least 1');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBatch) {
        // Update existing batch
        const updateData: UpdateBatchData = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          department: formData.department,
          year: formData.year,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          maxStudents: formData.maxStudents,
          trainers: formData.trainers,
        };
        const response = await updateBatch(editingBatch._id, updateData);
        setBatches((prev) =>
          prev.map((b) => (b._id === editingBatch._id ? response.data : b))
        );
        toast.success('Batch updated successfully!', { icon: '✏️' });
      } else {
        // Create new batch
        const createData: CreateBatchData = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          department: formData.department,
          year: formData.year,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          maxStudents: formData.maxStudents,
          trainers: formData.trainers,
        };
        const response = await createBatch(createData);
        setBatches((prev) => [response.data, ...prev]);
        toast.success('Batch created successfully!', { icon: '✅' });
      }
      closeModal();
    } catch (error: any) {
      console.error('Error saving batch:', error);
      const errorMsg = error.message || 'Failed to save batch';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handle delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteBatch(id);
      setBatches((prev) => prev.filter((b) => b._id !== id));
      toast.success('Batch deleted successfully!', { icon: '🗑️' });
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting batch:', error);
      const errorMsg = error.message || 'Failed to delete batch';
      toast.error(errorMsg);
    }
  };

  // ── Clear filters ─────────────────────────────────────────────────────────
  const clearFilters = () => {
    setFilters({ department: '', year: '', search: '' });
  };

  // ── Generate year options ─────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="space-y-6">
      {/* Breathtaking Welcome Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        {/* Ambient background blur circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Interactive Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5 text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/20">
              <GraduationCap className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Cohort & <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-300">Batch Management</span>
              </h2>
              <p className="text-indigo-200/70 mt-1 text-sm font-medium">
                Organize educational tracks, monitor trainer logs, and adjust cohort student limits.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fetchBatches}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl text-indigo-100 text-xs font-bold hover:bg-white/10 hover:text-white transition-all shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all border border-indigo-400/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Batch
            </button>
          </div>
        </div>
      </section>

      {/* Premium Statistics Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Total Active Batches', value: totalBatches, icon: BookOpen, accent: '#6366f1', tone: 'from-indigo-500/10 via-purple-500/5 to-transparent', shadowColor: 'rgba(99, 102, 241, 0.08)' },
          { label: 'Total Enrolled Students', value: totalStudents, icon: Users, accent: '#10b981', tone: 'from-emerald-500/10 via-teal-500/5 to-transparent', shadowColor: 'rgba(16, 185, 129, 0.08)' },
          { label: 'Full Capacity Batches', value: fullBatches, icon: Building2, accent: '#ef4444', tone: 'from-rose-500/10 via-red-500/5 to-transparent', shadowColor: 'rgba(239, 68, 68, 0.08)' }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="relative group rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden text-left"
              style={{ boxShadow: `0 4px 20px -2px ${card.shadowColor}` }}
            >
              {/* Decorative background glow */}
              <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.tone} opacity-10 group-hover:scale-150 transition-transform duration-500 blur-xl`} />
              
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5.5 h-5.5" style={{ color: card.accent }} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Telemetry Active</span>
              </div>
              <div className="relative z-10">
                <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                <p className="text-xs font-bold text-slate-400 mt-1">{card.label}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Interactive Filters Panel */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-4 shadow-sm text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Custom Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search cohorts by name, code, or departments..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold placeholder-slate-400 text-slate-700 transition-all"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold text-slate-600 bg-white cursor-pointer transition-all"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold text-slate-600 bg-white cursor-pointer transition-all"
          >
            <option value="">All Years</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Accent Tag */}
        {(filters.department || filters.year || filters.search) && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset active filters
          </button>
        )}
      </section>

      {/* Breathtaking Batches Table Grid */}
      <section className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden text-left">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-bold">Synchronizing cohorts...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      Batch Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      Department Assignment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      Assigned Trainers
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      Student Capacity Limit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map((batch) => {
                    const capacity = batch.maxStudents || 0;
                    const current = batch.currentStudents;
                    const percentage = capacity > 0 ? (current / capacity) * 100 : 0;
                    const isFull = capacity > 0 && current >= capacity;

                    return (
                      <tr key={batch._id} className="hover:bg-slate-55/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-extrabold text-slate-800 text-sm">{batch.name}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold mt-1">
                              {batch.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-600">
                              {batch.department.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-600">{batch.year}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {batch.trainers && batch.trainers.length > 0 ? (
                              batch.trainers.map((trainer: any, idx: number) => {
                                const initials = `${trainer.firstName?.[0] || ''}${trainer.lastName?.[0] || ''}` || 'T';
                                return (
                                  <span
                                    key={idx}
                                    onClick={() => handleTrainerClick(trainer)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold cursor-pointer transition-all border border-violet-100 hover:border-violet-200 shadow-sm"
                                    title="View Trainer Details"
                                  >
                                    <div className="w-4 h-4 rounded-full bg-violet-600 text-white text-[8px] font-black flex items-center justify-center">
                                      {initials}
                                    </div>
                                    {trainer.firstName} {trainer.lastName}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">No assigned trainers</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5 max-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                              <span>
                                {current} / {capacity}
                              </span>
                              <span className={isFull ? 'text-red-500 font-extrabold' : 'text-slate-500'}>
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isFull
                                    ? 'bg-gradient-to-r from-red-500 to-rose-500'
                                    : percentage > 75
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => viewBatchDetails(batch)}
                              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-150 flex items-center justify-center transition-colors group"
                              title="View cohort students"
                            >
                              <Eye className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal(batch)}
                              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-150 flex items-center justify-center transition-colors group"
                              title="Edit cohort properties"
                            >
                              <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-violet-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(batch._id)}
                              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-150 flex items-center justify-center transition-colors group"
                              title="Delete cohort"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredBatches.length === 0 && (
              <div className="py-20 text-center text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-extrabold text-slate-600 text-sm">
                  {filters.search || filters.department || filters.year
                    ? 'No batches match your active filters'
                    : 'No cohorts established yet'}
                </p>
                {!filters.search && !filters.department && !filters.year && (
                  <button
                    type="button"
                    onClick={() => openModal()}
                    className="mt-3 text-xs font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100 transition-colors"
                  >
                    Setup Your First Batch Cohort
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  {editingBatch ? 'Edit Batch' : 'Add Batch'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingBatch
                    ? 'Update batch information'
                    : 'Create a new batch'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Batch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Batch A - 2026"
                    maxLength={100}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Batch Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g., CS-2026-A"
                    maxLength={20}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    min={2020}
                    max={2100}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Maximum Students
                </label>
                <input
                  type="number"
                  value={formData.maxStudents}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStudents: parseInt(e.target.value) })
                  }
                  min={1}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of students allowed in this batch
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign Trainers
                </label>
                <div className="border border-gray-300 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {trainers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">No trainers available</p>
                  ) : (
                    <div className="space-y-2">
                      {trainers.map((trainer) => (
                        <label
                          key={trainer._id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.trainers.includes(trainer._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  trainers: [...formData.trainers, trainer._id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  trainers: formData.trainers.filter((id) => id !== trainer._id),
                                });
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {trainer.firstName} {trainer.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{trainer.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select trainers who will teach this batch ({formData.trainers.length} selected)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingBatch ? (
                    'Update Batch'
                  ) : (
                    'Create Batch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Batch?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this batch? This action cannot be
              undone. If the batch has students, deletion will fail.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Students Details Modal */}
      {showBatchDetails && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowBatchDetails(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  Batch Students Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedBatch.name} ({selectedBatch.code})
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    {selectedBatch.department.name}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {selectedBatch.year}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs">
                    {batchStudents.length} Students
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="ml-3 text-gray-600">Loading students...</span>
                </div>
              ) : batchStudents.length > 0 ? (
                <div className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{batchStudents.length}</p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {batchStudents.filter((s: any) => s.isEmailVerified).length}
                      </p>
                      <p className="text-sm text-gray-600">Verified</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {batchStudents.filter((s: any) => !s.isEmailVerified).length}
                      </p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {batchStudents.reduce((acc, s: any) => acc + (s.enrolledCourses?.length || 0), 0)}
                      </p>
                      <p className="text-sm text-gray-600">Enrollments</p>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Designation</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {batchStudents.map((student: any, index: number) => (
                          <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                  {student.firstName?.[0] || '?'}{student.lastName?.[0] || ''}
                                </div>
                                <span className="font-medium text-gray-900">
                                  {student.firstName} {student.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{student.mobile || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{student.designation || 'Student'}</td>
                            <td className="px-4 py-3">
                              {student.isActive ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {student.isEmailVerified ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No students found in this batch</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {batchStudents.length} student{batchStudents.length !== 1 ? 's' : ''} in this batch
                </p>
                <button
                  onClick={() => setShowBatchDetails(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trainer Profile Details Modal */}
      {showTrainerModal && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setShowTrainerModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-purple-50">
            {/* Top Premium Color Banner */}
            <div className="h-32 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 relative">
              <button
                type="button"
                onClick={() => setShowTrainerModal(false)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar Overlay */}
            <div className="px-6 pb-6 relative">
              <div className="absolute -top-12 left-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-xl border-4 border-white">
                  {selectedTrainer.firstName?.charAt(0)}{selectedTrainer.lastName?.charAt(0)}
                </div>
              </div>

              {/* Header Spacer */}
              <div className="h-16" />

              {/* Trainer Title Area */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedTrainer.firstName} {selectedTrainer.lastName}
                  </h3>
                  <p className="text-sm font-medium text-purple-600 mt-1">
                    {selectedTrainer.designation || 'Expert Trainer'}
                  </p>
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedTrainer.isActive !== false
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                }`}>
                  {selectedTrainer.isActive !== false ? 'Active Faculty' : 'Inactive'}
                </span>
              </div>

              {/* Main Content Grid */}
              <div className="mt-6 space-y-4">
                {loadingTrainer ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-purple-500">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-medium text-gray-500">Loading complete trainer profile...</p>
                  </div>
                ) : (
                  <>
                    {/* Information Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Email Card */}
                      <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Email Address</p>
                        <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
                          <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                          <a
                            href={`mailto:${selectedTrainer.email}`}
                            className="text-xs font-semibold text-purple-700 hover:underline truncate"
                          >
                            {selectedTrainer.email}
                          </a>
                        </div>
                      </div>

                      {/* Phone Card */}
                      <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Mobile Number</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-xs font-semibold text-indigo-700">
                            {selectedTrainer.mobile || selectedTrainer.phone || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Organization Card */}
                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Organization</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-xs font-semibold text-blue-700">
                            {selectedTrainer.organization || 'CEAS LMS Portal'}
                          </span>
                        </div>
                      </div>

                      {/* Member Since Card */}
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Faculty Since</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                          <span className="text-xs font-semibold text-gray-700">
                            {selectedTrainer.createdAt
                              ? new Date(selectedTrainer.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Jan 2026'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Bio/Expertise */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Expertise & Designation</p>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed mt-2">
                        {selectedTrainer.designation
                          ? `${selectedTrainer.designation} associated with our active academic curriculum and student mentoring.`
                          : 'Professional Educator specialized in advanced course instruction, batch supervision, and personalized trainer-student evaluations.'}
                      </p>
                    </div>

                    {/* Bottom Action Footer inside Modal */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTrainer.email);
                          toast.success('Trainer email copied to clipboard!');
                        }}
                        className="flex-1 px-4 py-2.5 bg-purple-50 text-purple-700 font-semibold rounded-xl hover:bg-purple-100 transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Copy Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTrainerModal(false)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-md transition-all text-xs"
                      >
                        Close Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
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
