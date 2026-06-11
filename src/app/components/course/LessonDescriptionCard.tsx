import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { BookOpenText, ChevronDown, ChevronUp } from 'lucide-react';
import { toAbsoluteAssetUrl } from '../../utils/fileUrl';

interface LessonDescriptionCardProps {
  descriptionHtml?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

const EMPTY_HTML_PATTERNS = new Set([
  '',
  '<p></p>',
  '<p><br></p>',
  '<p><br/></p>',
  '<p><br /></p>',
  '<br>',
  '<br/>',
  '<br />',
]);

const normalizeHtml = (html = '') =>
  String(html || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const isHtmlContentEmpty = (html = '') => {
  const normalized = normalizeHtml(html);
  if (EMPTY_HTML_PATTERNS.has(normalized)) return true;

  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const hasMedia = Boolean(doc.body.querySelector('img, video, audio, iframe, table'));
    const text = doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
    return !hasMedia && text.length === 0;
  }

  const textOnly = String(html || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return textOnly.length === 0;
};

const pickFirstContent = (...values: unknown[]) =>
  values.find((value) => typeof value === 'string' && !isHtmlContentEmpty(value)) as string | undefined;

export const getResolvedLessonDescription = (course: any, section: any, lesson: any) =>
  pickFirstContent(
    lesson?.description,
    lesson?.fullDescription,
    lesson?.overview,
    lesson?.type !== 'article' ? lesson?.content : '',
    lesson?.summary,
    section?.description,
    section?.fullDescription,
    course?.description,
    course?.fullDescription,
  ) || '';

const sanitizeLessonHtml = (html = '') => {
  if (typeof window === 'undefined') return String(html || '');

  const clean = DOMPurify.sanitize(String(html || ''), {
    ADD_ATTR: ['target', 'rel', 'loading'],
  });

  const doc = new DOMParser().parseFromString(clean, 'text/html');
  doc.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });
  doc.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') || '';
    if (src.trim().toLowerCase().startsWith('blob:')) {
      image.removeAttribute('src');
      return;
    }
    image.setAttribute('src', toAbsoluteAssetUrl(src));
    image.setAttribute('loading', 'lazy');
  });

  return doc.body.innerHTML;
};

export function LessonDescriptionCard({
  descriptionHtml = '',
  title = 'About this lesson',
  subtitle = "Trainer's overview and learning details",
  className = '',
}: LessonDescriptionCardProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const safeHtml = useMemo(() => sanitizeLessonHtml(descriptionHtml), [descriptionHtml]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 4);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [safeHtml, expanded]);

  if (isHtmlContentEmpty(safeHtml)) return null;

  return (
    <section className={`overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${className}`}>
      <div className="flex items-center gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-[0_10px_24px_rgba(99,102,241,0.10)]">
          <BookOpenText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-slate-950 leading-tight">{title}</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-5">{subtitle}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="relative overflow-hidden rounded-2xl bg-slate-50/80">
          <div
            ref={contentRef}
            className={`lesson-description-rich px-4 py-4 text-[0.95rem] leading-7 text-slate-700 transition-[max-height] duration-300 ease-out sm:px-5 ${
              expanded ? 'max-h-[2000px]' : 'max-h-[140px]'
            }
            [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:text-slate-950 [&_h1]:my-4
            [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-slate-950 [&_h2]:my-4
            [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:my-3
            [&_p]:my-3 [&_strong]:font-bold [&_strong]:text-slate-950 [&_em]:text-slate-800
            [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5
            [&_a]:font-semibold [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-700
            [&_img]:my-4 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-slate-200 [&_img]:shadow-sm
            [&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse
            [&_th]:border [&_th]:border-slate-200 [&_th]:bg-indigo-50 [&_th]:p-3 [&_th]:text-left [&_th]:font-bold [&_th]:text-slate-900
            [&_td]:border [&_td]:border-slate-200 [&_td]:bg-white [&_td]:p-3
            [&_blockquote]:my-4 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:bg-indigo-50/70 [&_blockquote]:px-4 [&_blockquote]:py-3
            [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100
            [&_code]:rounded-md [&_code]:bg-white [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-indigo-700 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit`}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
          {isOverflowing && !expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50 via-slate-50/95 to-slate-50/0" />
          )}
        </div>

        {isOverflowing && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-indigo-100 bg-white px-5 py-2 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              {expanded ? 'Show less' : 'Read more'}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
