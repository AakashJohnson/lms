import { useCallback, useState, type ElementType, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Tag,
  Upload,
  Video,
} from 'lucide-react';
import { uploadMedia } from '../../services/mediaService';
import { toast } from 'sonner';

export interface UploadedContentPayload {
  title: string;
  description: string;
  type: 'video' | 'audio';
  category: string;
  tags: string[];
  visibility: 'catalog' | 'courses_only' | 'draft';
  linkedCourses: string[];
  primaryFileLabel: string;
  thumbnailLabel: string;
}

interface UploadContentProps {
  userRole: 'admin' | 'trainer';
  onBack: () => void;
  onPublish: (payload: UploadedContentPayload) => void;
}

const CATEGORIES = ['educational', 'training', 'documentary', 'tutorial', 'webinar', 'other'];

const LINKABLE_COURSES = [
  'Cooperative Management Fundamentals',
  'Digital Marketing for Cooperatives',
  'Financial Literacy & Accounting',
  'Legal Compliance for Cooperatives',
];

const STEPS = [
  { id: 0, label: 'Basics', icon: BookOpen },
  { id: 1, label: 'Media files', icon: Upload },
  { id: 2, label: 'Audience', icon: Globe },
  { id: 3, label: 'Review', icon: Eye },
];

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white';

export function UploadContent({ userRole, onBack, onPublish }: UploadContentProps) {
  const [step, setStep] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [data, setData] = useState<UploadedContentPayload>({
    title: '',
    description: '',
    type: 'video',
    category: 'educational',
    tags: [],
    visibility: 'catalog',
    linkedCourses: [],
    primaryFileLabel: '',
    thumbnailLabel: '',
  });

  const set = useCallback(<K extends keyof UploadedContentPayload>(key: K, val: UploadedContentPayload[K]) => {
    setData((d) => ({ ...d, [key]: val }));
  }, []);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !data.tags.includes(t)) set('tags', [...data.tags, t]);
    setTagInput('');
  };

  const canNext = () => {
    if (step === 0) return Boolean(data.title.trim());
    if (step === 1) return Boolean(data.primaryFileLabel.trim());
    return true;
  };

  const finish = async () => {
    if (!primaryFile) {
      toast.error('Please upload a media file');
      return;
    }

    try {
      setSubmitting(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', primaryFile); // Backend expects 'file' field
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('type', data.type);
      formData.append('category', data.category);
      formData.append('tags', JSON.stringify(data.tags));
      formData.append('source', 'media_library');
      formData.append('module', 'media_library');
      formData.append('usageType', 'library_resource');
      
      // Note: Thumbnail upload not supported yet in backend
      // Backend only accepts single file upload

      // Upload to backend
      const response = await uploadMedia(formData);
      
      if (response.success) {
        toast.success('Media uploaded successfully!');
        onPublish(data);
      } else {
        toast.error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload media');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF]">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Upload library content</h1>
            <p className="text-xs text-gray-500">
              {data.title || 'Untitled'} · Step {step + 1} of {STEPS.length} · Same flow as creating a course
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full capitalize">{userRole}</span>
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
                  active ? 'bg-indigo-600 text-white shadow-sm' : done ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
          <Card title="Describe the asset" icon={BookOpen}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input className={inputClass} value={data.title} onChange={(e) => set('title', e.target.value)} placeholder="Clear title learners will search for" />
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <select className={inputClass} value={data.type} onChange={(e) => set('type', e.target.value as 'video' | 'audio')}>
                    <option value="video">Video lesson</option>
                    <option value="audio">Audio / podcast</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select className={inputClass} value={data.category} onChange={(e) => set('category', e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Synopsis</label>
                <textarea className={inputClass} rows={4} value={data.description} onChange={(e) => set('description', e.target.value)} placeholder="Learning objectives, speaker notes, transcript hints…" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4" /> Tags
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {data.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                      {t}
                      <button type="button" className="hover:text-red-600" onClick={() => set('tags', data.tags.filter((x) => x !== t))}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className={inputClass} value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Press Enter to add" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <button type="button" onClick={addTag} className="px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card title="Upload primary media & thumbnail" icon={Upload}>
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition-all">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Primary {data.type === 'video' ? 'video' : 'audio'} file</p>
                <p className="text-sm text-gray-600 mb-4">MP4 / MOV / MP3 · max 500MB · virus scan simulated</p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium cursor-pointer hover:bg-indigo-700 text-sm">
                  <Upload className="w-4 h-4" />
                  Choose file
                  <input
                    type="file"
                    className="hidden"
                    accept={data.type === 'video' ? 'video/*' : 'audio/*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPrimaryFile(file);
                        set('primaryFileLabel', file.name);
                      }
                    }}
                  />
                </label>
                {data.primaryFileLabel && <p className="text-xs text-green-700 mt-3 font-medium">Selected: {data.primaryFileLabel}</p>}
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Thumbnail / cover art</p>
                <p className="text-sm text-gray-600 mb-4">1280×720 JPG or PNG</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl font-medium cursor-pointer hover:bg-gray-50 text-sm">
                  Upload thumbnail
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setThumbnailFile(file);
                        set('thumbnailLabel', file.name);
                      }
                    }} 
                  />
                </label>
                {data.thumbnailLabel && <p className="text-xs text-gray-600 mt-2">Selected: {data.thumbnailLabel}</p>}
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card title="Who can access this?" icon={Globe}>
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { id: 'catalog' as const, title: 'Public catalog', desc: 'Shows in Content Library for eligible learners.', icon: Globe },
                  { id: 'courses_only' as const, title: 'Linked courses only', desc: 'Hidden from browse — embedded inside modules.', icon: BookOpen },
                  { id: 'draft' as const, title: 'Draft', desc: 'Only admins/trainers preview until published.', icon: Lock },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = data.visibility === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => set('visibility', opt.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${active ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Icon className="w-6 h-6 text-indigo-600 mb-2" />
                      <p className="font-semibold text-gray-900 text-sm">{opt.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Attach to courses (optional)</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {LINKABLE_COURSES.map((c) => (
                    <label key={c} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.linkedCourses.includes(c)}
                        onChange={(e) =>
                          set(
                            'linkedCourses',
                            e.target.checked ? [...data.linkedCourses, c] : data.linkedCourses.filter((x) => x !== c)
                          )
                        }
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-800">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card title="Review & publish" icon={Eye}>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              <Row label="Title" value={data.title || '—'} />
              <Row label="Type" value={data.type} />
              <Row label="Category" value={data.category} />
              <Row label="Tags" value={data.tags.join(', ') || '—'} />
              <Row label="Primary file" value={data.primaryFileLabel || '—'} />
              <Row label="Thumbnail" value={data.thumbnailLabel || 'Auto-generated'} />
              <Row label="Visibility" value={data.visibility.replace('_', ' ')} />
              <Row label="Linked courses" value={data.linkedCourses.length ? data.linkedCourses.join(', ') : 'None'} />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Publishing queues transcoding, accessibility captions (simulated), and CDN propagation — mirroring the course publishing checklist.
            </p>
          </Card>
        )}

        <div className="flex gap-3 pt-4">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-40 flex items-center gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" disabled={submitting || !data.title.trim()} onClick={finish} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-40 flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Publish to library
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: ElementType; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-purple-50/80 to-white">
        <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 px-6 py-4">
      <span className="text-sm text-gray-500 w-44 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 capitalize">{value}</span>
    </div>
  );
}
