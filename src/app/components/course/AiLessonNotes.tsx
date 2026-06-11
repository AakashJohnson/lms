import { useEffect, useMemo, useState } from 'react';
import { createLessonNote } from '../../services/lessonNoteService';
import { regenerateVideoSummary } from '../../services/aiLessonNoteService';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import {
  BookOpen,
  Sparkles,
  Loader2,
  Download,
  Star,
  ClipboardList,
  AlertCircle,
  Clock,
  HelpCircle,
  FileText,
  Layers,
  Search,
  Bot,
  CheckCircle2,
  XCircle,
  Plus
} from 'lucide-react';
import {
  AiLessonNote,
  AiLessonNoteMode,
  AiLessonNoteSectionType,
  CourseVideoSummary,
  bookmarkAiLessonNotes,
  generateVideoSummary,
  getVideoSummary,
  saveAiLessonNotesForRevision,
} from '../../services/aiLessonNoteService';

function isMeaningfulHtml(html?: string): boolean {
  if (!html) return false;
  const cleaned = String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return cleaned.length > 0;
}

export interface AiLessonNotesProps {
  courseId: string;
  sectionId: string;
  lessonId: string;
  onJumpToTimestamp?: (seconds: number) => void;
}

type VideoSummaryTab = 'summary' | 'notes' | 'keyPoints' | 'flashcards' | 'quiz' | 'transcript';

const SECTION_TYPES: Array<{ type: AiLessonNoteSectionType; label: string }> = [
  { type: 'summary', label: 'Summary' },
  { type: 'keyTakeaways', label: 'Key Takeaways' },
  { type: 'mindMap', label: 'Mind Map' },
  { type: 'interviewQuestions', label: 'Interview Questions' },
  { type: 'examples', label: 'Examples' },
  { type: 'revisionMaterial', label: 'Revision Material' },
];

const sectionLabel = (t: AiLessonNoteSectionType) => SECTION_TYPES.find((s) => s.type === t)?.label || t;

const mindMapToMarkdown = (mindMap: AiLessonNote['generated']['mindMap']) => {
  if (!mindMap) return '';
  const lines: string[] = [`# ${mindMap.root}`];
  for (const b of mindMap.branches || []) {
    lines.push(`\n## ${b.label}`);
    for (const item of b.items || []) {
      lines.push(`- ${item}`);
    }
  }
  return lines.join('\n');
};

const buildDownloadMarkdown = (note: AiLessonNote) => {
  const parts: string[] = [];
  parts.push(`# AI Notes (mode: ${note.mode})`);
  parts.push(`Generated: ${new Date(note.createdAt).toLocaleString('en-IN')}`);
  parts.push('');

  parts.push(note.mode === 'detailed' ? '## Detailed Summary' : '## Summary');
  parts.push(note.mode === 'detailed'
    ? note.generated.detailedSummary || note.generated.revisionMaterial || note.generated.summary || ''
    : note.generated.summary || '');
  parts.push('');

  parts.push('## Key Takeaways');
  if (note.generated.keyTakeaways?.length) {
    parts.push(...note.generated.keyTakeaways.map((k) => `- ${k}`));
  }
  parts.push('');

  parts.push(mindMapToMarkdown(note.generated.mindMap || { root: 'Lesson', branches: [] }));
  parts.push('');

  parts.push('## Interview Questions');
  if (note.generated.interviewQuestions?.length) {
    for (const q of note.generated.interviewQuestions) {
      parts.push(`### ${q.question}`);
      parts.push(q.answer || '');
      parts.push('');
    }
  }

  parts.push('## Examples');
  if (note.generated.examples?.length) {
    parts.push(...note.generated.examples.map((e) => `- ${e}`));
  }
  parts.push('');

  parts.push('## Revision Material');
  parts.push(note.generated.revisionMaterial || '');

  if (note.generated.timestamps?.length) {
    parts.push('');
    parts.push('## Timestamp Summary');
    parts.push(...note.generated.timestamps.map((item) => `- ${formatTimestamp(item.start)} ${item.label}: ${item.summary}`));
  }

  if (note.source?.transcript) {
    parts.push('');
    parts.push('## Transcript');
    parts.push(note.source.transcript);
  }

  return parts.join('\n');
};

