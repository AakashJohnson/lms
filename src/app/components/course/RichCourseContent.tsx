import { useMemo } from 'react';
import { Quote } from 'lucide-react';
import { toAbsoluteAssetUrl } from '../../utils/fileUrl';

interface RichCourseContentProps {
  html?: string;
}

const sanitizeCourseHtml = (html: string): string => {
  const raw = String(html || '');
  if (!raw.trim()) return '';
  if (typeof window === 'undefined') return raw;

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'text/html');

  doc.querySelectorAll('script, style, object, embed, link, meta').forEach((node) => node.remove());

  doc.querySelectorAll('*').forEach((node) => {
    const attrs = Array.from(node.attributes);
    attrs.forEach((attr) => {
      const key = attr.name.toLowerCase();
      const value = String(attr.value || '').trim();

      if (key.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }

      if ((key === 'href' || key === 'src') && /^javascript:/i.test(value)) {
        node.removeAttribute(attr.name);
        return;
      }

      if ((key === 'href' || key === 'src') && /^data:/i.test(value) && node.tagName !== 'IMG') {
        node.removeAttribute(attr.name);
        return;
      }

      if (node.tagName === 'IMG' && key === 'src') {
        if (value.toLowerCase().startsWith('blob:')) {
          node.removeAttribute(attr.name);
          return;
        }
        node.setAttribute('src', toAbsoluteAssetUrl(value));
      }

      if (node.tagName === 'IFRAME' && key === 'src' && !/^https?:\/\//i.test(value)) {
        node.removeAttribute(attr.name);
      }
    });

    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }

    if (node.tagName === 'IFRAME') {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('referrerpolicy', 'no-referrer');
      node.setAttribute('allowfullscreen', 'true');
      if (!node.getAttribute('allow')) {
        node.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      }
    }
  });

  return doc.body.innerHTML || '';
};

const hasVisibleText = (html: string): boolean => {
  const plain = String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 0;
};

export function RichCourseContent({ html = '' }: RichCourseContentProps) {
  const safeHtml = useMemo(() => sanitizeCourseHtml(html), [html]);

  if (!hasVisibleText(safeHtml)) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm min-h-[120px] flex items-center gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Quote className="h-5 w-5" />
        </span>
        <div className="border-l-2 border-violet-300 pl-4">
          <p className="text-sm font-semibold text-slate-700">No description available</p>
          <p className="text-sm text-slate-500 mt-0.5">This course does not have a published overview yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="rich-course-content text-slate-700 leading-7 text-[0.96rem]
          [&_h1]:text-[2rem] [&_h1]:leading-[2.4rem] [&_h1]:font-extrabold [&_h1]:text-slate-900 [&_h1]:tracking-tight [&_h1]:my-6
          [&_h2]:text-[1.5rem] [&_h2]:leading-8 [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:tracking-tight [&_h2]:my-5
          [&_h3]:text-[1.25rem] [&_h3]:leading-7 [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:my-4
          [&_p]:my-3 [&_strong]:text-slate-900 [&_strong]:font-bold
          [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1.5
          [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-2xl [&_img]:my-5 [&_img]:mx-auto [&_img]:block [&_img]:border [&_img]:border-slate-200/90 [&_img]:shadow-[0_18px_45px_rgba(15,23,42,0.08)]
          [&_table]:w-full [&_table]:border-collapse [&_table]:my-5 [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:border [&_table]:border-slate-200
          [&_th]:bg-slate-50 [&_th]:text-slate-900 [&_th]:font-bold [&_th]:border [&_th]:border-slate-200 [&_th]:p-3
          [&_td]:border [&_td]:border-slate-200 [&_td]:p-3 [&_td]:text-left
          [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:bg-indigo-50/60 [&_blockquote]:text-slate-600 [&_blockquote]:rounded-r-xl [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:my-4
          [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded-2xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4
          [&_code]:bg-slate-100 [&_code]:text-indigo-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md
          [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0
          [&_a]:text-indigo-600 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-700
          [&_iframe]:w-full [&_iframe]:min-h-[260px] [&_iframe]:rounded-xl [&_iframe]:my-5 [&_iframe]:border [&_iframe]:border-slate-200"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </div>
  );
}
