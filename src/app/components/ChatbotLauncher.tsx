import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, Sparkles, X } from 'lucide-react';

export function ChatbotLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 24 }); // distance from bottom-right
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const moved = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setPos({
        x: Math.max(8, dragStart.current.px - dx),
        y: Math.max(8, dragStart.current.py - dy),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleClick = () => {
    if (!moved.current) setIsOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={onMouseDown}
        onClick={handleClick}
        style={{ bottom: pos.y, right: pos.x }}
        className="fixed z-40 flex items-center gap-3 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-0.5 hover:bg-slate-900 select-none cursor-grab active:cursor-grabbing"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2bd196] text-white">
          <Bot className="h-5 w-5" />
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-300">Assistant</span>
          <span className="block">Open chatbot</span>
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/20 p-4 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex h-[min(82vh,760px)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">AI Support</p>
                <h2 className="text-sm font-semibold">CEAS-LMS Chatbot</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Need help with courses, queries, or support? Ask here.</span>
            </div>

            <iframe
              title="CEAS-LMS chatbot"
              src="/chatbot/index.html"
              className="h-full w-full border-0 bg-transparent"
              allow="microphone; clipboard-read; clipboard-write; camera"
            />
          </div>
        </div>
      )}
    </>
  );
}
