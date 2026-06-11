import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Archive, BookOpen, Brain, CalendarDays, CheckCircle2,
  Layers, Loader2, Save, Sparkles,
  Target, Upload, Users, Wand2, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateContentPlan,
  getPlanningOverview,
  getPlanHistory,
  savePlan,
} from '../services/trainerContentPlanningApi';

const planningTypes = [
  ['daily_lesson', 'Daily Lesson Plan'],
  ['weekly_content', 'Weekly Content Plan'],
  ['monthly_course', 'Monthly Course Plan'],
  ['byte_learning', 'Byte Learning Plan'],
  ['assessment', 'Assessment Plan'],
  ['revision', 'Revision Plan'],
  ['weak_topic_recovery', 'Weak Topic Recovery Plan'],
  ['live_class', 'Live Class Plan'],
  ['homework', 'Homework Plan'],
];

const sourceLabels = [
  ['courseStructure', 'Course Structure'],
  ['savedSummaries', 'Saved Summaries'],
  ['uploadedNotes', 'Uploaded Notes'],
  ['byteStatus', 'Byte Status'],
  ['assessmentResults', 'Assessment Results'],
  ['studentWeakTopics', 'Student Weak Topics'],
  ['flashcards', 'Flashcards'],
  ['liveSessions', 'Live Sessions'],
];

const loadingSteps = [
  'Reading course structure',
  'Checking saved summaries and notes',
  'Checking byte status',
  'Analyzing student progress',
  'Detecting weak topics',
  'Generating teaching plan',
  'Preparing one-click actions',
];

const emptyPlan = {
  title: '',
  summary: '',
  learningObjectives: [],
  prerequisites: [],
  teachingSequence: [],
  byteSuggestions: [],
  assessmentSuggestions: [],
  liveClassPlan: {},
  homework: [],
  weakTopicRecovery: [],
  expectedOutcomes: [],
};

