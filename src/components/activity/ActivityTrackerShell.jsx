import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, RefreshCcw } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { activityApi } from '../../services/activityApi';
import { ActivityCalendar } from './ActivityCalendar';
import { ActivityExportButton } from './ActivityExportButton';
import { ActivityFilters } from './ActivityFilters';
import { ActivitySummaryCards } from './ActivitySummaryCards';
import { ActivityTimeline } from './ActivityTimeline';
import { CourseSelector } from './CourseSelector';
import { StudentSelector } from './StudentSelector';

const todayKey = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);
const monthEndKey = (month) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
};

const getStudentId = (student) => student?._id || student?.id || '';

const getStudentName = (student) => student?.name || [student?.firstName, student?.lastName].filter(Boolean).join(' ') || student?.email || 'Selected learner';

const normalizeMyCourses = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.data || [];
  return list
    .map((item) => item.course || item)
    .filter(Boolean)
    .map((course) => ({ ...course, _id: course._id || course.id }));
};

export function ActivityTrackerShell({ mode, title, subtitle }) {
  const [month, setMonth] = useState(monthKey());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [activityType, setActivityType] = useState('all');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [summary, setSummary] = useState(null);
  const [calendar, setCalendar] = useState({ days: [] });
  const [dayLogs, setDayLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedStudentId = getStudentId(selectedStudent);
  const canLoadActivity = mode === 'student' || Boolean(selectedStudentId);

  const requestParams = useMemo(() => ({
    month,
    date: selectedDate,
    courseId: courseId || undefined,
    activityType,
  }), [month, selectedDate, courseId, activityType]);

  useEffect(() => {
    const loadInitial = async () => {
      setStudentLoading(true);
      try {
        if (mode === 'student') {
          const enrollments = await axiosInstance.get('/courses/my-enrollments').then((res) => res.data?.data || res.data);
          setCourses(normalizeMyCourses(enrollments));
        }
        if (mode === 'teacher') {
          const teacherCourses = await activityApi.getTeacherCourses();
          setCourses(teacherCourses || []);
          setCourseId('');
        }
        if (mode === 'admin') {
          const found = await activityApi.searchAdminStudents('');
          setStudents(found || []);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load tracker setup.');
      } finally {
        setStudentLoading(false);
      }
    };

    loadInitial();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'teacher') return;

    const loadStudents = async () => {
      setStudentLoading(true);
      setSelectedStudent(null);
      try {
        const courseIds = courseId ? [courseId] : courses.map((course) => course._id || course.id).filter(Boolean);
        const courseStudentLists = await Promise.all(courseIds.map((id) => activityApi.getTeacherCourseStudents(id)));
        const seen = new Set();
        const list = courseStudentLists.flat().filter((item) => {
          const id = item?.student?._id || item?.student?.id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setStudents(list || []);
        const first = list?.[0]?.student;
        if (first) setSelectedStudent(first);
      } catch (err) {
        setStudents([]);
        setError(err?.response?.data?.message || 'Unable to load enrolled students.');
      } finally {
        setStudentLoading(false);
      }
    };

    loadStudents();
  }, [mode, courseId, courses]);

  useEffect(() => {
    if (mode !== 'admin') return;
    const handle = window.setTimeout(async () => {
      setStudentLoading(true);
      try {
        const list = await activityApi.searchAdminStudents(studentQuery);
        setStudents(list || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to search students.');
      } finally {
        setStudentLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [mode, studentQuery]);

  const loadActivity = async () => {
    if (!canLoadActivity) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        courseId: courseId || undefined,
        activityType,
      };
      const calendarParams = { ...params, month };
      const dayParams = { ...params, date: selectedDate };

      if (mode === 'student') {
        const [nextSummary, nextCalendar, nextDay] = await Promise.all([
          activityApi.getMySummary(params),
          activityApi.getMyCalendar(calendarParams),
          activityApi.getMyDay(dayParams),
        ]);
        setSummary(nextSummary);
        setCalendar(nextCalendar || { days: [] });
        setDayLogs(nextDay?.logs || []);
        return;
      }

      if (mode === 'teacher') {
        const [nextSummary, nextCalendar, nextDay] = await Promise.all([
          activityApi.getTeacherStudentSummary(selectedStudentId, params),
          activityApi.getTeacherStudentCalendar(selectedStudentId, calendarParams),
          activityApi.getTeacherStudentDay(selectedStudentId, dayParams),
        ]);
        setSummary(nextSummary);
        setCalendar(nextCalendar || { days: [] });
        setDayLogs(nextDay?.logs || []);
        return;
      }

      const [nextSummary, nextCalendar, nextDay] = await Promise.all([
        activityApi.getAdminStudentSummary(selectedStudentId, params),
        activityApi.getAdminStudentCalendar(selectedStudentId, calendarParams),
        activityApi.getAdminStudentDay(selectedStudentId, dayParams),
      ]);
      setSummary(nextSummary);
      setCalendar(nextCalendar || { days: [] });
      setDayLogs(nextDay?.logs || []);
    } catch (err) {
      setSummary(null);
      setCalendar({ days: [] });
      setDayLogs([]);
      setError(err?.response?.data?.message || 'Unable to load learning activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [mode, selectedStudentId, courseId, month, selectedDate, activityType]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
              <CalendarDays className="h-4 w-4" />
              Calendar Activity
            </span>
            <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {mode !== 'admin' && (
              <CourseSelector
                courses={courses}
                value={courseId}
                onChange={setCourseId}
                includeAll
                label={mode === 'student' ? 'Filter course' : 'Teaching scope'}
              />
            )}
            {mode === 'admin' && (
              <ActivityExportButton
                studentId={selectedStudentId}
                params={{
                  startDate: `${month}-01`,
                  endDate: monthEndKey(month),
                  courseId: courseId || undefined,
                  activityType,
                }}
                disabled={!selectedStudentId}
              />
            )}
            <button
              type="button"
              onClick={loadActivity}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {mode !== 'student' && (
        <StudentSelector
          mode={mode}
          students={students}
          selectedStudentId={selectedStudentId}
          onSelect={setSelectedStudent}
          query={studentQuery}
          onQueryChange={setStudentQuery}
          loading={studentLoading}
        />
      )}

      {selectedStudent && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Viewing learner</p>
          <p className="mt-1 text-base font-black text-slate-950">{getStudentName(selectedStudent)}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {canLoadActivity ? (
        <>
          <ActivitySummaryCards summary={summary} />
          <ActivityFilters
            month={month}
            activityType={activityType}
            onMonthChange={setMonth}
            onActivityTypeChange={setActivityType}
          />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <ActivityCalendar
              month={month}
              days={calendar?.days || []}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <ActivityTimeline dateKey={selectedDate} logs={dayLogs} loading={loading} />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
          Select a student to view learning activity.
        </div>
      )}
    </div>
  );
}
