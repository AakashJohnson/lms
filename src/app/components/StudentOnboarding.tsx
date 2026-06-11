import { useCallback, useState, type ElementType, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';

type UserStatus = 'Active' | 'Pending' | 'Blocked';
type UserRole = 'Student' | 'Trainer' | 'Admin';

export interface OnboardingStudentPayload {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  gender: string;
  dob: string;
  address: string;
  state: string;
  district: string;
  organization: string;
  designation: string;
  qualification: string;
  enrolledCourses: string[];
  batchId: string;
  notes: string;
  sendInviteEmail: boolean;
}

interface StudentOnboardingProps {
  userRole: 'admin' | 'trainer';
  onBack: () => void;
  onComplete: (payload: OnboardingStudentPayload) => void;
}

const BATCHES = ['Batch A - 2026', 'Batch B - 2026', 'Batch C - 2025', 'Batch D - 2025'];

const COURSES = [
  'Cooperative Management Fundamentals',
  'Digital Marketing for Cooperatives',
  'Financial Literacy & Accounting',
  'Legal Compliance for Cooperatives',
];

const STATES = [
  'Andhra Pradesh',
  'Maharashtra',
  'Uttar Pradesh',
  'Gujarat',
  'Punjab',
  'Rajasthan',
  'Karnataka',
  'Tamil Nadu',
  'Delhi',
];

const STEPS = [
  { id: 0, label: 'Getting started', icon: Sparkles },
  { id: 1, label: 'Identity & contact', icon: UserPlus },
  { id: 2, label: 'Organisation', icon: Building2 },
  { id: 3, label: 'Programme', icon: BookOpen },
  { id: 4, label: 'Review', icon: CheckCircle2 },
];

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white';

export function StudentOnboarding({ userRole, onBack, onComplete }: StudentOnboardingProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [pathway, setPathway] = useState<'invite' | 'manual'>('invite');

  const [form, setForm] = useState<OnboardingStudentPayload>({
    name: '',
    email: '',
    phone: '',
    role: userRole === 'trainer' ? 'Student' : 'Student',
    status: 'Pending',
    gender: '',
    dob: '',
    address: '',
    state: '',
    district: '',
    organization: '',
    designation: '',
    qualification: '',
    enrolledCourses: [],
    batchId: '',
    notes: '',
    sendInviteEmail: true,
  });

  const set = useCallback(<K extends keyof OnboardingStudentPayload>(k: K, v: OnboardingStudentPayload[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return Boolean(form.name.trim() && form.email.trim());
    if (step === 2) return true;
    if (step === 3) return true;
    return true;
  };

  const handleFinish = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    onComplete({
      ...form,
      role: userRole === 'trainer' ? 'Student' : form.role,
      status: pathway === 'invite' ? 'Pending' : form.status,
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF]">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Onboard a new student</h1>
            <p className="text-xs text-gray-500">
              Step {step + 1} of {STEPS.length} · Guided setup with checklist
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-1 overflow-x-auto max-w-5xl mx-auto">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done = idx < step;
            const active = idx === step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => idx <= step && setStep(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : done
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                {s.label}
                {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 ml-1 opacity-50" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {step === 0 && (
          <SectionCard title="Choose how they join" subtitle="Pick a pathway — you can change details later." icon={Sparkles}>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPathway('invite')}
                className={`text-left p-6 rounded-2xl border-2 transition-all ${
                  pathway === 'invite' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Mail className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Invite by email</h3>
                <p className="text-sm text-gray-600">
                  Send an onboarding link and OTP verification. Student completes profile after first login — best for large cohorts.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPathway('manual')}
                className={`text-left p-6 rounded-2xl border-2 transition-all ${
                  pathway === 'manual' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Users className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Register fully now</h3>
                <p className="text-sm text-gray-600">
                  Capture every field today and activate immediately — ideal for walk-ins or verified trainees from workshops.
                </p>
              </button>
            </div>
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-700">
              <p className="font-medium text-blue-900 mb-2">What happens next</p>
              <ul className="list-disc list-inside space-y-1 text-blue-900/80">
                <li>Required checks: unique email and valid phone format.</li>
                <li>Optional: assign batch and courses before they log in.</li>
                <li>You can bulk-import additional rows from Excel (.csv template) from the students list.</li>
              </ul>
            </div>
          </SectionCard>
        )}

        {step === 1 && (
          <SectionCard title="Identity & contact" subtitle="Minimum needed to create an account." icon={UserPlus}>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Full name" required>
                <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rahul Sharma" />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Gender">
                <select className={inputClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </Field>
              <Field label="Date of birth">
                <input type="date" className={inputClass} value={form.dob} onChange={(e) => set('dob', e.target.value)} />
              </Field>
              <Field label="Address" className="md:col-span-2">
                <textarea className={inputClass} rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, landmark" />
              </Field>
            </div>
          </SectionCard>
        )}

        {step === 2 && (
          <SectionCard title="Organisation & background" subtitle="Helps trainers place learners in the right programmes." icon={Building2}>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Organisation / society">
                <input
                  className={inputClass}
                  value={form.organization}
                  onChange={(e) => set('organization', e.target.value)}
                  placeholder="e.g. District Co-operative union"
                />
              </Field>
              <Field label="Designation">
                <input className={inputClass} value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Branch officer" />
              </Field>
              <Field label="Qualification">
                <select className={inputClass} value={form.qualification} onChange={(e) => set('qualification', e.target.value)}>
                  <option value="">Select</option>
                  <option>Below 10th</option>
                  <option>10th Pass</option>
                  <option>12th Pass</option>
                  <option>Diploma</option>
                  <option>Graduate</option>
                  <option>Post Graduate</option>
                  <option>PhD</option>
                </select>
              </Field>
              <Field label="State">
                <select className={inputClass} value={form.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
              </Field>
              <Field label="District">
                <input className={inputClass} value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="District" />
              </Field>
              <Field label="Internal notes" className="md:col-span-2">
                <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Source of lead, referral, accessibility needs…" />
              </Field>
            </div>
          </SectionCard>
        )}

        {step === 3 && (
          <SectionCard title="Programme placement" subtitle="Link courses and batch before day one." icon={BookOpen}>
            <div className="space-y-6">
              {userRole === 'admin' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Platform role">
                    <select className={inputClass} value={form.role} onChange={(e) => set('role', e.target.value as UserRole)}>
                      <option>Student</option>
                      <option>Trainer</option>
                      <option>Admin</option>
                    </select>
                  </Field>
                  <Field label="Account status">
                    <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as UserStatus)}>
                      <option>Pending</option>
                      <option>Active</option>
                      <option>Blocked</option>
                    </select>
                  </Field>
                </div>
              )}
              <Field label="Assign batch">
                <select className={inputClass} value={form.batchId} onChange={(e) => set('batchId', e.target.value)}>
                  <option value="">No batch yet</option>
                  {BATCHES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Course enrolments</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {COURSES.map((c) => (
                    <label key={c} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer border border-transparent">
                      <input
                        type="checkbox"
                        checked={form.enrolledCourses.includes(c)}
                        onChange={(e) =>
                          set(
                            'enrolledCourses',
                            e.target.checked ? [...form.enrolledCourses, c] : form.enrolledCourses.filter((x) => x !== c)
                          )
                        }
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-800">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" checked={form.sendInviteEmail} onChange={(e) => set('sendInviteEmail', e.target.checked)} />
                <span className="text-sm text-gray-700">{pathway === 'invite' ? 'Send invitation email with login steps' : 'Send welcome email with programme summary'}</span>
              </label>
            </div>
          </SectionCard>
        )}

        {step === 4 && (
          <SectionCard title="Review & confirm" subtitle="Everything looks correct before saving." icon={CheckCircle2}>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              <ReviewRow label="Pathway" value={pathway === 'invite' ? 'Email invite + OTP' : 'Fully registered now'} />
              <ReviewRow label="Name" value={form.name || '—'} />
              <ReviewRow label="Email" value={form.email || '—'} />
              <ReviewRow label="Phone" value={form.phone || '—'} />
              <ReviewRow label="Organisation" value={form.organization || '—'} />
              <ReviewRow label="Batch" value={form.batchId || '—'} />
              <ReviewRow label="Courses" value={form.enrolledCourses.length ? form.enrolledCourses.join(', ') : 'None yet'} />
              {userRole === 'admin' && <ReviewRow label="Role / status" value={`${form.role} · ${form.status}`} />}
              <ReviewRow label="Notifications" value={form.sendInviteEmail ? 'Email will be sent' : 'No email'} />
            </div>
          </SectionCard>
        )}

        <div className="flex gap-3 pt-4">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-40 flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!form.name.trim() || !form.email.trim() || submitting}
              onClick={handleFinish}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
              Finish onboarding
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4 bg-gradient-to-r from-indigo-50/80 to-white">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, required, children, className = '' }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 px-6 py-4">
      <span className="text-sm text-gray-500 w-48 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
