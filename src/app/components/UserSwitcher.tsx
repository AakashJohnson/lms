import { User, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface UserSwitcherProps {
  currentUser: {
    name: string;
    role: 'admin' | 'trainer' | 'student';
    avatar: string;
  };
  onUserChange: (role: 'admin' | 'trainer' | 'student') => void;
}

export function UserSwitcher({ currentUser, onUserChange }: UserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const users = [
    {
      name: 'Admin User',
      role: 'admin' as const,
      avatar: 'AU',
      email: 'admin@ceas.gov.in',
    },
    {
      name: 'Dr. Rajesh Kumar',
      role: 'trainer' as const,
      avatar: 'RK',
      email: 'rajesh.kumar@ceas.gov.in',
    },
    {
      name: 'Rahul Sharma',
      role: 'student' as const,
      avatar: 'RS',
      email: 'rahul.sharma@example.com',
    },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'trainer':
        return 'bg-blue-100 text-blue-700';
      case 'student':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-all min-w-[280px]"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-semibold">
          {currentUser.avatar}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-gray-900 text-sm">{currentUser.name}</p>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(currentUser.role)}`}>
            {currentUser.role}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 uppercase">Switch User</p>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.role}
                  onClick={() => {
                    onUserChange(user.role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-all ${
                    currentUser.role === user.role ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${
                    user.role === 'admin' ? 'from-purple-600 to-purple-700' :
                    user.role === 'trainer' ? 'from-blue-600 to-blue-700' :
                    'from-green-600 to-green-700'
                  } rounded-full flex items-center justify-center text-white font-semibold`}>
                    {user.avatar}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  {currentUser.role === user.role && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                🔄 Switch between users to see different dashboards
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
