import { useState, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { voiceInputService } from '../../services/voiceInputService';

interface VoiceInputFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  lang?: string;
  required?: boolean;
  helpText?: string;
}

export function VoiceInputField({
  value,
  onChange,
  placeholder,
  label,
  multiline = false,
  rows = 3,
  className = '',
  lang = 'en',
  required = false,
  helpText,
}: VoiceInputFieldProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const timerRef = { current: null as ReturnType<typeof setInterval> | null };

  const handleVoice = useCallback(async () => {
    if (isRecording) {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
      setIsProcessing(true);
      try {
        const text = await voiceInputService.stopAndTranscribe(lang);
        if (text) onChange(value ? `${value} ${text}` : text);
      } catch (e) {
        setError((e as Error).message);
        setTimeout(() => setError(''), 4000);
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        await voiceInputService.startRecording();
        setIsRecording(true);
        setError('');
        setDuration(0);
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      } catch (e) {
        setError((e as Error).message);
        setTimeout(() => setError(''), 4000);
      }
    }
  }, [isRecording, lang, value, onChange]);

  const baseInput =
    `w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ` +
    (isRecording ? 'border-red-400 bg-red-50/50 ' : 'border-gray-300 bg-white ') +
    className;

  const micBtn =
    `absolute right-3 p-1.5 rounded-lg transition-all ` +
    (isRecording
      ? 'top-3 bg-red-500 text-white animate-pulse shadow-lg'
      : isProcessing
      ? 'top-1/2 -translate-y-1/2 bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'top-1/2 -translate-y-1/2 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 hover:scale-105');

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={baseInput}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={baseInput}
          />
        )}
        <button
          type="button"
          onClick={handleVoice}
          disabled={isProcessing}
          className={micBtn}
          title={isRecording ? 'Stop recording' : 'Click to speak'}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="flex gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-0.5 bg-red-500 rounded-full animate-bounce"
                style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </span>
          <span className="text-red-600 text-xs font-medium">
            Recording {duration}s — click mic to stop
          </span>
        </div>
      )}

      {isProcessing && (
        <p className="mt-1 text-xs text-indigo-600 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Transcribing audio…
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {helpText && !error && !isRecording && (
        <p className="mt-1 text-xs text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
