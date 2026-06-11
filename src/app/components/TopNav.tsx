import { BookOpen, MessageSquare, PlaySquare } from 'lucide-react';

interface TopNavProps {
  activeTab: 'lms' | 'qms' | 'media';
  onTabChange: (tab: 'lms' | 'qms' | 'media') => void;
}

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const tabs = [
    { id: 'lms' as const, label: 'LMS', sublabel: 'Learning Management System', icon: BookOpen },
    { id: 'qms' as const, label: 'QMS', sublabel: 'Query Management System', icon: MessageSquare },
    { id: 'media' as const, label: 'Media Library', sublabel: 'Audio-Visual Content', icon: PlaySquare },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4">
      <div className="flex gap-1 max-w-7xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all ${
                isActive
                  ? 'border-[#3B4FD8] text-[#3B4FD8] bg-indigo-50/30'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold text-sm">{tab.label}</p>
                <p className="text-xs opacity-75">{tab.sublabel}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
