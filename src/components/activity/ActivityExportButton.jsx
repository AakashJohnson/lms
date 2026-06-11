import { Download } from 'lucide-react';
import { activityApi, downloadBlob } from '../../services/activityApi';

export function ActivityExportButton({ studentId, params, disabled }) {
  const handleExport = async () => {
    if (!studentId) return;
    const response = await activityApi.exportAdminStudentActivity(studentId, params);
    downloadBlob(response.data, `student-activity-${studentId}.csv`);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || !studentId}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
