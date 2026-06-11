import { ActivityTrackerShell } from '../../components/activity/ActivityTrackerShell';

export default function StudentActivityMonitor() {
  return (
    <ActivityTrackerShell
      mode="admin"
      title="Student Activity Monitor"
      subtitle="Search any learner, inspect activity history across the platform, and export audit-ready CSV reports."
    />
  );
}
