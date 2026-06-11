import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, GraduationCap, LucideIcon, Sparkles } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function GovernmentWatermark() {
  return (
    <svg width="420" height="180" viewBox="0 0 420 180" fill="none" aria-hidden="true">
      <path d="M34 158H386M64 158V94H356V158M88 94V70H332V94M136 70V48H284V70" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      <path d="M186 48C186 34.745 196.745 24 210 24C223.255 24 234 34.745 234 48" stroke="#4F46E5" strokeWidth="2" />
      <path d="M206 24V12M192 30L182 18M228 30L238 18" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      {[104, 136, 168, 200, 232, 264, 296].map((x) => (
        <path key={x} d={`M${x} 158V94`} stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function DotGrid() {
  return (
    <svg width="160" height="100" viewBox="0 0 160 100" fill="none" aria-hidden="true">
      {Array.from({ length: 45 }).map((_, i) => (
        <circle key={i} cx={(i % 9) * 18 + 4} cy={Math.floor(i / 9) * 18 + 4} r="2" fill="#4F46E5" />
      ))}
    </svg>
  );
}

function WaveLayer() {
  return (
    <svg className="h-full w-full" viewBox="0 0 1200 240" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 136C144 86 253 87 377 127C520 173 639 176 782 123C919 72 1030 66 1200 108V240H0V136Z" fill="url(#premium-wave)" />
      <path d="M0 96C147 142 260 154 403 117C566 75 724 72 871 118C1001 159 1094 168 1200 134" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
      <defs>
        <linearGradient id="premium-wave" x1="0" y1="80" x2="1200" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" stopOpacity=".22" />
          <stop offset=".5" stopColor="#14B8A6" stopOpacity=".14" />
          <stop offset="1" stopColor="#2563EB" stopOpacity=".2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PremiumBackground() {
  const floating = [
    { Icon: BookOpen, className: 'right-12 top-20 rotate-12 text-indigo-300', delay: 0 },
    { Icon: Calendar, className: 'left-[50%] top-28 -rotate-6 text-blue-300', delay: 1.1 },
    { Icon: GraduationCap, className: 'right-[16%] top-52 text-teal-300', delay: 2 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute right-0 top-0 opacity-5"><GovernmentWatermark /></div>
      <div className="absolute left-1/2 top-20 -translate-x-1/2 opacity-5"><DotGrid /></div>
      <div className="absolute inset-x-0 top-12 h-56 opacity-10 blur-[1px]"><WaveLayer /></div>
      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[#4F46E5]/10 blur-3xl" />
      <div className="absolute right-10 top-72 h-80 w-80 rounded-full bg-[#14B8A6]/10 blur-3xl" />
      <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl" />
      {floating.map(({ Icon, className, delay }) => (
        <motion.div
          key={className}
          className={`absolute hidden lg:block ${className}`}
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 6, delay, ease: 'easeInOut' }}
        >
          <Icon className="h-9 w-9" strokeWidth={1.7} />
        </motion.div>
      ))}
    </div>
  );
}

export function PremiumPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-4 min-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] bg-[#F8FAFC] text-slate-950 sm:-m-6 lg:-m-7">
      <PremiumBackground />
      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}

export function PremiumHero({
  title,
  subtitle,
  eyebrow = 'AI powered interface',
  icon: Icon = Sparkles,
  action,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ duration: .45, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 px-5 py-7 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl sm:px-7"
    >
      <div className="absolute inset-0 opacity-10 blur-[1px]"><WaveLayer /></div>
      <div className="absolute right-10 top-2 opacity-10"><GovernmentWatermark /></div>
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
            <Icon className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base font-medium text-slate-600">{subtitle}</p>
        </div>
        {action}
      </div>
    </motion.section>
  );
}

export function PremiumStatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'from-indigo-50 via-blue-50 to-white',
  accent = 'text-indigo-600',
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon: LucideIcon;
  tone?: string;
  accent?: string;
}) {
  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`group relative overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-br ${tone} p-5 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl`}
    >
      <div className="absolute inset-0 bg-white/38" />
      <Icon className={`absolute -bottom-5 -right-4 h-24 w-24 ${accent} opacity-10 transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.6} />
      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 ring-8 ring-white/45">
          <Icon className={`h-7 w-7 ${accent}`} strokeWidth={2.1} />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          {detail && <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>}
        </div>
      </div>
    </motion.article>
  );
}

export function PremiumCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[24px] border border-white/80 bg-white/88 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}
