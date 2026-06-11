import { useState, useEffect } from 'react';
import { Upload, Users, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download, Loader2, Package, GraduationCap } from 'lucide-react';
import axiosInstance from '../../../utils/axiosConfig';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Course {
  _id: string;
  title: string;
  currentEnrollments: number;
}

interface StudentData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  organization?: string;
  designation?: string;
}

interface ImportResult {
  row: number;
  email: string;
  name?: string;
  status?: string;
  error?: string;
  password?: string;
}

interface BatchResult {
  batchNumber: number;
  batchId: string;
  batchName: string;
  batchCode: string;
  studentsCount: number;
  students: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

interface UnassignedParticipant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { _id: string; name: string; code: string };
}

export function BulkStudentImport() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Preview states
  const [previewData, setPreviewData] = useState<StudentData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Batch generation states
  const [batchSize, setBatchSize] = useState<number>(50);
  const [generating, setGenerating] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [showBatchResults, setShowBatchResults] = useState(false);
  const [courseStudents, setCourseStudents] = useState<any>(null);

  // Department selection for import
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<any[]>([]);

  // Import type: 'course' (existing) or 'department' (new with batch division)
  const [importType, setImportType] = useState<'course' | 'department'>('course');
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('manual');
  const [unassignedParticipants, setUnassignedParticipants] = useState<UnassignedParticipant[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [departmentBatches, setDepartmentBatches] = useState<any[]>([]);
  const [selectedBatchForManual, setSelectedBatchForManual] = useState<string>('');
  const [allocating, setAllocating] = useState(false);
  const [creatingManualBatch, setCreatingManualBatch] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (allocationMode === 'manual') {
      loadManualAssignmentData();
    }
  }, [allocationMode, importType, selectedCourse, selectedDepartment]);

  const fetchCourses = async () => {
    try {
      const response = await axiosInstance.get('/courses');
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axiosInstance.get('/departments');
      if (response.data.success) {
        setDepartments(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const fetchCourseStudents = async (courseId: string) => {
    try {
      const response = await axiosInstance.get(`/bulk-import/courses/${courseId}/students`);
      if (response.data.success) {
        setCourseStudents(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching course students:', error);
      toast.error('Failed to load course students');
    }
  };

  const downloadTemplate = (type: 'course' | 'department' = 'course') => {
    let template: any[] = [];
    let fileName = '';

    if (type === 'department') {
      // Department-wise import template with batch division
      template = [
        {
          firstName: 'Rahul',
          lastName: 'Sharma',
          email: 'rahul.sharma@university.com',
          mobile: '9876543210',
          department: 'CSE',
          semester: 3,
          year: 2023,
          section: 'A',
          organization: 'University'
        },
        {
          firstName: 'Priya',
          lastName: 'Patel',
          email: 'priya.patel@university.com',
          mobile: '9876543211',
          department: 'MBA',
          semester: 1,
          year: 2023,
          section: 'A',
          organization: 'University'
        },
        {
          firstName: 'Amit',
          lastName: 'Singh',
          email: 'amit.singh@university.com',
          mobile: '9876543212',
          department: 'BCA',
          semester: 5,
          year: 2023,
          section: 'B',
          organization: 'University'
        }
      ];
      fileName = 'department_batch_import_template.xlsx';
    } else {
      // Course-specific import template
      template = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          mobile: '9876543210',
          organization: 'NCUI',
          designation: 'Manager',
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          mobile: '9876543211',
          organization: 'NCUI',
          designation: 'Executive',
        },
      ];
      fileName = 'student_import_template.xlsx';
    }

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, fileName);
    toast.success('Template downloaded!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please upload an .xlsx file');
        return;
      }
      setFile(selectedFile);
      setImportResults(null);
      setShowResults(false);
      
      // Parse and preview data
      try {
        const students = await parseExcelFile(selectedFile);
        const errors = validateStudentData(students);
        setPreviewData(students);
        setValidationErrors(errors);
        setShowPreview(true);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse Excel file');
      }
    }
  };

  const validateStudentData = (students: any[]): string[] => {
    const errors: string[] = [];
    const emailSet = new Set();
    const mobileSet = new Set();

    students.forEach((student, index) => {
      const row = index + 2; // Excel row (1-indexed + header)

      // Check required fields
      if (!student.firstName) errors.push(`Row ${row}: Missing firstName`);
      if (!student.lastName) errors.push(`Row ${row}: Missing lastName`);
      if (!student.email) errors.push(`Row ${row}: Missing email`);
      if (!student.mobile) errors.push(`Row ${row}: Missing mobile`);

      // Validate email format
      if (student.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(student.email)) {
        errors.push(`Row ${row}: Invalid email format`);
      }

      // Validate mobile format - convert to string first
      const mobileStr = student.mobile ? student.mobile.toString() : '';
      if (student.mobile && !/^[6-9]\d{9}$/.test(mobileStr)) {
        errors.push(`Row ${row}: Invalid mobile (must be 10 digits starting with 6-9)`);
      }

      // Check duplicates within file
      if (student.email) {
        if (emailSet.has(student.email)) {
          errors.push(`Row ${row}: Duplicate email in file`);
        }
        emailSet.add(student.email);
      }

      if (student.mobile) {
        const mobileKey = student.mobile.toString();
        if (mobileSet.has(mobileKey)) {
          errors.push(`Row ${row}: Duplicate mobile in file`);
        }
        mobileSet.add(mobileKey);
      }

    });

    return errors;
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    const pick = (row: any, keys: string[]) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
      }
      return '';
    };

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet).map((row: any) => {
            const {
              uniqueId,
              UniqueId,
              UniqueID,
              studentId,
              StudentId,
              StudentID,
              enrollmentNo,
              EnrollmentNo,
              ...studentRow
            } = row;
            delete studentRow['Unique ID'];
            delete studentRow['Student ID'];
            delete studentRow['Enrollment No'];
            delete studentRow['Enrollment Number'];

            return {
              firstName: pick(studentRow, ['firstName', 'FirstName', 'First Name', 'Firstname', 'Name']).toString().split(' ')[0] || '',
              lastName: pick(studentRow, ['lastName', 'LastName', 'Last Name', 'Lastname'])
                || pick(studentRow, ['Name']).toString().split(' ').slice(1).join(' ')
                || '',
              email: pick(studentRow, ['email', 'Email', 'E-mail', 'Email Address']).toString().trim(),
              mobile: pick(studentRow, ['mobile', 'Mobile', 'Phone', 'Phone Number', 'Contact']).toString().trim(),
              organization: pick(studentRow, ['organization', 'Organization', 'Institute', 'College']).toString().trim(),
              designation: pick(studentRow, ['designation', 'Designation']).toString().trim(),
              department: pick(studentRow, ['department', 'Department', 'Dept', 'Dept Code']).toString().trim(),
              semester: pick(studentRow, ['semester', 'Semester', 'Sem', 'Sem No']),
              year: pick(studentRow, ['year', 'Year', 'Academic Year']),
              section: pick(studentRow, ['section', 'Section', 'Sec']).toString().trim(),
            };
          });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const handleImport = async () => {
    // Department-wise import validation
    if (importType === 'department') {
      if (!file || previewData.length === 0) {
        toast.error('Please select a file with valid data');
        return;
      }

      if (validationErrors.length > 0) {
        toast.error('Please fix validation errors before importing');
        return;
      }

      setImporting(true);
      setShowPreview(false);

      try {
        console.log('📤 Sending department-wise import request...');
        console.log('Students count:', previewData.length);

        // Send to department-wise import endpoint
        const response = await axiosInstance.post('/bulk-import/students/department', {
          students: previewData,
          defaultPassword: 'Student@123',
          allocationMode,
        });

        console.log('✅ Import response:', response.data);

        if (response.data.success) {
          setImportResults(response.data.data);
          setShowResults(true);
          toast.success(`Import completed! Created: ${response.data.data.created}, Updated: ${response.data.data.updated}`);

          // Allocation handling for department-wise imports
          if (allocationMode === 'auto') {
            await axiosInstance.post('/bulk-import/participants/auto-divide', {
              onlyUnassigned: true,
              departmentIds: selectedDepartment ? [selectedDepartment] : [],
            });
            toast.success('Auto divide completed');
          } else {
            await loadManualAssignmentData();
          }

          // Clear preview data
          setPreviewData([]);
          setFile(null);
        }
      } catch (error: any) {
        console.error('❌ Import error:', error);
        console.error('Error response:', error.response?.data);
        toast.error(error.response?.data?.message || 'Import failed. Please check console for details.');
      } finally {
        setImporting(false);
      }
      return;
    }

    // Course import validation
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    if (!selectedDepartment) {
      toast.error('Please select a department');
      return;
    }

    if (!file || previewData.length === 0) {
      toast.error('Please select a file with valid data');
      return;
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    setImporting(true);
    setShowPreview(false);

    try {
      console.log('📤 Sending import request...');
      console.log('Course ID:', selectedCourse);
      console.log('Department ID:', selectedDepartment);
      console.log('Students count:', previewData.length);

      // Send to backend
      const response = await axiosInstance.post(`/bulk-import/students/${selectedCourse}`, {
        students: previewData,
        defaultPassword: 'student123',
        departmentId: selectedDepartment,
      });

      console.log('✅ Import response:', response.data);

      if (response.data.success) {
        setImportResults(response.data.data);
        setShowResults(true);
        toast.success(`Import completed! ${response.data.data.enrolled} students enrolled.`);

        if (allocationMode === 'auto') {
          const batchResponse = await axiosInstance.post(`/bulk-import/courses/${selectedCourse}/generate-batches`, {
            batchSize,
            departmentId: selectedDepartment,
            year: new Date().getFullYear(),
          });
          if (batchResponse.data.success) {
            setBatchResults(batchResponse.data.data);
            setShowBatchResults(true);
            toast.success(`Auto divided into ${batchResponse.data.data.totalBatches} batch(es)`);
          }
        } else {
          await loadManualAssignmentData();
        }

        // Clear preview data
        setPreviewData([]);
        setFile(null);

        // Refresh course students if this course is selected
        if (selectedCourse) {
          fetchCourseStudents(selectedCourse);
        }
      }
    } catch (error: any) {
      console.error('❌ Import error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Import failed. Please check console for details.');
    } finally {
      setImporting(false);
    }
  };

  const loadManualAssignmentData = async () => {
    try {
      const courseScoped = importType === 'course' && selectedCourse ? selectedCourse : undefined;
      const unassignedRes = await axiosInstance.get('/bulk-import/participants/unassigned', {
        params: {
          departmentId: selectedDepartment || undefined,
          courseId: courseScoped,
          limit: 500,
        },
      });
      if (unassignedRes.data.success) {
        setUnassignedParticipants(unassignedRes.data.data || []);
      }

      const batchRes = await axiosInstance.get('/batches', {
        params: { department: selectedDepartment || undefined, isActive: true, limit: 500 },
      });
      if (batchRes.data.success) {
        const batches = Array.isArray(batchRes.data.data)
          ? batchRes.data.data
          : (batchRes.data.data?.batches || []);
        setDepartmentBatches(batches);
        if (selectedBatchForManual && !batches.some((batch: any) => batch._id === selectedBatchForManual)) {
          setSelectedBatchForManual('');
        }
      }
    } catch (error: any) {
      console.error('Failed to load manual assignment data:', error);
      toast.error('Unable to load manual assignment data');
    }
  };

  const handleCreateManualBatch = async () => {
    if (!selectedDepartment) {
      toast.error('Please select a department first');
      return;
    }

    const department = departments.find((dept) => dept._id === selectedDepartment);
    const deptCode = (department?.code || department?.name || 'DEPT').toString().replace(/\s+/g, '').toUpperCase();
    const year = new Date().getFullYear();
    const suffix = Date.now().toString().slice(-5);

    setCreatingManualBatch(true);
    try {
      const response = await axiosInstance.post('/batches', {
        name: `${department?.name || deptCode} Manual Batch ${year}`,
        code: `${deptCode}-MAN-${year}-${suffix}`,
        department: selectedDepartment,
        year,
        startDate: new Date().toISOString(),
        maxStudents: batchSize || 60,
      });

      if (response.data.success) {
        const createdBatch = response.data.data;
        setDepartmentBatches((prev) => [createdBatch, ...prev]);
        setSelectedBatchForManual(createdBatch._id);
        toast.success('Batch created and selected');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create batch');
    } finally {
      setCreatingManualBatch(false);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedBatchForManual) {
      toast.error('Please select a batch');
      return;
    }
    if (selectedParticipantIds.length === 0) {
      toast.error('Please select participants');
      return;
    }

    setAllocating(true);
    try {
      const res = await axiosInstance.post('/bulk-import/participants/manual-assign', {
        batchId: selectedBatchForManual,
        participantIds: selectedParticipantIds,
        courseId: importType === 'course' ? selectedCourse : undefined,
      });
      if (res.data.success) {
        toast.success(`Assigned ${selectedParticipantIds.length} participant(s)`);
        setSelectedParticipantIds([]);
        await loadManualAssignmentData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Manual assignment failed');
    } finally {
      setAllocating(false);
    }
  };

  const handleGenerateBatches = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    if (!selectedDepartment) {
      toast.error('Please select a department before generating batches');
      return;
    }

    if (batchSize < 1 || batchSize > 500) {
      toast.error('Batch size must be between 1 and 500');
      return;
    }

    setGenerating(true);
    try {
      const response = await axiosInstance.post(`/bulk-import/courses/${selectedCourse}/generate-batches`, {
        batchSize,
        departmentId: selectedDepartment,
        year: new Date().getFullYear(),
      });

      if (response.data.success) {
        setBatchResults(response.data.data);
        setShowBatchResults(true);
        toast.success(`Successfully created ${response.data.data.totalBatches} batches!`);
        
        // Refresh course students
        fetchCourseStudents(selectedCourse);
      }
    } catch (error: any) {
      console.error('Batch generation error:', error);
      toast.error(error.response?.data?.message || 'Batch generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCourseData = courses.find(c => c._id === selectedCourse);

  return (
    <div className="space-y-6 text-left">
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
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Bulk Student Import & <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-300">Batch Gen</span>
              </h2>
              <p className="text-indigo-200/70 mt-1 text-sm font-medium">
                Upload student rosters, divide cohorts automatically by department size, and download spreadsheet templates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Import Mode Tabs */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-4 shadow-sm text-left">
        <div className="flex gap-4">
          <button
            onClick={() => setImportType('course')}
            className={`flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${
              importType === 'course'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            Course Import Mode
          </button>
          <button
            onClick={() => setImportType('department')}
            className={`flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${
              importType === 'department'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            Department-wise Mode
          </button>
        </div>
        <p className="text-xs text-slate-400 font-bold text-center mt-3 leading-normal">
          {importType === 'course'
            ? '⚡ CURRENTLY IN COURSE MODE: Synchronize imported students directly to designated syllabus structures.'
            : '⚡ CURRENTLY IN DEPARTMENT-WISE MODE: Division algorithms will divide candidates into cohorts dynamically.'}
        </p>
      </section>

      {importType === 'course' && (
      <>
        {/* Course Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-lg text-gray-900">Select Course</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                if (e.target.value) {
                  fetchCourseStudents(e.target.value);
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a course --</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title} ({course.currentEnrollments || 0} students)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a department --</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              All imported students will be assigned to this department
            </p>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-violet-900 mb-2">After import allocation mode</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAllocationMode('manual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${allocationMode === 'manual' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-700 border-violet-200'}`}
              >
                Manual Assign
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('auto')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${allocationMode === 'auto' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-700 border-violet-200'}`}
              >
                Auto Divide
              </button>
            </div>
            <p className="text-xs text-violet-700 mt-2">
              Manual keeps imported participants unassigned. Auto creates course batches using the batch size below.
            </p>
          </div>

          {selectedCourseData && courseStudents && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Course Statistics</p>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">Total Students</p>
                      <p className="font-semibold text-blue-900">{courseStudents.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">With Batch</p>
                      <p className="font-semibold text-blue-900">{courseStudents.studentsWithBatch}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Without Batch</p>
                      <p className="font-semibold text-blue-900">{courseStudents.studentsWithoutBatch}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Students Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-semibold text-lg text-gray-900">Import Students</h3>
        </div>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Download Template</p>
                <p className="text-sm text-gray-600">Get the Excel template with required columns</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .xlsx
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Student Data (.xlsx only)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Excel files (.xlsx) only</p>
              </label>
            </div>
          </div>

          {/* Preview Table */}
          {showPreview && previewData.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Data Preview ({previewData.length} students)
                </h4>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border-b border-red-200 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-red-900 mb-2">
                        {validationErrors.length} Validation Error{validationErrors.length > 1 ? 's' : ''} Found
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {validationErrors.map((error, idx) => (
                          <p key={idx} className="text-sm text-red-700">- {error}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">First Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Last Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mobile</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Designation</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{student.firstName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{student.lastName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.mobile?.toString() || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.organization || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.designation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Preview Footer */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {validationErrors.length === 0 ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      All data validated successfully
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      Fix errors before importing
                    </span>
                  )}
                </p>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData([]);
                    setFile(null);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear & Upload New File
                </button>
              </div>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {previewData.length > 0 ? `Import ${previewData.length} Students` : 'Import Students'}
              </>
            )}
          </button>
        </div>
      </div>
      </>
      )}

      {/* Generate Batches Section - only for course import */}
      {importType === 'course' && selectedCourse && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Batch Status</h3>
              <p className="text-sm text-gray-500">View and manage batch assignments</p>
            </div>
          </div>

          {courseStudents ? (
          <>

          {/* Batch Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-600">Total Students</p>
              <p className="text-2xl font-bold text-blue-900">{courseStudents.totalStudents}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-green-600">With Batch</p>
              <p className="text-2xl font-bold text-green-900">{courseStudents.studentsWithBatch}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="text-sm text-yellow-600">Without Batch</p>
              <p className="text-2xl font-bold text-yellow-900">{courseStudents.studentsWithoutBatch}</p>
            </div>
          </div>

          {courseStudents.studentsWithoutBatch > 0 ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">
                    {courseStudents.studentsWithoutBatch} students need batch assignment
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Configure batch size and click "Generate Batches" to automatically create batches
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size (students per batch)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 30-50 students per batch. Last batch will contain remaining students.
              </p>
            </div>

            <button
              onClick={handleGenerateBatches}
              disabled={generating || !selectedCourse}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Batches...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Generate Batches
                </>
              )}
            </button>
          </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">All students have batch assignments</p>
                  <p className="text-sm text-green-700 mt-1">
                    All {courseStudents.totalStudents} students are assigned to batches
                  </p>
                </div>
              </div>
            </div>
          )}
          </>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No students enrolled in this course yet</p>
              <p className="text-sm text-gray-400 mt-1">Import students first to see batch status</p>
            </div>
          )}
        </div>
      )}

      {importType === 'course' && allocationMode === 'manual' && selectedCourse && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Manual Batch Assignment</h3>
              <p className="text-sm text-gray-500">Course ke unassigned participants ko selected batch me assign karo.</p>
            </div>
            <button
              type="button"
              onClick={loadManualAssignmentData}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              Refresh List
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <select
              value={selectedBatchForManual}
              onChange={(e) => setSelectedBatchForManual(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-xl text-sm"
            >
              <option value="">
                {departmentBatches.length === 0 ? 'No batch found - create one' : 'Select batch'}
              </option>
              {departmentBatches.map((b: any) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.currentStudents}/{b.maxStudents || 'unlimited'})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleManualAssign}
              disabled={allocating || !selectedBatchForManual || selectedParticipantIds.length === 0}
              className="px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {allocating ? 'Assigning...' : `Assign Selected (${selectedParticipantIds.length})`}
            </button>
          </div>

          {departmentBatches.length === 0 && (
            <button
              type="button"
              onClick={handleCreateManualBatch}
              disabled={creatingManualBatch || !selectedDepartment}
              className="mb-3 w-full px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 disabled:opacity-60"
            >
              {creatingManualBatch ? 'Creating batch...' : 'Create batch for selected department'}
            </button>
          )}

          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">{unassignedParticipants.length} unassigned participant(s)</p>
            {unassignedParticipants.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedParticipantIds(
                    selectedParticipantIds.length === unassignedParticipants.length
                      ? []
                      : unassignedParticipants.map((p) => p._id)
                  )
                }
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                {selectedParticipantIds.length === unassignedParticipants.length ? 'Clear selection' : 'Select all'}
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-auto border border-gray-200 rounded-xl">
            {unassignedParticipants.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No unassigned participants found. Import students first or refresh list.</p>
            ) : (
              unassignedParticipants.map((p) => (
                <label key={p._id} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedParticipantIds.includes(p._id)}
                    onChange={(e) => {
                      setSelectedParticipantIds((prev) =>
                        e.target.checked ? [...prev, p._id] : prev.filter((id) => id !== p._id)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{p.email} {p.department?.name ? `- ${p.department.name}` : ''}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Department-wise Import Section */}
      {importType === 'department' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Department-wise Import</h3>
              <p className="text-sm text-gray-500">Students will be automatically assigned to batches based on department, semester, and section</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download the template with department/semester/section fields</li>
              <li>Fill student data with department code (CSE, MBA, BCA, etc.)</li>
              <li>Upload file - system auto-creates departments and batches</li>
              <li>Batches are created as: <code>DEPT-SEM-SEC-YEAR</code> (e.g., CSE-3-A-2023)</li>
            </ol>
          </div>

          {/* Allocation Mode */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-violet-900 mb-2">After import allocation mode</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAllocationMode('manual')}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${allocationMode === 'manual' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-700 border-violet-200'}`}
              >
                Manual Assign
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('auto')}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${allocationMode === 'auto' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-700 border-violet-200'}`}
              >
                Auto Divide
              </button>
            </div>
          </div>

          {/* Download Template */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Download Template</p>
                <p className="text-sm text-gray-600">Get the Excel template with department/semester/section columns</p>
              </div>
              <button
                onClick={() => downloadTemplate('department')}
                className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .xlsx
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Student Data (.xlsx only)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="department-file-upload"
              />
              <label htmlFor="department-file-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Excel files (.xlsx) only</p>
              </label>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="mt-4 w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {previewData.length > 0 ? `Import ${previewData.length} Students` : 'Import Students'}
              </>
            )}
          </button>

          {/* Manual Assignment Panel */}
          {allocationMode === 'manual' && (
            <div className="mt-6 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Manual Batch Assignment</h4>
                <button
                  type="button"
                  onClick={loadManualAssignmentData}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                >
                  Refresh List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <select
                  value={selectedBatchForManual}
                  onChange={(e) => setSelectedBatchForManual(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">
                    {departmentBatches.length === 0 ? 'No batch found - create one' : 'Select batch'}
                  </option>
                  {departmentBatches.map((b: any) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.currentStudents}/{b.maxStudents || 'unlimited'})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleManualAssign}
                  disabled={allocating}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  {allocating ? 'Assigning...' : `Assign Selected (${selectedParticipantIds.length})`}
                </button>
              </div>

              {departmentBatches.length === 0 && (
                <button
                  type="button"
                  onClick={handleCreateManualBatch}
                  disabled={creatingManualBatch || !selectedDepartment}
                  className="mb-3 w-full px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 disabled:opacity-60"
                >
                  {creatingManualBatch ? 'Creating batch...' : 'Create batch for selected department'}
                </button>
              )}

              <div className="max-h-56 overflow-auto border border-gray-200 rounded-lg">
                {unassignedParticipants.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">No unassigned participants found.</p>
                ) : (
                  unassignedParticipants.map((p) => (
                    <label key={p._id} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
                      <input
                        type="checkbox"
                        checked={selectedParticipantIds.includes(p._id)}
                        onChange={(e) => {
                          setSelectedParticipantIds((prev) =>
                            e.target.checked ? [...prev, p._id] : prev.filter((id) => id !== p._id)
                          );
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-gray-500">{p.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results Modal */}
      {showResults && importResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Import Results</h3>
              <button
                onClick={() => setShowResults(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600">Total Processed</p>
                  <p className="text-2xl font-bold text-blue-900">{importResults.totalProcessed}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-600">Success</p>
                  <p className="text-2xl font-bold text-green-900">
                    {importResults.enrolled ?? ((importResults.created || 0) + (importResults.updated || 0))}
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-600">Errors</p>
                  <p className="text-2xl font-bold text-red-900">{importResults.errors}</p>
                </div>
              </div>

              {/* Success List */}
              {(importResults.details?.enrolled || importResults.details?.success || []).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Successful ({(importResults.details?.enrolled || importResults.details?.success || []).length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(importResults.details?.enrolled || importResults.details?.success || []).map((item: ImportResult, idx: number) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="font-medium text-green-900">{item.name}</p>
                        <p className="text-sm text-green-700">{item.email}</p>
                        <p className="text-xs text-green-600 mt-1">{item.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error List */}
              {(importResults.details?.errors || []).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Errors ({(importResults.details?.errors || []).length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(importResults.details?.errors || []).map((item: ImportResult, idx: number) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="font-medium text-red-900">Row {item.row}</p>
                        <p className="text-sm text-red-700">{item.email}</p>
                        <p className="text-xs text-red-600 mt-1">{item.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowResults(false)}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Results Modal */}
      {showBatchResults && batchResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Batch Generation Results</h3>
              <button
                onClick={() => setShowBatchResults(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
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

              {/* Batch List */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Created Batches</h4>
                {batchResults.batches.map((batch: BatchResult) => (
                  <div key={batch.batchId} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
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

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowBatchResults(false)}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
