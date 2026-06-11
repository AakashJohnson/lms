import { ActivityTrackerShell } from '../../components/activity/ActivityTrackerShell';

export default function StudentActivityTracker() {
  return (
    <ActivityTrackerShell
      mode="teacher"
      title="Student Activity Tracker"
      subtitle="Monitor activity only for learners enrolled in courses you teach, with calendar trends and day-level timelines."
    />
  );
}