export function TrainerContentPlanning() {
  const [courses, setCourses] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [planningMode, setPlanningMode] = useState<'course' | 'custom'>('course');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [planningType, setPlanningType] = useState('weekly_content');
  const [duration, setDuration] = useState('1_week');
  const [classLevel, setClassLevel] = useState('');
  const [language, setLanguage] = useState('hinglish');
  const [teachingStyle, setTeachingStyle] = useState('interactive');
  const [teacherInstruction, setTeacherInstruction] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>(
    Object.fromEntries(sourceLabels.map(([key]) => [key, true]))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  const [planId, setPlanId] = useState('');
  const generatedPlanSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => setActiveStep((step) => Math.min(loadingSteps.length - 1, step + 1)), 900);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const selectedCourseObj = courses.find((course) => course._id === selectedCourse);
  const moduleOptions = selectedCourseObj?.sections || [];

  const stats = useMemo(() => [
    { label: planningMode === 'custom' ? 'Planning Mode' : 'Active Course', value: planningMode === 'custom' ? 'New material' : selectedCourseObj?.title || overview.activeCourse?.title || 'Not selected', icon: BookOpen, tone: 'indigo' },
    { label: 'Published Bytes', value: overview.publishedBytes ?? 0, icon: Zap, tone: 'emerald' },
    { label: 'Draft Bytes', value: overview.draftBytes ?? 0, icon: Archive, tone: 'amber' },
    { label: 'Students Enrolled', value: overview.studentsEnrolled ?? 0, icon: Users, tone: 'cyan' },
    { label: 'Weak Topics', value: overview.weakTopicsDetected ?? 0, icon: Target, tone: 'rose' },
  ], [overview, selectedCourseObj, planningMode]);

  async function loadOverview() {
    try {
      const res = await getPlanningOverview();
      if (res.success) {
        setCourses(res.data.courses || []);
        setOverview(res.data.overview || {});
        setHistory(res.data.history || []);
        const first = res.data.overview?.activeCourse?.id || res.data.courses?.[0]?._id || '';
        setSelectedCourse((current) => current || first);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load planning overview');
    }
  }

  async function loadHistory() {
    const res = await getPlanHistory();
    if (res.success) setHistory(res.data || []);
  }

  async function handleGenerate() {
    if (planningMode === 'course' && !selectedCourse) {
      toast.error('Please select a course first.');
      return;
    }
    if (planningMode === 'custom' && !customContent.trim() && !customFile) {
      toast.error('Add text or upload a PDF/text file for custom planning.');
      return;
    }
    setIsGenerating(true);
    setActiveStep(0);
    try {
      const res = await generateContentPlan({
        planningMode,
        courseId: planningMode === 'course' ? selectedCourse : undefined,
        moduleId: planningMode === 'course' ? selectedModule || undefined : undefined,
        customTitle,
        customContent,
        customFile,
        planningType,
        duration,
        classLevel,
        language,
        teachingStyle,
        teacherInstruction,
        selectedSources,
      });
      if (res.success) {
        setGeneratedPlan(res.data.aiPlan || emptyPlan);
        setPlanId(res.data._id);
        toast.success(`AI teaching plan generated${res.source === 'fallback' ? ' with fallback mode' : ''}.`);
        await loadHistory();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Plan generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  async function runAction(action: 'save') {
    if (!planId) {
      toast.error('Generate a plan first.');
      return;
    }
    try {
      const calls = {
        save: () => savePlan(planId),
      };
      const res = await calls[action]();
      if (res.success) {
        toast.success('Draft action completed.');
        await loadHistory();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Action failed');
    }
  }

  function scrollToGeneratedPlan() {
    window.requestAnimationFrame(() => {
      generatedPlanSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  function handleOpenPlan(plan: any) {
    setGeneratedPlan(plan.aiPlan);
    setPlanId(plan._id);
    setActiveTab('overview');
    scrollToGeneratedPlan();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF2FF] p-4 md:p-6 space-y-6">
      <section className="rounded-[28px] border border-indigo-100 bg-white/88 p-6 shadow-[0_20px_60px_-38px_rgba(79,70,229,0.55)] backdrop-blur">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" /> Teacher Studio
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              AI Content <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Planning</span>
            </h1>
            <p className="mt-4 max-w-3xl text-slate-600">
              Plan lessons, bytes, assessments, live sessions, homework and revision paths using AI-powered course and student insights.
            </p>
          </div>
          <div className="rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{planningMode === 'custom' ? 'New Course / Material Context' : 'Active Course Context'}</label>
            {planningMode === 'course' ? (
              <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedModule(''); }} className="mt-2 w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select course</option>
                {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
              </select>
            ) : (
              <div className="mt-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 font-semibold text-slate-800">
                {customTitle || customFile?.name || 'Untitled new material'}
              </div>
            )}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm">
              <Brain className="h-4 w-4" /> AI Planner Ready
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </section>

      <main className="grid gap-6 xl:grid-cols-[0.88fr_1.35fr]">
        <section className="space-y-6">
          <Card title="Create AI Teaching Plan" icon={Wand2}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button onClick={() => setPlanningMode('course')} className={`rounded-xl px-3 py-2 text-sm font-black transition ${planningMode === 'course' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Existing Course</button>
                <button onClick={() => setPlanningMode('custom')} className={`rounded-xl px-3 py-2 text-sm font-black transition ${planningMode === 'custom' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>New Course / PDF</button>
              </div>

              {planningMode === 'course' ? (
                <Select label="Module / Chapter" value={selectedModule} onChange={setSelectedModule} options={[['', 'All modules'], ...moduleOptions.map((m: any) => [m._id, m.title])]} />
              ) : (
                <div className="space-y-3 rounded-[22px] border border-indigo-100 bg-indigo-50/40 p-4">
                  <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Plan title or future course name" className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                  <textarea value={customContent} onChange={(e) => setCustomContent(e.target.value)} placeholder="Paste syllabus, rough topic notes, chapter outline, or teaching material here..." className="min-h-[150px] w-full resize-none rounded-2xl border border-indigo-100 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
                    <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" /> {customFile ? customFile.name : 'Upload PDF / text notes'}</span>
                    <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => setCustomFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              )}
              <Select label="Planning Type" value={planningType} onChange={setPlanningType} options={planningTypes} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Duration" value={duration} onChange={setDuration} options={[['1_day', '1 Day'], ['1_week', '1 Week'], ['2_weeks', '2 Weeks'], ['1_month', '1 Month']]} />
                <Select label="Language" value={language} onChange={setLanguage} options={[['english', 'English'], ['hindi', 'Hindi'], ['hinglish', 'Hinglish'], ['auto', 'Auto']]} />
              </div>
              <input value={classLevel} onChange={(e) => setClassLevel(e.target.value)} placeholder="Class level, e.g. Beginner / Semester 1" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
              <Select label="Teaching Style" value={teachingStyle} onChange={setTeachingStyle} options={[['interactive', 'Interactive'], ['exam_focused', 'Exam Focused'], ['activity_based', 'Activity Based'], ['revision_focused', 'Revision Focused'], ['remedial', 'Remedial']]} />
              <textarea value={teacherInstruction} onChange={(e) => setTeacherInstruction(e.target.value)} placeholder="Example: Create a 1-week revision plan before unit test. Focus more on weak students and add quick quizzes." className="min-h-[118px] w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setTeacherInstruction(''); setClassLevel(''); }} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
                <button disabled={isGenerating} onClick={handleGenerate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-60">
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Generate AI Plan
                </button>
              </div>
            </div>
          </Card>

          <Card title="Use LMS Data Sources" icon={Layers}>
            <div className="space-y-2">
              {sourceLabels.map(([key, label], index) => (
                <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <span className={`mr-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${index < 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {index < 5 ? 'Available' : 'Partial'}
                  </span>
                  <input type="checkbox" checked={selectedSources[key]} onChange={(e) => setSelectedSources((s) => ({ ...s, [key]: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                </label>
              ))}
            </div>
          </Card>
        </section>

        <div ref={generatedPlanSectionRef} className="scroll-mt-24">
          <GeneratedPlanPreview
            plan={generatedPlan}
            isGenerating={isGenerating}
            compactLoading={planningMode === 'custom'}
            activeStep={activeStep}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onStart={handleGenerate}
            onSave={() => runAction('save')}
          />
        </div>
      </main>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <PlanHistory history={history} onOpen={handleOpenPlan} />
        <Card title="Smart Teaching Insights" icon={Activity}>
          <div className="space-y-3">
            <Insight label="Most common weak topic" value={overview.weakTopicsDetected ? 'Check generated recovery list' : 'No strong weak topic yet'} />
            <Insight label="Next recommended byte" value={overview.draftBytes ? 'Review draft bytes and publish selected ones' : 'Create a recap byte'} />
            <Insight label="Assessment gap" value={overview.pendingAssessments ? `${overview.pendingAssessments} pending drafts` : 'Create a quick checkpoint quiz'} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function GeneratedPlanPreview({ plan, isGenerating, compactLoading, activeStep, activeTab, setActiveTab, onStart, onSave }: any) {
  if (isGenerating) {
    if (compactLoading) {
      return (
        <Card title="Generated Plan Preview" icon={Brain}>
          <div className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-indigo-100 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
              <h3 className="mt-4 text-xl font-black text-slate-950">Generating plan from your material</h3>
              <p className="mt-2 text-sm text-slate-500">Using the text/PDF you provided. No course setup required.</p>
            </div>
          </div>
        </Card>
      );
    }
    return (
      <Card title="Generated Plan Preview" icon={Brain}>
        <div className="space-y-4">
          {loadingSteps.map((step, index) => (
            <div key={step} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${index <= activeStep ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
              {index < activeStep ? <CheckCircle2 className="h-5 w-5" /> : index === activeStep ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="h-5 w-5 rounded-full border border-slate-300" />}
              <span className="font-semibold">{step}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card title="Generated Plan Preview" icon={Brain}>
        <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-8 text-center">
          <CalendarDays className="h-16 w-16 text-indigo-500" />
          <h3 className="mt-5 text-2xl font-black text-slate-950">Generate your first AI teaching plan</h3>
          <p className="mt-2 max-w-md text-slate-600">AI will use saved course content, byte progress, assessments and student insights to prepare a practical plan.</p>
          <button onClick={onStart} className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-200">
            Start Planning
          </button>
        </div>
      </Card>
    );
  }

  const tabs = [
    ['overview', 'Overview'],
    ['sequence', 'Teaching Sequence'],
    ['bytes', 'Bytes & Assessments'],
    ['weak', 'Weak Topic Recovery'],
    ['homework', 'Homework & Live Class'],
  ];

  return (
    <Card title="Generated Plan Preview" icon={Brain}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{plan.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              <Badge>AI Generated</Badge><Badge>Ready for Review</Badge><Badge>Draft-safe actions</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Save} label="Save Plan" onClick={onSave} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${activeTab === key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab plan={plan} />}
        {activeTab === 'sequence' && <TeachingSequence steps={plan.teachingSequence || []} />}
        {activeTab === 'bytes' && <ByteAssessmentTab plan={plan} />}
        {activeTab === 'weak' && <WeakRecovery items={plan.weakTopicRecovery || []} />}
        {activeTab === 'homework' && <HomeworkLive plan={plan} />}

        <div className="sticky bottom-0 flex flex-wrap gap-2 rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-[0_-10px_32px_-28px_rgba(79,70,229,0.8)] backdrop-blur">
          <ActionButton icon={Save} label="Save Plan" onClick={onSave} />
        </div>
      </div>
    </Card>
  );
}

function OverviewTab({ plan }: any) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PlanBox title="Plan Summary" items={[plan.summary]} />
      <PlanBox title="Learning Objectives" items={plan.learningObjectives} checklist />
      <PlanBox title="Prerequisites" items={plan.prerequisites} />
      <PlanBox title="Expected Outcomes" items={plan.expectedOutcomes} checklist />
    </div>
  );
}

function TeachingSequence({ steps }: any) {
  return (
    <div className="space-y-3">
      {steps.map((step: any, index: number) => (
        <div key={index} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-black text-white">{step.stepNo || index + 1}</span>
            <h3 className="font-black text-slate-950">{step.title}</h3>
            <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{step.estimatedMinutes} min</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{step.activity}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Mini label="Teacher Action" value={step.teacherAction} />
            <Mini label="Student Action" value={step.studentAction} />
          </div>
          {!!step.resources?.length && <div className="mt-3 flex flex-wrap gap-2">{step.resources.map((r: string) => <Badge key={r}>{r}</Badge>)}</div>}
        </div>
      ))}
    </div>
  );
}

function ByteAssessmentTab({ plan }: any) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-black text-slate-950">Byte Suggestions</h3>
        {(plan.byteSuggestions || []).map((item: any) => <Suggestion key={item._id || item.title} item={item} />)}
      </div>
      <div className="space-y-3">
        <h3 className="font-black text-slate-950">Assessment Suggestions</h3>
        {(plan.assessmentSuggestions || []).map((item: any) => <Suggestion key={item._id || item.title} item={item} />)}
      </div>
    </div>
  );
}

function WeakRecovery({ items }: any) {
  return <div className="space-y-3">{items.map((item: any, index: number) => (
    <div key={index} className="rounded-[22px] border border-rose-100 bg-rose-50/50 p-4">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{item.topic}</h3><Badge>{item.priority}</Badge></div>
      <p className="mt-2 text-sm text-slate-600">{item.evidence}</p>
      <p className="mt-2 font-semibold text-rose-700">{item.suggestedAction}</p>
    </div>
  ))}</div>;
}

function HomeworkLive({ plan }: any) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-black text-slate-950">Homework</h3>
        {(plan.homework || []).map((item: any, index: number) => <Mini key={index} label={`${item.title} (${item.estimatedMinutes} min)`} value={item.description} />)}
      </div>
      <div className="rounded-[22px] border border-cyan-100 bg-cyan-50/50 p-4">
        <h3 className="font-black text-slate-950">{plan.liveClassPlan?.title || 'Live Class Plan'}</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">{(plan.liveClassPlan?.agenda || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  );
}

function PlanHistory({ history, onOpen }: any) {
  return (
    <Card title="Recent AI Content Plans" icon={CalendarDays}>
      {!history.length ? <p className="text-slate-500">Create your first AI teaching plan using saved course content and student insights.</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {history.map((plan: any) => (
            <div key={plan._id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">{plan.aiPlan?.title || 'Untitled plan'}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.courseId?.title || 'Course'} - {plan.planningType}</p>
                </div>
                <Badge>{plan.status}</Badge>
              </div>
              <p className="mt-3 text-xs text-slate-400">{new Date(plan.createdAt).toLocaleString()}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onOpen(plan)} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white">Open</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Card({ title, icon: Icon, children }: any) {
  return <section className="rounded-[26px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_38px_-30px_rgba(15,23,42,0.42)]"><div className="mb-4 flex items-center gap-3"><div className="rounded-2xl bg-indigo-100 p-2 text-indigo-700"><Icon className="h-5 w-5" /></div><h2 className="text-lg font-black text-slate-950">{title}</h2></div>{children}</section>;
}

function StatCard({ label, value, icon: Icon }: any) {
  return <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-1 hover:border-indigo-200"><Icon className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p></div>;
}

function Select({ label, value, onChange, options }: any) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500">{options.map(([v, l]: any) => <option key={v} value={v}>{l}</option>)}</select></label>;
}

function Badge({ children }: any) {
  return <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{children}</span>;
}

function ActionButton({ icon: Icon, label, onClick, primary }: any) {
  return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${primary ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>;
}

function PlanBox({ title, items, checklist }: any) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);
  return <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-950">{title}</h3><div className="mt-3 space-y-2 text-sm text-slate-700">{list.length ? list.map((item: string, i: number) => <p key={i} className="flex gap-2">{checklist && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}<span>{item}</span></p>) : <p className="text-slate-400">No data yet.</p>}</div></div>;
}

function Mini({ label, value }: any) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-3"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-700">{value || 'Not specified'}</p></div>;
}

function Suggestion({ item }: any) {
  return <div className="rounded-[22px] border border-slate-200 bg-white p-4"><h4 className="font-black text-slate-950">{item.title}</h4><p className="mt-2 text-sm text-slate-600">{item.objective || item.reason}</p><div className="mt-3 flex flex-wrap gap-2"><Badge>{item.estimatedMinutes || item.questionCount || 5} min/questions</Badge>{item.difficulty && <Badge>{item.difficulty}</Badge>}</div></div>;
}

function Insight({ label, value }: any) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>;
}
