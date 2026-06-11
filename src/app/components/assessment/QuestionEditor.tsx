import { useRef, useState } from 'react';
import {
  GripVertical, Trash2, Plus, X, ChevronDown, ChevronRight,
  CheckCircle2, Circle, Mic, Code2, FileUp, Volume2, Video,
  AlignLeft, Star, Grid3X3, ImageIcon, ArrowUpDown, ToggleLeft,
  CopyPlus, Eye, EyeOff, Bot, Loader2,
} from 'lucide-react';
import { VoiceInputField } from '../course/VoiceInputField';
import { RichTextEditor } from '../course/RichTextEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'mcq' | 'msq' | 'truefalse' | 'fillblank' | 'match'
  | 'shortanswer' | 'longanswer' | 'ordering' | 'rating' | 'matrix'
  | 'hotspot' | 'fileupload' | 'code' | 'audio' | 'video';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MCQOption { id: string; text: string; isCorrect: boolean; explanation?: string }
export interface MatchPair { id: string; left: string; right: string }
export interface OrderItem { id: string; text: string }
export interface MatrixRow { id: string; label: string; correctCol: string }
export interface MatrixCol { id: string; label: string }
export interface HotspotArea { id: string; x: number; y: number; w: number; h: number; label: string }
export interface CodeTestCase { id: string; input: string; expected: string }
export interface RubricItem { id: string; label: string; points: number }

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  explanation: string;
  points: number;
  negativePoints: number;
  difficulty: Difficulty;
  tags: string[];
  required: boolean;
  sectionBreak?: boolean;
  sectionTitle?: string;

  // MCQ / MSQ
  options?: MCQOption[];

  // True/False
  tfAnswer?: boolean;

  // Fill in blank
  blanks?: string[];
  caseSensitive?: boolean;

  // Match
  matchPairs?: MatchPair[];

  // Short / long answer
  sampleAnswer?: string;
  wordLimit?: number;
  keywords?: string[];
  rubric?: RubricItem[];

  // Ordering
  orderItems?: OrderItem[];

  // Rating
  ratingScale?: 5 | 7 | 10;
  ratingMinLabel?: string;
  ratingMaxLabel?: string;

  // Matrix
  matrixRows?: MatrixRow[];
  matrixCols?: MatrixCol[];

  // Hotspot
  hotspotImage?: string;
  hotspotAreas?: HotspotArea[];

  // File upload
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  maxFiles?: number;

  // Code
  codeLanguage?: string;
  codeTemplate?: string;
  codeTestCases?: CodeTestCase[];
  codeSolution?: string;

  // Audio / Video
  maxRecordSeconds?: number;
  promptImage?: string;
  promptAudio?: string;
  promptVideo?: string;
}

export const QUESTION_TYPES: { type: QuestionType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'mcq',        label: 'Multiple Choice',    icon: Circle,       color: 'indigo' },
  { type: 'msq',        label: 'Multiple Select',    icon: CheckCircle2, color: 'blue' },
  { type: 'truefalse',  label: 'True / False',       icon: ToggleLeft,   color: 'green' },
  { type: 'fillblank',  label: 'Fill in the Blank',  icon: AlignLeft,    color: 'yellow' },
  { type: 'match',      label: 'Match the Following',icon: Grid3X3,      color: 'orange' },
  { type: 'shortanswer',label: 'Short Answer',       icon: AlignLeft,    color: 'teal' },
  { type: 'longanswer', label: 'Long Answer / Essay',icon: AlignLeft,    color: 'purple' },
  { type: 'ordering',   label: 'Ordering / Sequence',icon: ArrowUpDown,  color: 'pink' },
  { type: 'rating',     label: 'Rating / Likert',    icon: Star,         color: 'amber' },
  { type: 'matrix',     label: 'Matrix Grid',        icon: Grid3X3,      color: 'cyan' },
  { type: 'hotspot',    label: 'Image Hotspot',      icon: ImageIcon,    color: 'red' },
  { type: 'fileupload', label: 'File Upload',        icon: FileUp,       color: 'slate' },
  { type: 'code',       label: 'Code Question',      icon: Code2,        color: 'emerald' },
  { type: 'audio',      label: 'Audio Response',     icon: Mic,          color: 'violet' },
  { type: 'video',      label: 'Video Response',     icon: Video,        color: 'rose' },
];

const mkId = () => Math.random().toString(36).slice(2, 9);

