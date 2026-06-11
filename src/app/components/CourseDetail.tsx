import { BookOpen, Clock, Award, ChevronDown, ChevronUp, FileText, Video, Lock } from 'lucide-react';
import { useState } from 'react';

interface CourseDetailProps {
  courseId: number;
  onBack: () => void;
}

export function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const [expandedModule, setExpandedModule] = useState<number | null>(1);
  const [selectedContent, setSelectedContent] = useState<{ module: number; item: number } | null>(null);

  const course = {
    id: courseId,
    title: 'Cooperative Management Fundamentals',
    category: 'Management',
    progress: 75,
    duration: '8 weeks',
    modules: [
      {
        id: 1,
        title: 'Introduction to Cooperatives',
        duration: '2 hours',
        completed: true,
        items: [
          { id: 1, type: 'pdf', title: 'What is a Cooperative?', duration: '15 min', completed: true },
          { id: 2, type: 'video', title: 'History of Cooperative Movement', duration: '25 min', completed: true },
          { id: 3, type: 'pdf', title: 'Cooperative Principles', duration: '20 min', completed: true },
        ],
      },
      {
        id: 2,
        title: 'Cooperative Structure & Governance',
        duration: '3 hours',
        completed: true,
        items: [
          { id: 1, type: 'pdf', title: 'Organizational Structure', duration: '30 min', completed: true },
          { id: 2, type: 'video', title: 'Board Governance', duration: '40 min', completed: true },
          { id: 3, type: 'pdf', title: 'Member Rights & Responsibilities', duration: '25 min', completed: true },
        ],
      },
      {
        id: 3,
        title: 'Financial Management',
        duration: '4 hours',
        completed: false,
        items: [
          { id: 1, type: 'pdf', title: 'Basic Accounting', duration: '35 min', completed: true },
          { id: 2, type: 'video', title: 'Financial Planning', duration: '45 min', completed: false },
          { id: 3, type: 'pdf', title: 'Surplus Distribution', duration: '30 min', completed: false },
        ],
      },
      {
        id: 4,
        title: 'Strategic Planning',
        duration: '3 hours',
        completed: false,
        locked: true,
        items: [
          { id: 1, type: 'pdf', title: 'SWOT Analysis', duration: '25 min', completed: false },
          { id: 2, type: 'video', title: 'Goal Setting', duration: '35 min', completed: false },
          { id: 3, type: 'pdf', title: 'Action Plans', duration: '30 min', completed: false },
        ],
      },
    ],
  };

  const handleModuleClick = (moduleId: number, locked?: boolean) => {
    if (locked) return;
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const handleContentClick = (moduleId: number, itemId: number, locked?: boolean) => {
    if (locked) return;
    setSelectedContent({ module: moduleId, item: itemId });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
      >
        ← Back to Courses
      </button>

      {/* Course Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm font-medium mb-3 inline-block">
              {course.category}
            </span>
            <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
            <div className="flex items-center gap-6 text-indigo-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{course.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>{course.modules.length} modules</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span>Certificate Available</span>
              </div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-2xl p-6 text-center min-w-[200px]">
            <p className="text-sm text-indigo-100 mb-2">Overall Progress</p>
            <p className="text-4xl font-bold mb-3">{course.progress}%</p>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Content */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Course Content</h2>
          {course.modules.map((module) => (
            <div
              key={module.id}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                module.locked ? 'border-gray-200 opacity-60' : 'border-gray-100'
              }`}
            >
              {/* Module Header */}
              <button
                onClick={() => handleModuleClick(module.id, module.locked)}
                className={`w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  module.locked ? 'cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    module.completed
                      ? 'bg-green-100 text-green-600'
                      : module.locked
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {module.locked ? (
                      <Lock className="w-6 h-6" />
                    ) : module.completed ? (
                      <Award className="w-6 h-6" />
                    ) : (
                      <BookOpen className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{module.title}</h3>
                    <p className="text-sm text-gray-600">{module.duration} • {module.items.length} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {module.completed && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                      Completed
                    </span>
                  )}
                  {module.locked && (
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                      Locked
                    </span>
                  )}
                  {!module.locked && (
                    expandedModule === module.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )
                  )}
                </div>
              </button>

              {/* Module Items */}
              {expandedModule === module.id && !module.locked && (
                <div className="border-t border-gray-100">
                  {module.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleContentClick(module.id, item.id)}
                      className="w-full p-4 px-6 flex items-center justify-between hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          item.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.type === 'pdf' ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-600">{item.duration}</p>
                        </div>
                      </div>
                      {item.completed && (
                        <span className="text-green-600">
                          <Award className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">My Notes</h3>
            <textarea
              rows={6}
              placeholder="Add your notes here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <button className="w-full mt-3 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-all">
              Save Notes
            </button>
          </div>

          {/* Course Stats */}
          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-6 border border-green-200">
            <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed Modules</span>
                <span className="font-semibold text-gray-900">
                  {course.modules.filter(m => m.completed).length}/{course.modules.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Time Spent</span>
                <span className="font-semibold text-gray-900">12.5 hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Next Assessment</span>
                <span className="font-semibold text-indigo-600">Available</span>
              </div>
            </div>
          </div>

          {/* Download Protection Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>📌 Note:</strong> Content is available for online viewing only. Downloads are disabled to protect course materials.
            </p>
          </div>
        </div>
      </div>

      {/* Content Viewer Modal */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {course.modules.find(m => m.id === selectedContent.module)?.items.find(i => i.id === selectedContent.item)?.title}
              </h2>
              <button
                onClick={() => setSelectedContent(null)}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              >
                <span className="text-gray-500 text-2xl">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center mb-6">
                <div className="text-center text-gray-500">
                  <FileText className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">PDF Viewer</p>
                  <p className="text-sm mt-2">Content protected - Download disabled</p>
                </div>
              </div>

              {/* Mock Content */}
              <div className="prose max-w-none">
                <h3>Content Preview</h3>
                <p>
                  This is where the actual course content would be displayed. In a real implementation,
                  this would show PDF content or video player with proper content protection measures.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setSelectedContent(null)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                Close
              </button>
              <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all">
                Mark as Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
