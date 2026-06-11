import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Languages, Loader2, CheckCircle2, Maximize2, X } from 'lucide-react';
import { voiceInputService, SUPPORTED_LANGUAGES } from '../../services/voiceInputService';

declare global {
  interface Window {
    SUNEDITOR: {
      create: (el: HTMLTextAreaElement | string, options?: Record<string, unknown>) => SunEditorInstance;
    };
  }
}

interface SunEditorInstance {
  setContents: (html: string) => void;
  getContents: (onlyContents?: boolean) => string;
  destroy: () => void;
  onChange: ((contents: string) => void) | null;
  setReadOnly: (flag: boolean) => void;
  onImageUploadBefore?: ((files: File[], info: unknown, core: unknown, uploadHandler: (arg?: unknown) => void) => boolean | File[] | undefined) | null;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

const toAbsoluteUrl = (url: string) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${BACKEND_ORIGIN}${value}`;
  return value;
};

let _seLoaded = false;
let _seCallbacks: Array<() => void> = [];

function ensureSunEditor(): Promise<void> {
  if (_seLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    _seCallbacks.push(resolve);
    if (_seCallbacks.length > 1) return;

    if (!document.getElementById('se-css')) {
      const link = document.createElement('link');
      link.id = 'se-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/suneditor@2.47.5/dist/css/suneditor.min.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/suneditor@2.47.5/dist/suneditor.min.js';
    script.onload = () => {
      _seLoaded = true;
      _seCallbacks.forEach((cb) => cb());
      _seCallbacks = [];
    };
    script.onerror = () => {
      _seCallbacks.forEach((cb) => cb());
      _seCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

const TOOLBAR: string[][] = [
  ['undo', 'redo'],
  ['font', 'fontSize', 'formatBlock'],
  ['bold', 'underline', 'italic', 'strike'],
  ['fontColor', 'hiliteColor'],
  ['removeFormat'],
  ['align', 'horizontalRule', 'list'],
  ['table', 'link', 'image'],
  ['codeView'],
];

interface RichTextEditorCoreProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  height?: number;
  label?: string;
  required?: boolean;
  lang?: string;
  onLangChange?: (l: string) => void;
  showVoice?: boolean;
  showTranslate?: boolean;
  translateTargetLang?: string;
  showExpandButton?: boolean;
  onExpandClick?: () => void;
  editorClassName?: string;
  mode?: 'default' | 'expanded';
}

let _uidCounter = 0;

function RichTextEditorCore({
  value = '',
  onChange,
  placeholder,
  height = 280,
  label,
  required,
  lang = 'en',
  onLangChange,
  showVoice = true,
  showTranslate = true,
  translateTargetLang = 'en',
  showExpandButton = false,
  onExpandClick,
  editorClassName = '',
  mode = 'default',
}: RichTextEditorCoreProps) {
  const uid = useRef(`se-${++_uidCounter}`);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<SunEditorInstance | null>(null);
  const lastEmittedValueRef = useRef(value);
  const isFocusedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  // Translate state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateDone, setTranslateDone] = useState(false);

  useEffect(() => {
    let destroyed = false;
    ensureSunEditor().then(() => {
      if (destroyed || !taRef.current) return;
      if (!window.SUNEDITOR) {
        setLoadFailed(true);
        return;
      }
      try {
        const isExpanded = mode === 'expanded';

        // Strict DOM Safeguard: Clean up any pre-existing editor elements inside the container first
        const container = taRef.current.parentElement;
        if (container) {
          const existing = container.querySelectorAll('.sun-editor');
          existing.forEach((el) => el.remove());
        }

        const editor = window.SUNEDITOR.create(taRef.current, {
          buttonList: TOOLBAR,
          height: isExpanded ? '100%' : String(height),
          placeholder: placeholder || '',
          defaultStyle: 'font-family: inherit; font-size: 14px; line-height: 1.6; background-color: #ffffff; color: #0f172a;',
          resizingBar: false,
        });

        editor.setContents(value);
        lastEmittedValueRef.current = value;
        editor.onChange = (html: string) => {
          lastEmittedValueRef.current = html;
          onChange?.(html);
        };
        editor.onImageUploadBefore = (files, _info, _core, uploadHandler) => {
          if (!files?.length) return true;

          (async () => {
            try {
              const token = localStorage.getItem('token');
              const uploaded = [];
              for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch(`${API_BASE}/upload`, {
                  method: 'POST',
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                  body: formData,
                });
                if (!res.ok) throw new Error('Upload failed');
                const data = await res.json();
                uploaded.push({
                  url: toAbsoluteUrl(data.data.url),
                  name: file.name,
                  size: file.size,
                });
              }
              uploadHandler({
                result: uploaded.map((u) => ({
                  url: u.url,
                  name: u.name,
                  size: u.size,
                })),
              });
            } catch {
              uploadHandler('Failed to upload image');
            }
          })();

          return false;
        };

        editorRef.current = editor;
        setLoaded(true);
      } catch {
        setLoadFailed(true);
      }
    });

    return () => {
      destroyed = true;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [mode, height, placeholder]);

  // Handle external value changes only if editor contents mismatch
  useEffect(() => {
    if (editorRef.current && loaded) {
      if (value === lastEmittedValueRef.current) return;
      if (isFocusedRef.current) return;
      const current = editorRef.current.getContents(true);
      if (current !== value) {
        editorRef.current.setContents(value);
        lastEmittedValueRef.current = value;
      }
    }
  }, [value, loaded]);

  const handleVoice = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      setVoiceError('');
      try {
        const text = await voiceInputService.stopRecording();
        if (text && editorRef.current) {
          const currentHtml = editorRef.current.getContents(true) || '';
          const appended = currentHtml
            ? `${currentHtml.replace(/<\/p>$/i, '')} ${text}</p>`
            : `<p>${text}</p>`;
          editorRef.current.setContents(appended);
          lastEmittedValueRef.current = appended;
          onChange?.(appended);
        }
      } catch (err: unknown) {
        setVoiceError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsProcessing(false);
      }
    } else {
      setVoiceError('');
      try {
        await voiceInputService.startRecording(lang);
        setIsRecording(true);
      } catch (err: unknown) {
        setVoiceError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleTranslate = async () => {
    if (!editorRef.current) return;
    const html = editorRef.current.getContents(true);
    if (!html.trim()) return;
    const plainText = html.replace(/<[^>]+>/g, ' ').trim();
    setIsTranslating(true);
    try {
      const translated = await voiceInputService.translate(plainText, lang, translateTargetLang);
      const newHtml = `<p>${translated}</p>`;
      editorRef.current.setContents(newHtml);
      lastEmittedValueRef.current = newHtml;
      onChange?.(newHtml);
      setTranslateDone(true);
      setTimeout(() => setTranslateDone(false), 2000);
    } catch {
      // silent fail
    } finally {
      setIsTranslating(false);
    }
  };

  const isExpanded = mode === 'expanded';

  return (
    <div className={isExpanded ? "h-full flex flex-col min-h-0 overflow-hidden" : ""}>
      {/* Label + toolbar extras */}
      {(label || showVoice || showTranslate) && (
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          {label && (
            <label className="block text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {/* Language selector */}
            {onLangChange && (
              <select
                value={lang}
                onChange={(e) => onLangChange(e.target.value)}
                title="Content language"
                aria-label="Content language"
                className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            )}

            {/* Translate button */}
            {showTranslate && lang !== translateTargetLang && (
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
                title={`Translate to ${translateTargetLang.toUpperCase()}`}
              >
                {isTranslating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : translateDone ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <Languages className="w-3 h-3" />
                )}
                {translateDone ? 'Done!' : 'BujjiChuti Translate'}
              </button>
            )}

            {/* Voice input */}
            {showVoice && (
              <button
                type="button"
                onClick={handleVoice}
                disabled={isProcessing}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : isProcessing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-3 h-3" />
                ) : (
                  <Mic className="w-3 h-3" />
                )}
                {isRecording ? 'Stop' : isProcessing ? 'Processing…' : 'Voice'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editor area */}
      <div className={
        isExpanded
          ? `rich-editor rich-editor--expanded relative h-full flex flex-col overflow-hidden min-h-0 ${editorClassName} ${loaded ? '' : 'bg-gray-50'}`
          : `relative border rounded-xl overflow-hidden ${editorClassName} ${loaded ? '' : 'min-h-[120px] bg-gray-50'}`
      }
        onFocusCapture={() => { isFocusedRef.current = true; }}
        onBlurCapture={() => { isFocusedRef.current = false; }}
      >
        <textarea
          id={uid.current}
          ref={taRef}
          defaultValue={value}
          title={placeholder || label || 'Rich text editor'}
          placeholder={placeholder || label || 'Rich text editor'}
          aria-label={label || placeholder || 'Rich text editor'}
          className="hidden"
          style={{ display: 'none' }}
        />

        {/* Absolutely-positioned React Expand Button in empty right corner of SunEditor Toolbar */}
        {showExpandButton && onExpandClick && loaded && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExpandClick();
            }}
            className="absolute right-2 top-1.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-900 transition hover:border-slate-300 hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 cursor-pointer shadow-none"
            title="Expand editor"
            aria-label="Expand editor"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {!loaded && !loadFailed && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading editor…
          </div>
        )}

        {loadFailed && (
          /* Fallback plain textarea when CDN fails */
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            rows={isExpanded ? undefined : Math.round(height / 24)}
            className={isExpanded ? "w-full flex-1 p-4 text-sm focus:outline-none resize-none overflow-y-auto" : "w-full p-4 text-sm focus:outline-none resize-y"}
          />
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 mt-1 text-red-600 text-xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Recording — click Voice again to stop and insert
        </div>
      )}
      {voiceError && <p className="mt-1 text-xs text-red-600">{voiceError}</p>}
    </div>
  );
}

export type RichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  editorTitle?: string;
  minHeight?: string | number;
  disabled?: boolean;
  className?: string;
  allowExpand?: boolean;
  expandedTitle?: string;
  expandedSubtitle?: string;
  mode?: "inline" | "expanded";
  // Keep compatibility props
  required?: boolean;
  lang?: string;
  onLangChange?: (l: string) => void;
  showVoice?: boolean;
  showTranslate?: boolean;
  translateTargetLang?: string;
  showExpandButton?: boolean;
  onExpandClick?: () => void;
  editorClassName?: string;
  allowExpandModal?: boolean;
  modalTitle?: string;
  modalSubtitle?: string;
  height?: number;
};

export function RichTextEditor({
  allowExpand = true,
  allowExpandModal,
  expandedTitle = 'Edit Full Description',
  modalTitle,
  expandedSubtitle = 'Edit your content with a larger rich text editor.',
  modalSubtitle,
  value = '',
  onChange,
  label,
  ...rest
}: RichTextEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const lastSavedValueRef = useRef(value);

  // Sync draftValue on value change when modal is closed
  useEffect(() => {
    if (!isModalOpen) {
      setDraftValue(value);
      lastSavedValueRef.current = value;
    }
  }, [value, isModalOpen]);

  // Modal body scroll lock and escape key handler
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isModalOpen, draftValue]);

  const openModal = () => {
    lastSavedValueRef.current = value;
    setDraftValue(value);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const requestClose = () => {
    if (draftValue !== lastSavedValueRef.current) {
      const ok = window.confirm('Discard changes?');
      if (!ok) return;
    }
    closeModal();
  };

  const saveModal = () => {
    onChange?.(draftValue);
    lastSavedValueRef.current = draftValue;
    closeModal();
  };

  const actualAllowExpand = allowExpandModal !== undefined ? allowExpandModal : allowExpand;
  const actualTitle = modalTitle || (label ? `${label} Editor` : expandedTitle);
  const actualSubtitle = modalSubtitle || expandedSubtitle;

  return (
    <>
      <RichTextEditorCore
        {...rest}
        label={label}
        value={value}
        onChange={onChange}
        showExpandButton={actualAllowExpand}
        onExpandClick={actualAllowExpand ? openModal : undefined}
      />

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-6 animate-premium-fade-in" onClick={requestClose}>
          <div 
            className="relative flex h-[min(760px,calc(100vh-48px))] w-[min(1120px,calc(100vw-48px))] max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 h-[72px] items-center justify-between border-b border-gray-100 bg-white px-[28px] py-5">
              <div>
                <h2 className="text-[17px] font-bold text-slate-900">{actualTitle}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{actualSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="editor-modal-body bg-gradient-to-b from-white to-slate-50">
              <div className="editor-modal-editor-shell">
                <RichTextEditorCore
                  {...rest}
                  value={draftValue}
                  onChange={setDraftValue}
                  label={undefined}
                  showExpandButton={false}
                  mode="expanded"
                  editorClassName="h-full border-0 rounded-none overflow-hidden"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 h-[76px] items-center justify-between border-t border-gray-100 bg-white px-[28px] py-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <kbd className="inline-flex h-5 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 font-sans text-[10px] font-medium text-slate-500 shadow-sm">Esc</kbd>
                <span>to close</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-xl border border-slate-300 bg-white px-[18px] py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveModal}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-[22px] py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