const formatTimestamp = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
};

const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const isMissingLectureSourceNote = (note: AiLessonNote | null) => {
  const summary = note?.generated?.summary?.toLowerCase() || '';
  return Boolean(
    note?.source?.inputType === 'missing-lecture-source'
      || summary.includes('no lesson text was available')
      || summary.includes('no lecture transcript')
      || summary.includes('no transcript or meaningful lecture text')
      || summary.includes('could not generate a real video lecture summary'),
  );
};

const videoSummaryToNote = (
  videoSummary: CourseVideoSummary | null,
  courseId: string,
  sectionId: string,
  lessonId: string,
  mode: AiLessonNoteMode,
): AiLessonNote | null => {
  if (!videoSummary || videoSummary.status !== 'completed' || !videoSummary.generated?.summary) {
    return null;
  }

  const generated = videoSummary.generated;
  const selectedSummary = videoSummary.summary || (
    mode === 'detailed'
      ? generated.detailedSummary || generated.summary || ''
      : generated.summary || ''
  );
  const importantConceptBranches = generated.importantConcepts?.length
    ? [{ label: 'Important Concepts', items: generated.importantConcepts }]
    : [];

  return {
    _id: 'course-video-summary',
    student: '',
    course: courseId,
    section: sectionId,
    lesson: lessonId,
    mode,
    source: {
      inputType: 'video-asr',
      transcript: videoSummary.transcript || '',
      transcriptLanguage: videoSummary.transcriptLanguage || 'en',
      transcriptGeneratedAt: videoSummary.completedAt || videoSummary.updatedAt,
    },
    generated: {
      summary: mode === 'short' ? selectedSummary : generated.summary || '',
      detailedSummary: mode === 'detailed' ? selectedSummary : generated.detailedSummary || '',
      keyTakeaways: generated.keyTakeaways || [],
      timestamps: generated.timestamps || generated.topicWisePoints || [],
      transcriptSegments: generated.transcriptSegments || [],
      flashcards: generated.flashcards || [],
      quizQuestions: generated.quizQuestions || [],
      mindMap: {
        root: 'Lecture Video',
        branches: importantConceptBranches,
      },
      interviewQuestions: [],
      examples: [],
      revisionMaterial: generated.revisionNotes || generated.detailedSummary || '',
    },
    isSavedForRevision: false,
    bookmarks: [],
    createdAt: videoSummary.completedAt || videoSummary.updatedAt || new Date().toISOString(),
  };
};

const getPrimarySummary = (note: AiLessonNote | null) => {
  if (!note) return '';
  if (note.mode === 'detailed') {
    return note.generated.detailedSummary || note.generated.revisionMaterial || note.generated.summary || '';
  }
  return note.generated.summary || '';
};

const getSummaryHeading = (mode: AiLessonNoteMode) => (
  mode === 'detailed' ? 'Detailed Summary with Global Context' : 'Short Summary'
);