const TYPE_COLOR: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  teal:   'bg-teal-100 text-teal-700',
  purple: 'bg-purple-100 text-purple-700',
  pink:   'bg-pink-100 text-pink-700',
  amber:  'bg-amber-100 text-amber-700',
  cyan:   'bg-cyan-100 text-cyan-700',
  red:    'bg-red-100 text-red-700',
  slate:  'bg-slate-100 text-slate-700',
  emerald:'bg-emerald-100 text-emerald-700',
  violet: 'bg-violet-100 text-violet-700',
  rose:   'bg-rose-100 text-rose-700',
};

// ─── Default question factories ───────────────────────────────────────────────

export function makeQuestion(type: QuestionType): Question {
  const base: Question = {
    id: mkId(), type, questionText: '', explanation: '',
    points: 1, negativePoints: 0, difficulty: 'medium',
    tags: [], required: true,
  };
  switch (type) {
    case 'mcq':
    case 'msq':
      return {
        ...base,
        options: [
          { id: mkId(), text: '', isCorrect: false },
          { id: mkId(), text: '', isCorrect: false },
          { id: mkId(), text: '', isCorrect: false },
          { id: mkId(), text: '', isCorrect: false },
        ],
      };
    case 'truefalse':
      return { ...base, tfAnswer: true };
    case 'fillblank':
      return { ...base, blanks: [''], caseSensitive: false };
    case 'match':
      return { ...base, matchPairs: [{ id: mkId(), left: '', right: '' }, { id: mkId(), left: '', right: '' }] };
    case 'shortanswer':
      return { ...base, sampleAnswer: '', keywords: [], wordLimit: 150, points: 2 };
    case 'longanswer':
      return { ...base, sampleAnswer: '', wordLimit: 500, rubric: [], points: 10 };
    case 'ordering':
      return { ...base, orderItems: [{ id: mkId(), text: '' }, { id: mkId(), text: '' }, { id: mkId(), text: '' }] };
    case 'rating':
      return { ...base, ratingScale: 5, ratingMinLabel: 'Strongly Disagree', ratingMaxLabel: 'Strongly Agree', points: 0 };
    case 'matrix':
      return {
        ...base, points: 4,
        matrixRows: [{ id: mkId(), label: '', correctCol: '' }, { id: mkId(), label: '', correctCol: '' }],
        matrixCols: [{ id: mkId(), label: 'Option A' }, { id: mkId(), label: 'Option B' }, { id: mkId(), label: 'Option C' }],
      };
    case 'hotspot':
      return { ...base, hotspotImage: '', hotspotAreas: [] };
    case 'fileupload':
      return { ...base, allowedFileTypes: ['pdf', 'doc', 'docx'], maxFileSizeMB: 10, maxFiles: 1, points: 0 };
    case 'code':
      return {
        ...base, points: 5,
        codeLanguage: 'python', codeTemplate: '# Write your code here\n',
        codeTestCases: [{ id: mkId(), input: '', expected: '' }], codeSolution: '',
      };
    case 'audio':
      return { ...base, maxRecordSeconds: 120, sampleAnswer: '', points: 0 };
    case 'video':
      return { ...base, maxRecordSeconds: 300, points: 0 };
    default:
      return base;
  }
}

// ─── Main QuestionEditor Component ───────────────────────────────────────────

