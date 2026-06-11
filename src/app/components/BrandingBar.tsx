import { Bell, ChevronDown, Globe, LogOut, Search, Settings2, ShieldCheck } from 'lucide-react';

interface BrandingBarProps {
  currentUser: { name: string; role: 'admin' | 'trainer' | 'participant'; avatar: string; email?: string };
  onLogout: () => void;
}

export function BrandingBar({ currentUser, onLogout }: BrandingBarProps) {
  const roleLabel = currentUser.role === 'participant' ? 'Participant' : currentUser.role === 'trainer' ? 'Trainer' : 'Admin';
  const roleTone =
    currentUser.role === 'admin'
      ? 'bg-purple-100 text-purple-700'
      : currentUser.role === 'trainer'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-emerald-100 text-emerald-700';

  return (
    <header className="sticky top-0 z-40 border-b border-indigo-100/60 bg-white/92 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2 lg:gap-3">
            <img src="/ankuvadini.png" alt="Ankuvadini Logo" className="h-10 w-auto lg:h-11" />
            <img src="/mca_logo.png" alt="MCA Logo" className="h-10 w-auto lg:h-11" />
            <img src="/ncui.png" alt="NCUI Logo" className="h-8 w-auto lg:h-9" />
          </div>
          <div className="hidden min-w-0 border-l border-indigo-100 pl-4 lg:block">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-[#1A237E]">CEAS-LMS Portal</h1>
            <p className="text-[11px] font-medium text-slate-500">Ministry Education Learning Platform</p>
          </div>
        </div>

        <label className="relative hidden min-w-[260px] max-w-[420px] flex-1 md:block">
          <span className="sr-only">Search portal</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder={currentUser.role === 'trainer' ? 'Search students, courses, sessions...' : 'Search anything...'}
            className="h-12 w-full rounded-full border border-slate-200 bg-white/85 pl-11 pr-11 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
          <Settings2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </label>

        <div className="flex items-center gap-2 lg:gap-3">
          <button className="hidden h-11 items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 sm:flex">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            English
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          <button title="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-full border border-indigo-100 bg-white text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>

          <div className="flex h-12 items-center gap-2 rounded-full border border-indigo-100 bg-white py-1 pl-3 pr-2 shadow-sm">
            <div className="hidden sm:block text-right">
              <p className="font-semibold text-gray-900 text-xs leading-tight">{currentUser.name}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleTone}`}>
                <ShieldCheck className="w-3 h-3" />
                {roleLabel}
              </span>
            </div>

            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {currentUser.avatar}
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