export function AiLessonNotes({ courseId, sectionId, lessonId, onJumpToTimestamp, onNoteAdded }: AiLessonNotesProps) {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const role = storedUser.role || 'student';
  const isStudent = role === 'student' || role === 'participant';
  const isTeacherOrAdmin = ['trainer', 'administrator', 'admin'].includes(role);

  const [mode, setMode] = useState<AiLessonNoteMode>('short');
  const [viewMode, setViewMode] = useState<'saved' | 'preview'>('saved');
  const [previewSummary, setPreviewSummary] = useState<any>(null);
  const [isSavingToNotes, setIsSavingToNotes] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [aiNote, setAiNote] = useState<AiLessonNote | null>(null);
  const [videoSummary, setVideoSummary] = useState<CourseVideoSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [activeVideoTab, setActiveVideoTab] = useState<VideoSummaryTab>('summary');
  const [transcriptSearch, setTranscriptSearch] = useState('');

  const savedDisplayNote = useMemo(
    () => videoSummaryToNote(videoSummary, courseId, sectionId, lessonId, mode),
    [courseId, lessonId, mode, sectionId, videoSummary],
  );

  const displayPreviewNote = useMemo(() => {
    if (!previewSummary) return null;
    const importantConceptBranches = previewSummary.importantConcepts?.length
      ? [{ label: 'Important Concepts', items: previewSummary.importantConcepts }]
      : [];
    return {
      _id: 'course-video-summary-preview',
      student: '',
      course: courseId,
      section: sectionId,
      lesson: lessonId,
      mode,
      source: {
        inputType: 'video-asr',
        transcript: videoSummary?.transcript || '',
        transcriptLanguage: videoSummary?.transcriptLanguage || 'en',
        transcriptGeneratedAt: new Date().toISOString(),
      },
      generated: {
        summary: previewSummary.summary || '',
        detailedSummary: previewSummary.notes || previewSummary.summary || '',
        keyTakeaways: previewSummary.keyPoints || [],
        timestamps: previewSummary.topicWisePoints || [],
        transcriptSegments: videoSummary?.generated?.transcriptSegments || [],
        flashcards: previewSummary.flashcards || [],
        quizQuestions: previewSummary.quizQuestions || [],
        mindMap: {
          root: 'Lecture Video Preview',
          branches: importantConceptBranches,
        },
        interviewQuestions: [],
        examples: [],
        revisionMaterial: previewSummary.revisionNotes || '',
      },
      isSavedForRevision: false,
      bookmarks: [],
      createdAt: previewSummary.generatedAt || new Date().toISOString(),
    } as any;
  }, [courseId, lessonId, mode, sectionId, previewSummary, videoSummary]);

  const displayNote = viewMode === 'preview' && displayPreviewNote ? displayPreviewNote : savedDisplayNote;
  const currentDisplayNote = displayNote;

  const isCourseVideoSummary = currentDisplayNote?._id === 'course-video-summary' || currentDisplayNote?._id === 'course-video-summary-preview';
  const processingStatuses: CourseVideoSummary['status'][] = [
    'pending',
    'queued',
    'extracting_audio',
    'transcribing',
    'generating_transcript',
    'transcript_completed',
    'analyzing_lecture',
    'analyzing_transcript',
    'transcript_analysis_completed',
    'creating_summary',
    'generating_summary',
  ];
  const rawProgress = Number(videoSummary?.progress ?? videoSummary?.aiProcessingProgress ?? 0);
  const displayProgress = videoSummary?.status === 'queued' && rawProgress === 0 ? 5 : rawProgress;
  const isVideoSummaryProcessing = Boolean(videoSummary?.status && processingStatuses.includes(videoSummary.status));
  const videoSummaryStage = videoSummary?.message || videoSummary?.stage || (
    videoSummary?.status === 'queued' ? 'Queued for processing' :
    videoSummary?.status === 'transcribing' ? 'Generating transcript' :
    videoSummary?.status === 'extracting_audio' ? 'Extracting audio' :
    videoSummary?.status === 'generating_transcript' ? 'Generating transcript' :
    videoSummary?.status === 'transcript_completed' ? 'Transcript generated successfully' :
    videoSummary?.status === 'analyzing_lecture' || videoSummary?.status === 'analyzing_transcript' ? 'Analyzing transcript' :
    videoSummary?.status === 'transcript_analysis_completed' ? 'Transcript analysis completed' :
    videoSummary?.status === 'creating_summary' || videoSummary?.status === 'generating_summary' ? 'Creating summary' :
    ''
  );
  const canRegenerateSummary = true;

  const bookmarkedSectionTypes = useMemo(() => {
    if (!aiNote?.bookmarks?.length) return new Set<AiLessonNoteSectionType>();
    return new Set(aiNote.bookmarks.map((b) => b.sectionType));
  }, [aiNote]);

  const isBookmarked = (t: AiLessonNoteSectionType) => bookmarkedSectionTypes.has(t);
  const isMissingLectureSource = isMissingLectureSourceNote(displayNote);
  const loadingLabel = loading ? `Queueing ${mode} summary...` : `Generate ${mode === 'detailed' ? 'Detailed' : 'Short'} Summary`;
  const transcriptSegments = displayNote?.generated?.transcriptSegments || [];
  const visibleTranscriptSegments = transcriptSearch.trim()
    ? transcriptSegments.filter((segment) => `${segment.label} ${segment.summary}`.toLowerCase().includes(transcriptSearch.toLowerCase()))
    : transcriptSegments;
  const primarySummary = getPrimarySummary(displayNote);
  const videoTabs: Array<{ id: VideoSummaryTab; label: string; icon: any }> = [
    { id: 'summary', label: 'Summary', icon: Clock },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'keyPoints', label: 'Key Points', icon: Layers },
    { id: 'flashcards', label: 'Flashcards', icon: Star },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
    { id: 'transcript', label: 'Transcript', icon: Search },
  ];

  const loadLatest = async () => {
    setLoadingLatest(true);
    try {
      const videoSummaryRes = await getVideoSummary(courseId, sectionId, lessonId, mode);
      if (videoSummaryRes.success) setVideoSummary(videoSummaryRes.data || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load AI video summary');
    } finally {
      setLoadingLatest(false);
    }
  };

  const refreshVideoSummary = async () => {
    try {
      const res = await getVideoSummary(courseId, sectionId, lessonId, mode);
      if (res.success) setVideoSummary(res.data || null);
    } catch {
      // Polling should be quiet; explicit actions still show toast errors.
    }
  };

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sectionId, lessonId]);

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!isVideoSummaryProcessing) return undefined;
    const timer = window.setInterval(refreshVideoSummary, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sectionId, lessonId, mode, isVideoSummaryProcessing]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (isStudent) {
        toast.loading('Generating temporary AI summary preview...', { id: 'ai-preview' });
        const res = await regenerateVideoSummary({
          courseId,
          sectionId,
          lessonId,
          summaryType: mode,
          forceRegenerate: true,
          persist: false,
          previewOnly: true,
        });
        toast.dismiss('ai-preview');
        if (res.success && res.previewSummary) {
          setPreviewSummary(res.previewSummary);
          setViewMode('preview');
          toast.success('AI summary preview generated! You can now save it to your notes.');
        } else {
          toast.error(res.message || 'Failed to generate preview summary');
        }
      } else {
        setVideoSummary((current) => ({
          ...(current || { status: 'queued' as CourseVideoSummary['status'] }),
          status: 'queued',
          progress: 5,
          message: 'Starting backend AI summary job...',
          summaryType: mode,
        }));
        const res = await generateVideoSummary({
          courseId,
          sectionId,
          lessonId,
          summaryType: mode,
          forceRegenerate: true,
          persist: true,
          previewOnly: false,
        });
        if (res.success) {
          setVideoSummary({
            ...(res.data || {}),
            progress: Math.max(Number(res.data?.progress || 0), 5),
            message: res.data?.message || 'Starting backend AI summary job...',
          });
          window.setTimeout(refreshVideoSummary, 1200);
          toast.success(`${mode === 'detailed' ? 'Detailed' : 'Short'} summary job started`);
        }
      }
    } catch (e: any) {
      toast.dismiss('ai-preview');
      toast.error(e?.response?.data?.message || e?.message || 'Failed to start automatic video summary');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    if (isTeacherOrAdmin && videoSummary?.status === 'completed') {
      setShowConfirmModal(true);
    } else {
      handleGenerate();
    }
  };

  const handleSaveToMyNotes = async () => {
    if (!previewSummary) return;
    setIsSavingToNotes(true);
    try {
      const contentToSave = `AI Regenerated Preview Summary (${mode}):\n\n${previewSummary.summary}\n\nNotes:\n${previewSummary.notes}`;
      await createLessonNote({
        course: courseId,
        section: sectionId,
        lesson: lessonId,
        content: contentToSave,
        tags: ['AI Preview', mode],
      });
      toast.success('Regenerated summary saved to your personal notes!');
      onNoteAdded?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save to personal notes');
    } finally {
      setIsSavingToNotes(false);
    }
  };

  const handleBookmark = async (sectionType: AiLessonNoteSectionType) => {
    if (!aiNote || isCourseVideoSummary) return;
    try {
      const res = await bookmarkAiLessonNotes({ aiNoteId: aiNote._id, sectionType });
      if (res.success) setAiNote(res.data);
      toast.success(isBookmarked(sectionType) ? 'Bookmark removed' : 'Bookmarked');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to bookmark');
    }
  };

  const handleToggleSave = async () => {
    if (!aiNote || isCourseVideoSummary) return;
    try {
      const res = await saveAiLessonNotesForRevision({ aiNoteId: aiNote._id, savedForRevision: !aiNote.isSavedForRevision });
      if (res.success) setAiNote(res.data);
      toast.success(aiNote.isSavedForRevision ? 'Removed from revision' : 'Saved for revision');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save for revision');
    }
  };

  const handleDownload = () => {
    if (!displayNote || isMissingLectureSource) return;
    const md = buildDownloadMarkdown(displayNote);
    downloadText(`ai-video-summary-${displayNote.lesson}-${displayNote.mode}.md`, md);
  };

  const stepState = (step: 'transcript' | 'analysis' | 'summary') => {
    const progress = displayProgress;
    if (videoSummary?.status === 'failed') return progress >= (step === 'summary' ? 90 : step === 'analysis' ? 60 : 20) ? 'failed' : 'pending';
    if (step === 'transcript') return progress >= 40 ? 'done' : progress >= 20 ? 'active' : 'pending';
    if (step === 'analysis') return progress >= 75 ? 'done' : progress >= 60 ? 'active' : 'pending';
    return progress >= 100 ? 'done' : progress >= 90 ? 'active' : 'pending';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2bd196] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Video Summary</h3>
              <p className="text-xs text-gray-500">Transcript, summaries, timestamps, flashcards, quiz & revision material</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!displayNote || isMissingLectureSource}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
              title="Download notes as Markdown"
            >
              <Download className="w-4 h-4" /> Download Summary
            </button>
            {!isCourseVideoSummary && (
              <button
                onClick={handleToggleSave}
                disabled={!aiNote || isMissingLectureSource}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${aiNote?.isSavedForRevision ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-50`}
                title="Save for revision later"
              >
                {aiNote?.isSavedForRevision ? 'Saved for Revision' : 'Save for Revision'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-700" />
            <span className="text-sm font-semibold text-gray-900">Generation style</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 border border-indigo-100 rounded-xl p-1">
            <button
              onClick={() => setMode('short')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'short' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Short
            </button>
            <button
              onClick={() => setMode('detailed')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'detailed' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Detailed
            </button>
          </div>
          {canRegenerateSummary && (
          <button
            onClick={handleGenerateClick}
            disabled={loading || isVideoSummaryProcessing}
            className="ml-auto flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || isVideoSummaryProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isVideoSummaryProcessing ? videoSummaryStage : loadingLabel}
          </button>
          )}
        </div>
        {(loading || isVideoSummaryProcessing) && (
          <p className="mt-2 text-xs text-indigo-700">
            {videoSummaryStage || 'Processing lecture video'}... long videos run in the background and this panel updates automatically.
          </p>
        )}
        {displayNote && (
          <p className="text-xs text-gray-600 mt-2">
            Latest generation: <span className="font-medium">{new Date(displayNote.createdAt).toLocaleString('en-IN')}</span> - Mode:{' '}
            <span className="font-medium">{displayNote.mode}</span>
          </p>
        )}
        {videoSummary?.status === 'failed' && (
          <div className="mt-3 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Automatic video summary failed</p>
              <p className="mt-1">
                {videoSummary.error || 'The system could not extract enough spoken lecture content from this video.'}
              </p>
              <button
                onClick={() => handleGenerate()}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Retry {mode === 'detailed' ? 'Detailed' : 'Short'} Summary
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {loadingLatest ? (
          <div className="py-10 text-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p>Loading AI video summary...</p>
          </div>
        ) : isVideoSummaryProcessing ? (
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-cyan-50 p-6 text-indigo-950">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white p-3 text-indigo-600 shadow-sm">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-base font-bold">{videoSummaryStage || 'Processing lecture video'}</h4>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm">
                    {displayProgress}%
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-indigo-800">
                  The LMS is using the existing transcript system first, then cleaning the transcript and creating the selected English {mode} summary.
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 transition-all duration-300"
                    style={{ width: `${Math.max(8, displayProgress)}%` }}
                  />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    { id: 'transcript' as const, title: 'Transcript generation', text: 'Existing video transcription AI' },
                    { id: 'analysis' as const, title: 'Transcript analysis', text: 'Clean English educational transcript' },
                    { id: 'summary' as const, title: 'Summary generation', text: `${mode === 'detailed' ? 'Detailed' : 'Short'} student summary` },
                  ].map((step) => {
                    const state = stepState(step.id);
                    return (
                      <div key={step.id} className={`rounded-xl border bg-white p-3 shadow-sm ${
                        state === 'active' ? 'border-indigo-300' : state === 'done' ? 'border-emerald-200' : 'border-indigo-100'
                      }`}>
                        <div className="mb-2 flex items-center gap-2">
                          {state === 'done' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : state === 'failed' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : state === 'active' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-slate-300" />
                          )}
                          <span className="text-xs font-bold text-slate-900">{step.title}</span>
                        </div>
                        <p className="text-xs leading-5 text-slate-600">{step.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : !displayNote ? (
          <div className="py-10 text-center text-gray-500">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">No video summary yet</p>
            <p className="text-xs text-gray-500 mb-4">Once the lecture video is uploaded, the backend generates the transcript and summary automatically.</p>
            {canRegenerateSummary && (
              <button
                onClick={() => handleGenerate()}
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                Generate {mode === 'detailed' ? 'Detailed' : 'Short'} Summary
              </button>
            )}
          </div>
        ) : isMissingLectureSource ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Cannot summarize this video yet</h4>
                <p className="mt-2 text-sm leading-6">
                  {displayNote?.generated.summary || videoSummary?.error || 'The automatic transcript is not ready yet.'}
                </p>
                {canRegenerateSummary && (
                  <button
                    onClick={() => handleGenerate()}
                    disabled={loading || isVideoSummaryProcessing}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Regenerate Automatically
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isMeaningfulHtml(videoSummary?.teacherSummary || videoSummary?.uploadedSummary) && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 shadow-sm">
                <div className="mb-2">
                  <h4 className="text-sm font-bold text-slate-900">Uploaded Summary</h4>
                  <p className="text-xs text-slate-500">Summary uploaded by teacher for this lesson</p>
                </div>
                <div 
                  className="prose prose-sm max-w-none text-sm leading-6 text-slate-700"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(videoSummary?.teacherSummary || videoSummary?.uploadedSummary || '') }}
                />
              </div>
            )}

            {previewSummary && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-amber-805 text-sm">
                  <Sparkles className="w-5 h-5 text-amber-600 animate-pulse flex-shrink-0" />
                  <div>
                    <span className="font-bold">Regenerated Preview Mode:</span> This is a temporary preview and won't overwrite the course's official summary. You can save it to your personal notes.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'preview' ? 'saved' : 'preview')}
                    className="px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 bg-white hover:bg-amber-50 transition-colors"
                  >
                    {viewMode === 'preview' ? 'View Official Summary' : 'View Preview Summary'}
                  </button>
                  {viewMode === 'preview' && (
                    <button
                      onClick={handleSaveToMyNotes}
                      disabled={isSavingToNotes}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {isSavingToNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Save to My Notes
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-2">
              {videoTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveVideoTab(tab.id)}
                    className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      activeVideoTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeVideoTab === 'summary' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-gray-900">{getSummaryHeading(mode)}</h4>
                    {!isCourseVideoSummary && (
                      <button
                        onClick={() => handleBookmark('summary')}
                        className={`rounded-lg p-2 ${isBookmarked('summary') ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        title="Bookmark summary"
                      >
                        <Star className={`h-4 w-4 ${isBookmarked('summary') ? 'fill-yellow-500 text-yellow-600' : ''}`} />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{primarySummary}</p>
                </div>

                {(displayNote.generated.timestamps || []).length > 0 && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <h4 className="mb-3 text-sm font-bold text-indigo-950">Timestamp Summary</h4>
                    <div className="space-y-2">
                      {(displayNote.generated.timestamps || []).map((item, idx) => (
                        <button
                          key={`${item.start}-${idx}`}
                          onClick={() => onJumpToTimestamp?.(item.start)}
                          className="w-full rounded-xl border border-indigo-100 bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-sm"
                        >
                          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-indigo-700">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTimestamp(item.start)}
                            <span className="text-gray-400">to {formatTimestamp(item.end)}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="mt-1 text-sm leading-6 text-gray-600">{item.summary}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeVideoTab === 'notes' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h4 className="mb-2 text-sm font-bold text-gray-900">Lecture Notes</h4>
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{displayNote.generated.detailedSummary || displayNote.generated.revisionMaterial}</pre>
                </div>
                {displayNote.generated.revisionMaterial && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <h4 className="mb-2 text-sm font-bold text-emerald-950">Revision Notes</h4>
                    <pre className="whitespace-pre-wrap text-sm leading-7 text-emerald-900">{displayNote.generated.revisionMaterial}</pre>
                  </div>
                )}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-bold text-gray-900">Mind Map</h4>
                  <div className="space-y-3">
                    {(displayNote.generated.mindMap?.branches || []).map((branch, idx) => (
                      <div key={idx} className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                        <p className="mb-2 text-sm font-semibold text-indigo-950">{branch.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {(branch.items || []).map((item, itemIdx) => (
                            <span key={itemIdx} className="rounded-lg border border-indigo-100 bg-white px-2 py-1 text-xs font-medium text-indigo-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeVideoTab === 'keyPoints' && (
              <div className="grid gap-3 md:grid-cols-2">
                {((displayNote.generated.keyTakeaways || []).length ? displayNote.generated.keyTakeaways : ['Key points are being prepared from the lecture transcript.']).map((point, idx) => (
                  <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">Point {idx + 1}</p>
                    <p className="text-sm leading-6 text-gray-700">{point}</p>
                  </div>
                ))}
              </div>
            )}

            {activeVideoTab === 'flashcards' && (
              <div className="grid gap-3 md:grid-cols-2">
                {(displayNote.generated.flashcards || []).length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                    Flashcards are generated after the transcript is processed. Regenerate the video summary if this stays empty.
                  </div>
                )}
                {(displayNote.generated.flashcards || []).map((card, idx) => (
                  <details key={idx} className="rounded-xl border border-gray-200 bg-white p-4">
                    <summary className="cursor-pointer list-none text-sm font-bold text-gray-900">{card.question}</summary>
                    <p className="mt-3 text-sm leading-6 text-gray-700">{card.answer}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">{card.difficulty}</span>
                      {(card.tags || []).map((tag) => (
                        <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{tag}</span>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}

            {activeVideoTab === 'quiz' && (
              <div className="space-y-3">
                {(displayNote.generated.quizQuestions || []).length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                    Quiz questions are generated from the lecture transcript. Regenerate the summary if this stays empty.
                  </div>
                )}
                {(displayNote.generated.quizQuestions || []).map((question, idx) => (
                  <details key={idx} className="rounded-xl border border-gray-200 bg-white p-4">
                    <summary className="cursor-pointer list-none text-sm font-bold text-gray-900">
                      Q{idx + 1}. {question.question}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {(question.options || []).map((option, optionIdx) => (
                        <div key={optionIdx} className={`rounded-lg border px-3 py-2 text-sm ${option === question.answer ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                          {option}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{question.explanation}</p>
                  </details>
                ))}
              </div>
            )}

            {activeVideoTab === 'transcript' && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={transcriptSearch}
                    onChange={(event) => setTranscriptSearch(event.target.value)}
                    placeholder="Search transcript..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {visibleTranscriptSegments.map((segment, idx) => (
                    <button
                      key={`${segment.start}-${idx}`}
                      onClick={() => onJumpToTimestamp?.(segment.start)}
                      className="w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50"
                    >
                      <span className="text-xs font-bold text-indigo-700">{formatTimestamp(segment.start)}</span>
                      <p className="mt-1 text-sm leading-6 text-gray-700">{segment.summary}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Teacher overwrite confirmation modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all scale-100 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Overwrite Official Summary?</h3>
            </div>
            <p className="text-sm text-gray-650 leading-relaxed">
              This will overwrite the official saved summary for this lesson across the entire system. Students will see the new summary by default.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleGenerate();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
              >
                Overwrite Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





