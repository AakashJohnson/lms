import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toAbsoluteAssetUrl } from '../../utils/fileUrl';
import { isEmptyHtml } from './courseInfoHelpers';

interface ExpandableRichTextProps {
  html?: string;
  text?: string;
  maxHeight?: number;
  className?: string;
}

const sanitize = (value = '') => {
  if (typeof window === 'undefined') return value;
  const clean = DOMPurify.sanitize(value, { ADD_ATTR: ['target', 'rel', 'loading'] });
  const doc = new DOMParser().parseFromString(clean, 'text/html');

  doc.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });

  doc.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') || '';
    if (src.toLowerCase().startsWith('blob:')) {
      image.removeAttribute('src');
      return;
    }
    image.setAttribute('src', toAbsoluteAssetUrl(src));
    image.setAttribute('loading', 'lazy');
  });

  return doc.body.innerHTML;
};

export function ExpandableRichText({ html, text, maxHeight = 120, className = '' }: ExpandableRichTextProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const source = html || (text ? `<p>${text}</p>` : '');
  const safeHtml = useMemo(() => sanitize(source), [source]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const measure = () => {
      setCanExpand(element.scrollHeight > element.clientHeight + 4);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [safeHtml, expanded, maxHeight]);

  if (isEmptyHtml(safeHtml)) return null;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={contentRef}
        className="overflow-hidden text-sm leading-7 text-slate-700 transition-[max-height] duration-300 ease-out
          [&_h1]:my-3 [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-slate-950
          [&_h2]:my-3 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-slate-950
          [&_h3]:my-2.5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900
          [&_p]:my-2 [&_strong]:font-bold [&_strong]:text-slate-950
          [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1
          [&_a]:font-semibold [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2
          [&_img]:my-3 [&_img]:h-auto [&_img]:max-h-[420px] [&_img]:max-w-full [&_img]:object-contain [&_img]:rounded-2xl [&_img]:border [&_img]:border-slate-200
          [&_table]:my-3 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse
          [&_th]:border [&_th]:border-slate-200 [&_th]:bg-indigo-50 [&_th]:p-2 [&_td]:border [&_td]:border-slate-200 [&_td]:p-2
          [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100
          [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-indigo-700 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit"
        style={{ maxHeight: expanded ? 1800 : maxHeight }}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      {canExpand && !expanded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 h-12 bg-gradient-to-t from-white via-white/95 to-white/0" />
      )}

      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          {expanded ? 'Show less' : 'Read more'}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
