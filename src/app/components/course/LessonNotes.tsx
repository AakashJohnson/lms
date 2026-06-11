import { useState, useEffect } from 'react';
import { 
  StickyNote, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Star, 
  Clock,
  Search,
  Tag
} from 'lucide-react';
import {
  getLessonNotes,
  createLessonNote,
  updateNote,
  deleteNote,
  type LessonNote
} from '../../services/lessonNoteService';
import { AiLessonNotes } from './AiLessonNotes';
import { AiFlashcards } from './AiFlashcards';
import { AiLessonQuestion } from './AiLessonQuestion';
import { toast } from 'sonner';

interface LessonNotesProps {
  courseId: string;
  sectionId: string;
  lessonId: string;
  currentTimestamp?: number; // Current video timestamp
  onJumpToTimestamp?: (seconds: number) => void;
}

export function LessonNotes({ courseId, sectionId, lessonId, currentTimestamp, onJumpToTimestamp }: LessonNotesProps) {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<LessonNote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'flashcards' | 'ask'>('manual');

  // Form state
  const [noteContent, setNoteContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state for viewing notes
  const [selectedNote, setSelectedNote] = useState<LessonNote | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Modal editing states
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [modalEditTitle, setModalEditTitle] = useState('');
  const [modalEditContent, setModalEditContent] = useState('');
  const [modalEditIsImportant, setModalEditIsImportant] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  const openNoteModal = (note: LessonNote) => {
    setSelectedNote(note);
    setIsNoteModalOpen(true);
    setIsEditingInModal(false);
  };

  const closeNoteModal = () => {
    setSelectedNote(null);
    setIsNoteModalOpen(false);
    setIsEditingInModal(false);
  };

  // Load notes
  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await getLessonNotes(courseId, sectionId, lessonId);
      if (response.success) {
        setNotes(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [courseId, sectionId, lessonId, activeTab]);

  // Handle create note
  const handleCreateNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Please enter note content');
      return;
    }

    setSaving(true);
    try {
      const response = await createLessonNote({
        course: courseId,
        section: sectionId,
        lesson: lessonId,
        content: noteContent.trim(),
        timestamp: currentTimestamp,
        isImportant
      });

      if (response.success) {
        toast.success('Note saved!', { icon: '📝' });
        setNoteContent('');
        setIsImportant(false);
        setShowAddNote(false);
        loadNotes();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  // Handle update note
  const handleUpdateNote = async () => {
    if (!editingNote || !noteContent.trim()) return;

    setSaving(true);
    try {
      const response = await updateNote(editingNote._id, {
        content: noteContent.trim(),
        isImportant
      });

      if (response.success) {
        toast.success('Note updated!');
        setNoteContent('');
        setIsImportant(false);
        setEditingNote(null);
        loadNotes();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      const response = await deleteNote(noteId);
      if (response.success) {
        toast.success('Note deleted');
        loadNotes();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete note');
    }
  };

  // Handle edit click
  const handleEditClick = (note: LessonNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setIsImportant(note.isImportant);
    setShowAddNote(true);
  };

  // Handle cancel
  const handleCancel = () => {
    setShowAddNote(false);
    setEditingNote(null);
    setNoteContent('');
    setIsImportant(false);
  };

  // Format timestamp
  const formatTimestamp = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Modal keybinds and scroll-lock effect
  useEffect(() => {
    if (!isNoteModalOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNoteModal();
    };

    document.addEventListener('keydown', handleEsc);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = originalOverflow;
    };
  }, [isNoteModalOpen]);

  // Helpers for Note formatting
  const stripMarkdownPreview = (text: string = '') => {
    return String(text)
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\n+/g, ' ')
      .trim();
  };

  const getNoteTitle = (note: any) => {
    if (note?.title && note.title.trim()) return note.title.trim();

    const content = String(note?.content || note?.text || '');
    if (content.startsWith('AI Regenerated Preview Summary (detailed):')) {
      return 'AI Regenerated Preview Summary (detailed)';
    }
    if (content.startsWith('AI Regenerated Preview Summary (short):')) {
      return 'AI Regenerated Preview Summary (short)';
    }
    const firstLine = content.split('\n').find((line) => line.trim());

    if (!firstLine) return 'Untitled Note';

    const cleaned = firstLine
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/:$/, '')
      .trim();

    return cleaned.length > 70 ? cleaned.slice(0, 70) + '...' : cleaned;
  };

  const getNoteContent = (note: any) => {
    return note?.content || note?.text || note?.body || '';
  };

  const getNotePreview = (note: any) => {
    const content = getNoteContent(note);
    const cleaned = stripMarkdownPreview(content);

    if (!cleaned) return 'No preview available.';

    return cleaned.length > 180
      ? cleaned.slice(0, 180).trim() + '...'
      : cleaned;
  };

  const formatNoteDate = (note: any) => {
    const dateValue = note?.createdAt || note?.updatedAt || note?.date;

    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;

    return (
      getNoteTitle(note).toLowerCase().includes(q) ||
      getNoteContent(note).toLowerCase().includes(q)
    );
  });

  const startModalEdit = (note: LessonNote) => {
    setModalEditTitle(getNoteTitle(note));
    setModalEditContent(getNoteContent(note));
    setModalEditIsImportant(note.isImportant);
    setIsEditingInModal(true);
  };

  const cancelModalEdit = () => {
    setIsEditingInModal(false);
  };

  const handleSaveModalEdit = async () => {
    if (!selectedNote) return;
    if (!modalEditContent.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    setModalSaving(true);
    try {
      const response = await updateNote(selectedNote._id, {
        title: modalEditTitle.trim(),
        content: modalEditContent.trim(),
        isImportant: modalEditIsImportant,
      });

      if (response.success) {
        toast.success('Note updated!');
        setIsEditingInModal(false);
        const updated = {
          ...selectedNote,
          title: modalEditTitle.trim(),
          content: modalEditContent.trim(),
          isImportant: modalEditIsImportant,
          updatedAt: new Date().toISOString(),
        };
        setSelectedNote(updated);
        loadNotes();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update note');
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'manual' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          My Notes
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Video Summary
        </button>
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'flashcards' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Flashcards
        </button>
        <button
          onClick={() => setActiveTab('ask')}
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'ask' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Ask AI
        </button>
      </div>

      {activeTab === 'ai' ? (
        <AiLessonNotes
          courseId={courseId}
          sectionId={sectionId}
          lessonId={lessonId}
          onJumpToTimestamp={onJumpToTimestamp}
          onNoteAdded={loadNotes}
        />
      ) : activeTab === 'flashcards' ? (
        <AiFlashcards courseId={courseId} sectionId={sectionId} lessonId={lessonId} />
      ) : activeTab === 'ask' ? (
        <AiLessonQuestion
          courseId={courseId}
          sectionId={sectionId}
          lessonId={lessonId}
          currentTimestamp={currentTimestamp}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">My Notes</h3>
                <span className="text-sm text-gray-500">({notes.length})</span>
              </div>
              {!showAddNote && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Note
                </button>
              )}
            </div>

            {/* Search */}
            {notes.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Add/Edit Note Form */}
          {showAddNote && (
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your note here..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <Star className={`w-4 h-4 ${isImportant ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                  <span className="text-sm text-gray-700">Mark as important</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={editingNote ? handleUpdateNote : handleCreateNote}
                    disabled={saving || !noteContent.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : editingNote ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}          {/* Notes List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                Loading notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-10 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <StickyNote className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {searchTerm ? 'No notes found' : 'No notes yet'}
                </h3>
                <p className="text-xs text-gray-500 mb-6">
                  {searchTerm
                    ? 'Try searching with different keywords.'
                    : 'Create a personal note or generate an AI video summary preview and save it here.'}
                </p>
                {!searchTerm && !showAddNote && (
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Note
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 p-4">
                {filteredNotes.map((note) => {
                  const isSelected = selectedNote?._id === note._id;

                  return (
                    <div
                      key={note._id}
                      onClick={() => openNoteModal(note)}
                      className={`group relative flex flex-col justify-between gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:border-purple-300 text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-500'
                          : note.isImportant
                          ? 'border-yellow-200 bg-yellow-50/40 hover:bg-yellow-50/70'
                          : 'border-gray-200 bg-white hover:bg-gray-55'
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openNoteModal(note);
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                              {getNoteTitle(note)}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {note.isImportant && (
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                              {note.timestamp !== null && note.timestamp !== undefined && (
                                <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                                  <Clock className="w-3 h-3" />
                                  {formatTimestamp(note.timestamp)}
                                </div>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatNoteDate(note)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const response = await updateNote(note._id, {
                                    isImportant: !note.isImportant
                                  });
                                  if (response.success) {
                                    toast.success(note.isImportant ? 'Note unstarred' : 'Note starred!');
                                    loadNotes();
                                  }
                                } catch (error: any) {
                                  toast.error(error.message || 'Failed to toggle star');
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                note.isImportant 
                                  ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50' 
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                              }`}
                              title={note.isImportant ? 'Unstar Note' : 'Star Note'}
                              aria-label={note.isImportant ? 'Unstar Note' : 'Star Note'}
                            >
                              <Star className={`w-4 h-4 ${note.isImportant ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(note);
                              }}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Edit Note"
                              aria-label="Edit Note"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note._id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Note"
                              aria-label="Delete Note"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-gray-600 line-clamp-3 leading-relaxed break-words whitespace-pre-wrap">
                          {getNotePreview(note)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Note Modal */}
      {isNoteModalOpen && selectedNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={closeNoteModal}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[85vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
              {isEditingInModal ? (
                <div className="flex-1">
                  <label className="block text-xs font-bold text-purple-750 uppercase tracking-wider mb-1">
                    Note Title
                  </label>
                  <input
                    type="text"
                    value={modalEditTitle}
                    onChange={(e) => setModalEditTitle(e.target.value)}
                    placeholder="Note Title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                  <div className="flex items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={modalEditIsImportant}
                        onChange={(e) => setModalEditIsImportant(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <Star className={`w-4 h-4 ${modalEditIsImportant ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                      <span className="text-xs font-semibold text-gray-700">Mark as important</span>
                    </label>
                    {selectedNote.timestamp !== null && selectedNote.timestamp !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-indigo-650 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(selectedNote.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-w-0">
                  <h2
                    id="note-modal-title"
                    className="text-lg font-bold text-gray-900 leading-snug break-words"
                  >
                    {getNoteTitle(selectedNote)}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {selectedNote.isImportant && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    {selectedNote.timestamp !== null && selectedNote.timestamp !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(selectedNote.timestamp)}
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      {formatNoteDate(selectedNote)}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                onClick={closeNoteModal}
                aria-label="Close note"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
              {isEditingInModal ? (
                <div className="flex flex-col h-full min-h-[400px]">
                  <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">
                    Note Content
                  </label>
                  <textarea
                    value={modalEditContent}
                    onChange={(e) => setModalEditContent(e.target.value)}
                    placeholder="Write your note here..."
                    className="w-full p-4 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y font-normal leading-relaxed text-gray-750 h-[380px]"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                  {getNoteContent(selectedNote)}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
              {isEditingInModal ? (
                <>
                  <button
                    type="button"
                    disabled={modalSaving || !modalEditContent.trim()}
                    onClick={handleSaveModalEdit}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    {modalSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    disabled={modalSaving}
                    onClick={cancelModalEdit}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => startModalEdit(selectedNote)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    Edit Note
                  </button>
                  <button
                    type="button"
                    onClick={closeNoteModal}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 bg-white transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
