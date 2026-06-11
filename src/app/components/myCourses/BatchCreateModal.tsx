import { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Package, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import axiosInstance from '../../../utils/axiosConfig';
import type { Course, BatchResult } from './types';
import { toast } from 'sonner';

interface BatchCreateModalProps {
  isOpen: boolean;
  course: Course | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Department {
  _id: string;
  name: string;
  code: string;
}

export function BatchCreateModal({ isOpen, course, onClose, onSuccess }: BatchCreateModalProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<number>(new Date().getFullYear());
  const [batchSemester, setBatchSemester] = useState<number>(1);
  const [batchSection, setBatchSection] = useState<string>('A');
  const [batchSize, setBatchSize] = useState<number>(50);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importingStudents, setImportingStudents] = useState(false);

  const [creatingBatches, setCreatingBatches] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      const response = await axiosInstance.get('/departments');
      if (response.data.success) {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setImportFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('Excel file is empty');
        return;
      }

      const transformedData = jsonData.map((row: any) => ({
        firstName: row.FirstName || row.firstName || row['First Name'] || row.Name?.split(' ')[0] || '',
        lastName: row.LastName || row.lastName || row['Last Name'] || row.Name?.split(' ').slice(1).join(' ') || '',
        email: row.Email || row.email || row['E-mail'] || '',
        mobile: row.Mobile || row.mobile || row.Phone || '',
        uniqueId: row.UniqueId || row['Unique ID'] || '',
        organization: row.Organization || row.organization || 'Student',
        designation: row.Designation || row.designation || 'Student'
      }));

      setImportPreviewData(transformedData);
      toast.success(`Loaded ${transformedData.length} students from file`);
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse Excel file');
    }
  };

  const handleImportAndEnroll = async () => {
    if (!course || typeof course.id !== 'string') {
      toast.error('Invalid course');
      return;
    }

    if (importPreviewData.length === 0) {
      toast.error('No students to import');
      return;
    }

    setImportingStudents(true);
    try {
      const response = await axiosInstance.post(`/bulk-import/students/${course.id}`, {
        students: importPreviewData,
        defaultPassword: 'Student@123',
        departmentId: selectedDepartment || undefined
      });

      if (response.data.success) {
        toast.success(`Successfully imported ${response.data.data?.enrolled || importPreviewData.length} students!`);
        setImportFile(null);
        setImportPreviewData([]);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Failed to import students');
    } finally {
      setImportingStudents(false);
    }
  };

  const handleCreateBatches = async () => {
    if (!course || typeof course.id !== 'string') {
      toast.error('Please select a valid course');
      return;
    }

    if (!selectedDepartment) {
      toast.error('Please select a department');
      return;
    }

    if (!academicYear || academicYear < 2020 || academicYear > 2100) {
      toast.error('Please enter a valid academic year');
      return;
    }

    if (batchSize < 1 || batchSize > 500) {
      toast.error('Batch size must be between 1 and 500');
      return;
    }

    setCreatingBatches(true);
    try {
      // Import students first if needed
      if (importPreviewData.length > 0) {
        const importResponse = await axiosInstance.post(`/bulk-import/students/${course.id}`, {
          students: importPreviewData,
          defaultPassword: 'Student@123',
          departmentId: selectedDepartment
        });

        if (importResponse.data.success) {
          toast.success(`Imported ${importResponse.data.data?.enrolled || importPreviewData.length} students!`);
          setImportFile(null);
          setImportPreviewData([]);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await axiosInstance.post(`/bulk-import/courses/${course.id}/generate-batches`, {
        batchSize,
        departmentId: selectedDepartment,
        year: academicYear,
        semester: batchSemester,
        section: batchSection
      });

      if (response.data.success) {
        setBatchResults(response.data.data);
        toast.success(`Successfully created ${response.data.data.totalBatches} batches!`);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Batch creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create batches');
    } finally {
      setCreatingBatches(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Create Batches</h3>
            <p className="text-sm text-gray-600 mt-1">{course.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!batchResults ? (
            <>
              {/* Import Section */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Import Students</p>
                    <p className="text-sm text-green-700 mt-1">Upload Excel file to import students and enroll them</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Excel File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-green-400 transition-colors">
                    <input type="file" accept=".xlsx,.xls" onChange={handleImportFileChange} className="hidden" id="batch-modal-import" />
                    <label htmlFor="batch-modal-import" className="cursor-pointer">
                      <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">{importFile ? importFile.name : 'Click to upload Excel file'}</p>
                    </label>
                  </div>
                  {importPreviewData.length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{importPreviewData.length} students ready to import</span>
                        <button onClick={handleImportAndEnroll} disabled={importingStudents} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                          {importingStudents ? 'Importing...' : 'Import Students'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-500">OR</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Auto Batch Generation */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Automatic Batch Generation</p>
                    <p className="text-sm text-blue-700 mt-1">Enrolled students will be divided into batches</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min="2020" max="2100"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                    <select
                      value={batchSemester}
                      onChange={(e) => setBatchSemester(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[1,2,3,4,5,6,7,8].map(sem => (<option key={sem} value={sem}>Semester {sem}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select
                      value={batchSection}
                      onChange={(e) => setBatchSection(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {['A','B','C','D','E','F'].map(sec => (<option key={sec} value={sec}>Section {sec}</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size</label>
                  <input
                    type="number" min="1" max="500"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 30-50 students per batch</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCreateBatches}
                  disabled={creatingBatches}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingBatches ? (<><Loader2 className="w-4 h-4 animate-spin" />Creating...</>) : (<><Package className="w-4 h-4" />Create Batches</>)}
                </button>
                <button
                  onClick={onClose}
                  disabled={creatingBatches}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            /* Results */
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-600">Total Students</p>
                    <p className="text-2xl font-bold text-purple-900">{batchResults.totalStudents}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-sm text-indigo-600">Batches Created</p>
                    <p className="text-2xl font-bold text-indigo-900">{batchResults.totalBatches}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600">Batch Size</p>
                    <p className="text-2xl font-bold text-blue-900">{batchResults.batchSize}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Created Batches</h4>
                  {batchResults.batches.map((batch) => (
                    <div key={batch.batchId} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{batch.batchName}</p>
                          <p className="text-sm text-gray-600">Code: {batch.batchCode}</p>
                        </div>
                        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                          {batch.studentsCount} students
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <button onClick={onClose} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}