interface QuestionEditorProps {
  question: Question;
  index: number;
  globalLang?: string;
  onUpdate: (patch: Partial<Question>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function QuestionEditor({
  question, index, globalLang = 'en',
  onUpdate, onRemove, onDuplicate, onRegenerate, isRegenerating,
  isDragging, dragHandleProps,
}: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const typeInfo = QUESTION_TYPES.find((t) => t.type === question.type)!;
  const TypeIcon = typeInfo?.icon ?? Circle;
  const colorClass = TYPE_COLOR[typeInfo?.color ?? 'indigo'] ?? 'bg-indigo-100 text-indigo-700';

  const tagInput = useState('');
  const [tagVal, setTagVal] = tagInput;

  const addTag = () => {
    const t = tagVal.trim();
    if (t && !question.tags.includes(t)) onUpdate({ tags: [...question.tags, t] });
    setTagVal('');
  };

  const uploadMedia = (kind: 'image' | 'audio' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      if (kind === 'image') onUpdate({ promptImage: url });
      if (kind === 'audio') onUpdate({ promptAudio: url });
      if (kind === 'video') onUpdate({ promptVideo: url });
    };
    input.click();
  };

  const startRecording = async (kind: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'audio' ? { audio: true } : { audio: true, video: true }
      );
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: kind === 'audio' ? 'audio/webm' : 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        if (kind === 'audio') onUpdate({ promptAudio: url });
        if (kind === 'video') onUpdate({ promptVideo: url });
        stream.getTracks().forEach((track) => track.stop());
        setRecordingType(null);
      };
      recorder.start();
      setRecordingType(kind);
    } catch {
      alert('Could not access microphone/camera. Please check browser permissions.');
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all shadow-sm ${isDragging ? 'border-indigo-400 shadow-lg opacity-80' : 'border-gray-200 hover:border-gray-300'}`}>
      {/* Question Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80 rounded-t-2xl border-b border-gray-200">
        <div
          {...dragHandleProps}
          className="p-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest min-w-[2rem]">
          Q{index + 1}
        </span>

        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          <TypeIcon className="w-3 h-3" />
          {typeInfo?.label}
        </span>

        {question.questionText && (
          <span className="text-sm text-gray-600 truncate flex-1 max-w-xs hidden md:block">
            {question.questionText.replace(/<[^>]+>/g, '').slice(0, 60)}
            {question.questionText.length > 60 ? '…' : ''}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Difficulty badge */}
          <select
            value={question.difficulty}
            onChange={(e) => onUpdate({ difficulty: e.target.value as Difficulty })}
            className={`text-xs px-2 py-1 rounded-lg border-0 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
              question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Points */}
          <div className="flex items-center gap-0.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
            <span className="text-xs text-indigo-500 font-medium">Pts</span>
            <input
              type="number"
              min={0}
              value={question.points}
              onChange={(e) => onUpdate({ points: +e.target.value })}
              className="w-10 text-xs text-indigo-700 font-bold bg-transparent border-0 focus:outline-none text-center"
            />
          </div>

          <button onClick={onDuplicate} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Duplicate">
            <CopyPlus className="w-4 h-4" />
          </button>
          {onRegenerate && (
            <button onClick={onRegenerate} disabled={isRegenerating} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50" title="Regenerate with AI">
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onRemove} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete question">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-5 space-y-5">
          {/* Question prompt */}
          <RichTextEditor
            label="Question Text"
            required
            value={question.questionText}
            onChange={(v) => onUpdate({ questionText: v })}
            placeholder="Enter your question here…"
            height={180}
            lang={globalLang}
            showTranslate={globalLang !== 'en'}
            translateTargetLang="en"
          />

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Question Media (image/audio/video)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <button type="button" onClick={() => uploadMedia('image')} className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50">Upload image</button>
              <button type="button" onClick={() => uploadMedia('audio')} className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50">Upload audio</button>
              <button type="button" onClick={() => uploadMedia('video')} className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50">Upload video</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {recordingType === 'audio' ? (
                <button type="button" onClick={stopRecording} className="px-3 py-2 text-xs rounded-lg bg-red-600 text-white">
                  Stop audio recording
                </button>
              ) : (
                <button type="button" onClick={() => startRecording('audio')} className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50">
                  Record audio
                </button>
              )}
              {recordingType === 'video' ? (
                <button type="button" onClick={stopRecording} className="px-3 py-2 text-xs rounded-lg bg-red-600 text-white">
                  Stop video recording
                </button>
              ) : (
                <button type="button" onClick={() => startRecording('video')} className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50">
                  Record video
                </button>
              )}
            </div>
            <div className="space-y-2">
              {question.promptImage && (
                <img src={question.promptImage} alt="Question prompt" className="h-24 rounded-lg border border-gray-200" />
              )}
              {question.promptAudio && <audio controls src={question.promptAudio} className="w-full" />}
              {question.promptVideo && (
                <video controls src={question.promptVideo} className="w-full max-h-48 rounded-lg border border-gray-200" />
              )}
            </div>
          </div>

          {/* Type-specific editor */}
          <TypeBody question={question} onUpdate={onUpdate} globalLang={globalLang} />

          {/* Meta row: tags, negative marks, explanation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 border-t border-gray-100">
            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Topic Tags</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {question.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {t}
                    <button onClick={() => onUpdate({ tags: question.tags.filter((x) => x !== t) })}>
                      <X className="w-2.5 h-2.5 ml-0.5 hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={tagVal}
                  onChange={(e) => setTagVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag…"
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button onClick={addTag} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors">+</button>
              </div>
            </div>

            {/* Negative marking */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Negative Marks</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={question.negativePoints}
                  onChange={(e) => onUpdate({ negativePoints: +e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">deducted on wrong</span>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-indigo-600"
                />
                <span className="text-xs text-gray-500">Required question</span>
              </label>
            </div>

            {/* Explanation */}
            <div>
              <button
                onClick={() => setShowExplanation((s) => !s)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-600 mb-1 transition-colors"
              >
                {showExplanation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                Explanation (shown after attempt)
              </button>
              {showExplanation && (
                <VoiceInputField
                  value={question.explanation}
                  onChange={(v) => onUpdate({ explanation: v })}
                  placeholder="Why is this the correct answer?"
                  lang={globalLang}
                  multiline
                  rows={2}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Type-specific body components ───────────────────────────────────────────

function TypeBody({
  question, onUpdate, globalLang,
}: { question: Question; onUpdate: (p: Partial<Question>) => void; globalLang: string }) {
  switch (question.type) {
    case 'mcq':    return <MCQBody    q={question} onUpdate={onUpdate} lang={globalLang} multi={false} />;
    case 'msq':    return <MCQBody    q={question} onUpdate={onUpdate} lang={globalLang} multi={true} />;
    case 'truefalse':  return <TFBody     q={question} onUpdate={onUpdate} />;
    case 'fillblank':  return <FillBody   q={question} onUpdate={onUpdate} lang={globalLang} />;
    case 'match':      return <MatchBody  q={question} onUpdate={onUpdate} lang={globalLang} />;
    case 'shortanswer':return <ShortBody  q={question} onUpdate={onUpdate} lang={globalLang} />;
    case 'longanswer': return <LongBody   q={question} onUpdate={onUpdate} lang={globalLang} />;
    case 'ordering':   return <OrderBody  q={question} onUpdate={onUpdate} lang={globalLang} />;
    case 'rating':     return <RatingBody q={question} onUpdate={onUpdate} />;
    case 'matrix':     return <MatrixBody q={question} onUpdate={onUpdate} lang={globalLang} />;
    case 'hotspot':    return <HotspotBody q={question} onUpdate={onUpdate} />;
    case 'fileupload': return <FileBody   q={question} onUpdate={onUpdate} />;
    case 'code':       return <CodeBody   q={question} onUpdate={onUpdate} />;
    case 'audio':      return <AudioBody  q={question} onUpdate={onUpdate} lang={globalLang} />;
    case 'video':      return <VideoBody  q={question} onUpdate={onUpdate} />;
    default:           return null;
  }
}

// MCQ / MSQ ───────────────────────────────────────────────────────────────────

function MCQBody({ q, onUpdate, lang, multi }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string; multi: boolean }) {
  const options = q.options ?? [];

  const setOption = (id: string, patch: Partial<MCQOption>) =>
    onUpdate({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  const toggleCorrect = (id: string) =>
    onUpdate({
      options: options.map((o) =>
        multi
          ? o.id === id ? { ...o, isCorrect: !o.isCorrect } : o
          : { ...o, isCorrect: o.id === id }
      ),
    });

  const removeOption = (id: string) => onUpdate({ options: options.filter((o) => o.id !== id) });

  const addOption = () =>
    onUpdate({ options: [...options, { id: mkId(), text: '', isCorrect: false }] });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700">
          Options {multi ? '(check all correct)' : '(select one correct)'}
        </label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" className="w-3.5 h-3.5 rounded text-indigo-600"
              checked={(q as any).shuffleOptions ?? false}
              onChange={(e) => onUpdate({ ...(q as any), shuffleOptions: e.target.checked } as any)}
            />
            Shuffle options
          </label>
        </div>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={opt.id} className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${opt.isCorrect ? 'border-green-300 bg-green-50/60' : 'border-gray-200 bg-gray-50/40'}`}>
            <button
              onClick={() => toggleCorrect(opt.id)}
              className={`mt-2.5 flex-shrink-0 transition-colors ${opt.isCorrect ? 'text-green-600' : 'text-gray-300 hover:text-gray-500'}`}
              title={multi ? 'Toggle correct' : 'Set as correct'}
            >
              {multi
                ? (opt.isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 border-2 border-gray-300 rounded" />)
                : (opt.isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />)
              }
            </button>

            <span className="mt-2.5 text-xs font-bold text-gray-400 w-5 flex-shrink-0">
              {String.fromCharCode(65 + i)}
            </span>

            <div className="flex-1">
              <VoiceInputField
                value={opt.text}
                onChange={(v) => setOption(opt.id, { text: v })}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                lang={lang}
              />
              {opt.isCorrect && (
                <input
                  type="text"
                  value={opt.explanation ?? ''}
                  onChange={(e) => setOption(opt.id, { explanation: e.target.value })}
                  placeholder="Hint shown when this option is selected (optional)"
                  className="mt-1.5 w-full px-3 py-1.5 border border-green-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
                />
              )}
            </div>

            <button onClick={() => removeOption(opt.id)} className="mt-2.5 p-1 text-gray-300 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {options.length < 8 && (
        <button onClick={addOption} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-3 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add option
        </button>
      )}
    </div>
  );
}

// True/False ──────────────────────────────────────────────────────────────────

function TFBody({ q, onUpdate }: { q: Question; onUpdate: (p: Partial<Question>) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Correct Answer</label>
      <div className="flex gap-4">
        {[true, false].map((val) => (
          <label
            key={String(val)}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all font-semibold text-sm ${
              q.tfAnswer === val
                ? (val ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700')
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <input type="radio" name={`tf-${q.id}`} checked={q.tfAnswer === val} onChange={() => onUpdate({ tfAnswer: val })} className="sr-only" />
            {val ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {val ? 'True' : 'False'}
          </label>
        ))}
      </div>
    </div>
  );
}

// Fill in the Blank ───────────────────────────────────────────────────────────

function FillBody({ q, onUpdate, lang }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string }) {
  const blanks = q.blanks ?? [''];
  const setBlank = (i: number, v: string) => onUpdate({ blanks: blanks.map((b, idx) => (idx === i ? v : b)) });
  const addBlank = () => onUpdate({ blanks: [...blanks, ''] });
  const removeBlank = (i: number) => onUpdate({ blanks: blanks.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <strong>Tip:</strong> Use <code className="bg-blue-100 px-1 rounded">___</code> (3 underscores) in the question text above to mark blank positions.
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answers for Each Blank</label>
        <div className="space-y-2">
          {blanks.map((blank, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-xs font-medium text-gray-500">Blank {i + 1}</span>
              <VoiceInputField value={blank} onChange={(v) => setBlank(i, v)} placeholder="Correct answer" lang={lang} className="flex-1" />
              {blanks.length > 1 && (
                <button onClick={() => removeBlank(i)} className="p-1.5 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addBlank} className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-2 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add blank
        </button>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={q.caseSensitive ?? false} onChange={(e) => onUpdate({ caseSensitive: e.target.checked })} className="w-4 h-4 rounded text-indigo-600" />
        <span className="text-sm text-gray-600">Case-sensitive matching</span>
      </label>
    </div>
  );
}

// Match the Following ─────────────────────────────────────────────────────────

function MatchBody({ q, onUpdate, lang }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string }) {
  const pairs = q.matchPairs ?? [];

  const setPair = (id: string, patch: Partial<MatchPair>) =>
    onUpdate({ matchPairs: pairs.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const removePair = (id: string) => onUpdate({ matchPairs: pairs.filter((p) => p.id !== id) });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Column A</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Column B</span>
      </div>
      {pairs.map((pair, i) => (
        <div key={pair.id} className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
          <VoiceInputField value={pair.left} onChange={(v) => setPair(pair.id, { left: v })} placeholder={`Left item ${i + 1}`} lang={lang} className="flex-1" />
          <span className="text-indigo-400 font-bold text-lg">↔</span>
          <VoiceInputField value={pair.right} onChange={(v) => setPair(pair.id, { right: v })} placeholder={`Right item ${i + 1}`} lang={lang} className="flex-1" />
          <button onClick={() => removePair(pair.id)} className="p-1.5 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button onClick={() => onUpdate({ matchPairs: [...pairs, { id: mkId(), left: '', right: '' }] })} className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Add pair
      </button>
    </div>
  );
}

// Short Answer ────────────────────────────────────────────────────────────────

function ShortBody({ q, onUpdate, lang }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string }) {
  const [kw, setKw] = useState('');
  const addKw = () => {
    const k = kw.trim();
    if (k && !(q.keywords ?? []).includes(k)) onUpdate({ keywords: [...(q.keywords ?? []), k] });
    setKw('');
  };

  return (
    <div className="space-y-4">
      <VoiceInputField
        label="Sample / Model Answer"
        value={q.sampleAnswer ?? ''}
        onChange={(v) => onUpdate({ sampleAnswer: v })}
        placeholder="Expected answer (for auto-grading reference)…"
        lang={lang}
        multiline
        rows={3}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Must-contain Keywords</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(q.keywords ?? []).map((k) => (
            <span key={k} className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {k}
              <button onClick={() => onUpdate({ keywords: (q.keywords ?? []).filter((x) => x !== k) })}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKw())} placeholder="Type keyword and press Enter" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          <button onClick={addKw} className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-200 transition-colors">Add</button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Word Limit</label>
        <input type="number" value={q.wordLimit ?? 150} onChange={(e) => onUpdate({ wordLimit: +e.target.value })} className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </div>
    </div>
  );
}

// Long Answer / Essay ─────────────────────────────────────────────────────────

function LongBody({ q, onUpdate, lang }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string }) {
  const rubric = q.rubric ?? [];

  return (
    <div className="space-y-4">
      <RichTextEditor
        label="Sample Answer / Ideal Response"
        value={q.sampleAnswer ?? ''}
        onChange={(v) => onUpdate({ sampleAnswer: v })}
        height={200}
        lang={lang}
        showTranslate={lang !== 'en'}
        translateTargetLang="en"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Word Limit</label>
        <input type="number" value={q.wordLimit ?? 500} onChange={(e) => onUpdate({ wordLimit: +e.target.value })} className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Grading Rubric</label>
          <button onClick={() => onUpdate({ rubric: [...rubric, { id: mkId(), label: '', points: 0 }] })} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
            <Plus className="w-3.5 h-3.5" /> Add criterion
          </button>
        </div>
        {rubric.map((r) => (
          <div key={r.id} className="flex items-center gap-2 mb-2">
            <input type="text" value={r.label} onChange={(e) => onUpdate({ rubric: rubric.map((x) => x.id === r.id ? { ...x, label: e.target.value } : x) })} placeholder="Criterion (e.g. Grammar)" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            <input type="number" value={r.points} onChange={(e) => onUpdate({ rubric: rubric.map((x) => x.id === r.id ? { ...x, points: +e.target.value } : x) })} className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="Pts" />
            <button onClick={() => onUpdate({ rubric: rubric.filter((x) => x.id !== r.id) })} className="p-1.5 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ))}
        {rubric.length > 0 && (
          <p className="text-xs text-gray-400">Total rubric points: {rubric.reduce((a, r) => a + r.points, 0)}</p>
        )}
      </div>
    </div>
  );
}

// Ordering / Sequence ─────────────────────────────────────────────────────────

function OrderBody({ q, onUpdate, lang }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string }) {
  const items = q.orderItems ?? [];
  const [dragging, setDragging] = useState<number | null>(null);

  const setItem = (id: string, text: string) =>
    onUpdate({ orderItems: items.map((it) => it.id === id ? { ...it, text } : it) });

  const moveItem = (from: number, to: number) => {
    const arr = [...items];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onUpdate({ orderItems: arr });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">Items (in correct order)</label>
        <p className="text-xs text-gray-400">Drag to reorder · students will see them shuffled</p>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragging !== null) { moveItem(dragging, i); setDragging(null); } }}
            className={`flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 cursor-grab ${dragging === i ? 'opacity-50 border-indigo-400' : ''}`}
          >
            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
            <VoiceInputField value={item.text} onChange={(v) => setItem(item.id, v)} placeholder={`Item ${i + 1}`} lang={lang} className="flex-1" />
            <button onClick={() => onUpdate({ orderItems: items.filter((x) => x.id !== item.id) })} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => onUpdate({ orderItems: [...items, { id: mkId(), text: '' }] })} className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-2 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Add item
      </button>
    </div>
  );
}

// Rating / Likert ─────────────────────────────────────────────────────────────

function RatingBody({ q, onUpdate }: { q: Question; onUpdate: (p: Partial<Question>) => void }) {
  const scale = q.ratingScale ?? 5;
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rating Scale</label>
        <div className="flex gap-3">
          {([5, 7, 10] as const).map((s) => (
            <label key={s} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${scale === s ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-gray-200 text-gray-600'}`}>
              <input type="radio" name={`scale-${q.id}`} checked={scale === s} onChange={() => onUpdate({ ratingScale: s })} className="sr-only" />
              1 – {s}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Min Label (1)</label>
          <input type="text" value={q.ratingMinLabel ?? ''} onChange={(e) => onUpdate({ ratingMinLabel: e.target.value })} placeholder="e.g. Strongly Disagree" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Label ({scale})</label>
          <input type="text" value={q.ratingMaxLabel ?? ''} onChange={(e) => onUpdate({ ratingMaxLabel: e.target.value })} placeholder="e.g. Strongly Agree" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-1 pt-1">
        {Array.from({ length: scale }, (_, i) => (
          <div key={i} className="flex-1 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-xs text-indigo-600 font-medium">{i + 1}</div>
        ))}
      </div>
    </div>
  );
}

// Matrix Grid ─────────────────────────────────────────────────────────────────

function MatrixBody({ q, onUpdate, lang }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string }) {
  const rows = q.matrixRows ?? [];
  const cols = q.matrixCols ?? [];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Columns (answer options)</label>
          <button onClick={() => onUpdate({ matrixCols: [...cols, { id: mkId(), label: `Option ${cols.length + 1}` }] })} className="flex items-center gap-1 text-xs text-indigo-600"><Plus className="w-3.5 h-3.5" /> Add col</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {cols.map((col) => (
            <div key={col.id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
              <input type="text" value={col.label} onChange={(e) => onUpdate({ matrixCols: cols.map((c) => c.id === col.id ? { ...c, label: e.target.value } : c) })} className="w-24 text-xs bg-transparent border-0 focus:outline-none text-blue-700 font-medium" />
              <button onClick={() => onUpdate({ matrixCols: cols.filter((c) => c.id !== col.id) })}><X className="w-3 h-3 text-blue-400 hover:text-red-500" /></button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Rows (sub-questions)</label>
          <button onClick={() => onUpdate({ matrixRows: [...rows, { id: mkId(), label: '', correctCol: cols[0]?.id ?? '' }] })} className="flex items-center gap-1 text-xs text-indigo-600"><Plus className="w-3.5 h-3.5" /> Add row</button>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={row.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
              <VoiceInputField value={row.label} onChange={(v) => onUpdate({ matrixRows: rows.map((r) => r.id === row.id ? { ...r, label: v } : r) })} placeholder={`Row ${i + 1}`} lang={lang} className="flex-1" />
              <select value={row.correctCol} onChange={(e) => onUpdate({ matrixRows: rows.map((r) => r.id === row.id ? { ...r, correctCol: e.target.value } : r) })} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none text-green-700 bg-green-50">
                <option value="">Correct col</option>
                {cols.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button onClick={() => onUpdate({ matrixRows: rows.filter((r) => r.id !== row.id) })}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hotspot ─────────────────────────────────────────────────────────────────────

function HotspotBody({ q, onUpdate }: { q: Question; onUpdate: (p: Partial<Question>) => void }) {
  const areas = q.hotspotAreas ?? [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question Image</label>
        <input type="url" value={q.hotspotImage ?? ''} onChange={(e) => onUpdate({ hotspotImage: e.target.value })} placeholder="Paste image URL" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        {q.hotspotImage && (
          <div className="mt-2 relative inline-block">
            <img src={q.hotspotImage} alt="hotspot" className="max-h-48 rounded-xl border border-gray-200" />
            {areas.map((a) => (
              <div key={a.id} className="absolute border-2 border-green-500 bg-green-500/20 rounded" style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}>
                <span className="absolute -top-5 left-0 text-xs bg-green-500 text-white px-1 rounded">{a.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Clickable Areas (% coordinates)</label>
          <button onClick={() => onUpdate({ hotspotAreas: [...areas, { id: mkId(), x: 20, y: 20, w: 20, h: 20, label: 'Area ' + (areas.length + 1) }] })} className="flex items-center gap-1 text-xs text-indigo-600"><Plus className="w-3.5 h-3.5" /> Add area</button>
        </div>
        {areas.map((area) => (
          <div key={area.id} className="flex items-center gap-2 mb-2 flex-wrap">
            <input type="text" value={area.label} onChange={(e) => onUpdate({ hotspotAreas: areas.map((a) => a.id === area.id ? { ...a, label: e.target.value } : a) })} placeholder="Label" className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
            {(['x', 'y', 'w', 'h'] as const).map((key) => (
              <div key={key} className="flex items-center gap-1">
                <span className="text-xs text-gray-400">{key}%:</span>
                <input type="number" min={0} max={100} value={area[key]} onChange={(e) => onUpdate({ hotspotAreas: areas.map((a) => a.id === area.id ? { ...a, [key]: +e.target.value } : a) })} className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
              </div>
            ))}
            <button onClick={() => onUpdate({ hotspotAreas: areas.filter((a) => a.id !== area.id) })}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// File Upload ─────────────────────────────────────────────────────────────────

const FILE_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'png', 'zip', 'mp4', 'any'];

function FileBody({ q, onUpdate }: { q: Question; onUpdate: (p: Partial<Question>) => void }) {
  const allowed = q.allowedFileTypes ?? ['pdf'];
  const toggle = (t: string) =>
    onUpdate({ allowedFileTypes: allowed.includes(t) ? allowed.filter((x) => x !== t) : [...allowed, t] });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</label>
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((t) => (
            <button key={t} onClick={() => toggle(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${allowed.includes(t) ? 'border-indigo-500 bg-indigo-100 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              .{t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
          <select value={q.maxFileSizeMB ?? 10} onChange={(e) => onUpdate({ maxFileSizeMB: +e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none">
            {[5, 10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} MB</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Files Allowed</label>
          <input type="number" min={1} max={10} value={q.maxFiles ?? 1} onChange={(e) => onUpdate({ maxFiles: +e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        </div>
      </div>
    </div>
  );
}

// Code Question ───────────────────────────────────────────────────────────────

const LANGUAGES = ['python', 'javascript', 'java', 'c', 'cpp', 'csharp', 'php', 'ruby', 'go', 'sql', 'bash'];

function CodeBody({ q, onUpdate }: { q: Question; onUpdate: (p: Partial<Question>) => void }) {
  const tests = q.codeTestCases ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Programming Language</label>
          <select value={q.codeLanguage ?? 'python'} onChange={(e) => onUpdate({ codeLanguage: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none">
            {LANGUAGES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Starter Code Template</label>
        <textarea
          value={q.codeTemplate ?? ''}
          onChange={(e) => onUpdate({ codeTemplate: e.target.value })}
          rows={5}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-900 text-green-400"
          placeholder="# Write starter code here..."
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Test Cases</label>
          <button onClick={() => onUpdate({ codeTestCases: [...tests, { id: mkId(), input: '', expected: '' }] })} className="flex items-center gap-1 text-xs text-indigo-600"><Plus className="w-3.5 h-3.5" /> Add test case</button>
        </div>
        {tests.map((tc, i) => (
          <div key={tc.id} className="flex gap-2 items-start mb-2">
            <span className="text-xs text-gray-400 mt-2.5 w-12">Test {i + 1}</span>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input type="text" value={tc.input} onChange={(e) => onUpdate({ codeTestCases: tests.map((t) => t.id === tc.id ? { ...t, input: e.target.value } : t) })} placeholder="Input" className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none" />
              <input type="text" value={tc.expected} onChange={(e) => onUpdate({ codeTestCases: tests.map((t) => t.id === tc.id ? { ...t, expected: e.target.value } : t) })} placeholder="Expected output" className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none" />
            </div>
            <button onClick={() => onUpdate({ codeTestCases: tests.filter((t) => t.id !== tc.id) })} className="mt-2 p-1.5 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Solution Code (reference)</label>
        <textarea value={q.codeSolution ?? ''} onChange={(e) => onUpdate({ codeSolution: e.target.value })} rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none bg-gray-900 text-green-400" placeholder="# Reference solution (not shown to students)..." />
      </div>
    </div>
  );
}

// Audio Response ──────────────────────────────────────────────────────────────

function AudioBody({ q, onUpdate, lang }: { q: Question; onUpdate: (p: Partial<Question>) => void; lang: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
          <Mic className="w-5 h-5 text-violet-600" />
        </div>
        <p className="text-sm text-violet-700">Students will record an audio response using their microphone.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Recording Duration (seconds)</label>
        <input type="number" min={10} max={600} value={q.maxRecordSeconds ?? 120} onChange={(e) => onUpdate({ maxRecordSeconds: +e.target.value })} className="w-40 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        <p className="text-xs text-gray-400 mt-1">{Math.floor((q.maxRecordSeconds ?? 120) / 60)} min {(q.maxRecordSeconds ?? 120) % 60} sec allowed</p>
      </div>
      <VoiceInputField label="Sample Answer (text reference for grader)" value={q.sampleAnswer ?? ''} onChange={(v) => onUpdate({ sampleAnswer: v })} lang={lang} multiline rows={2} placeholder="Describe what a good answer should include…" />
    </div>
  );
}

// Video Response ──────────────────────────────────────────────────────────────

function VideoBody({ q, onUpdate }: { q: Question; onUpdate: (p: Partial<Question>) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
          <Video className="w-5 h-5 text-rose-600" />
        </div>
        <p className="text-sm text-rose-700">Students will record a video response using their camera.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Recording Duration (seconds)</label>
        <input type="number" min={10} max={600} value={q.maxRecordSeconds ?? 300} onChange={(e) => onUpdate({ maxRecordSeconds: +e.target.value })} className="w-40 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size</label>
        <select className="w-40 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none">
          <option>50 MB</option>
          <option>100 MB</option>
          <option>200 MB</option>
          <option>500 MB</option>
        </select>
      </div>
    </div>
  );
}
