import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  Pin,
  CheckCircle2,
  Search,
  Plus,
  Tag,
  MessageCircle,
  Reply,
  ShieldAlert,
  Bot,
  ChevronDown,
  ArrowRight,
  PanelTopClose,
  Bell,
} from 'lucide-react';
import { PremiumCard, PremiumHero, PremiumPageShell } from './premium/PremiumPage';
import type { ForumCategory, ForumPost, ForumReply } from '../services/forumService';
import {
  addForumReply,
  aiSuggestReply,
  aiSummary,
  createForumPost,
  getForumPost,
  listForumPosts,
  toggleLike,
  togglePin,
  toggleSolved,
} from '../services/forumService';

type Props = {
  userRole: 'admin' | 'trainer' | 'participant';
};

type ReplyNode = {
  reply: ForumReply;
  children: ReplyNode[];
};

const categories: ForumCategory[] = ['general', 'course', 'lesson', 'assessment', 'technical', 'resource'];

const nameOf = (u: ForumPost['author'] | ForumReply['author'] | undefined | null) => {
  if (!u) return 'Unknown';
  const first = (u as any).firstName || '';
  const last = (u as any).lastName || '';
  const combined = `${first} ${last}`.trim();
  return combined || (u as any).email || 'User';
};

const buildReplyTree = (replies: ForumReply[]) => {
  const byId = new Map<string, ReplyNode>();
  const roots: ReplyNode[] = [];

  for (const r of replies) {
    byId.set(r._id, { reply: r, children: [] });
  }

  for (const r of replies) {
    const node = byId.get(r._id)!;
    if (r.parentReplyId) {
      const parentNode = byId.get(r.parentReplyId);
      if (parentNode) parentNode.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by createdAt
  const sortRecursive = (nodes: ReplyNode[]) => {
    nodes.sort((a, b) => +new Date(a.reply.createdAt) - +new Date(b.reply.createdAt));
    nodes.forEach((n) => sortRecursive(n.children));
  };
  sortRecursive(roots);

  return roots;
};

export function CommunityForum({ userRole }: Props) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [filters, setFilters] = useState<{ query: string; category: string; tag: string; status: string }>({
    query: '',
    category: 'all',
    tag: 'all',
    status: 'all',
  });

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const isModerator = userRole === 'trainer' || userRole === 'admin';

  const [createOpen, setCreateOpen] = useState(true);
  const [newPost, setNewPost] = useState<{
    title: string;
    body: string;
    category: ForumCategory;
    tags: string; // comma-separated
    courseId?: string | null;
  }>({
    title: '',
    body: '',
    category: 'general',
    tags: '',
    courseId: null,
  });

  const [replyForm, setReplyForm] = useState<{ parentReplyId: string | null; content: string }>({
    parentReplyId: null,
    content: '',
  });

  const [aiSummaryText, setAiSummaryText] = useState<string>('');
  const [aiSuggestionText, setAiSuggestionText] = useState<string>('');
  const [aiBusy, setAiBusy] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await listForumPosts({
        query: filters.query,
        category: filters.category,
        tag: filters.tag,
        limit: 20,
      });
      if (res.success) setPosts(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load forum posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetail = async (postId: string) => {
    setDetailLoading(true);
    setAiSummaryText('');
    setAiSuggestionText('');
    setReplyForm({ parentReplyId: null, content: '' });
    try {
      const res = await getForumPost(postId);
      if (res.success) {
        setSelectedPost(res.data.post);
        setReplies(res.data.replies || []);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load post');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // refetch when filters change
    const t = setTimeout(() => fetchPosts(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.category, filters.tag]);

  const replyTree = useMemo(() => buildReplyTree(replies), [replies]);

  const visiblePosts = useMemo(() => {
    if (filters.status === 'all') return posts;
    if (filters.status === 'pinned') return posts.filter((p) => p.pinned);
    if (filters.status === 'solved') return posts.filter((p) => p.solved);
    if (filters.status === 'unsolved') return posts.filter((p) => !p.solved);
    return posts;
  }, [posts, filters.status]);

  const handleCreatePost = async () => {
    const title = newPost.title.trim();
    const body = newPost.body.trim();
    if (!title || !body) {
      toast.error('Title and body are required');
      return;
    }
    const tags = newPost.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    try {
      const res = await createForumPost({
        courseId: newPost.courseId || null,
        title,
        body,
        category: newPost.category,
        tags,
      });
      if (res.success) {
        toast.success('Post created');
        setNewPost({ title: '', body: '', category: 'general', tags: '', courseId: null });
        await fetchPosts();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create post');
    }
  };

  const handleToggleLike = async () => {
    if (!selectedPost) return;
    try {
      const res = await toggleLike(selectedPost._id);
      if (res.success) setSelectedPost(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to like');
    }
  };

  const handleToggleSolved = async () => {
    if (!selectedPost) return;
    try {
      const res = await toggleSolved(selectedPost._id);
      if (res.success) setSelectedPost(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update solved status');
    }
  };

  const handleTogglePin = async () => {
    if (!selectedPost) return;
    try {
      const res = await togglePin(selectedPost._id);
      if (res.success) setSelectedPost(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update pinned status');
    }
  };

  const handleAddReply = async () => {
    if (!selectedPost) return;
    const content = replyForm.content.trim();
    if (!content) {
      toast.error('Write a reply first');
      return;
    }
    try {
      const res = await addForumReply(selectedPost._id, {
        content,
        parentReplyId: replyForm.parentReplyId,
      });
      if (res.success) {
        toast.success('Reply posted');
        await fetchPostDetail(selectedPost._id);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to post reply');
    }
  };

  const handleAiSummary = async () => {
    if (!selectedPost) return;
    setAiBusy(true);
    try {
      const res = await aiSummary(selectedPost._id);
      if (res.success) setAiSummaryText(res.data.summary);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'AI summary failed');
    } finally {
      setAiBusy(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!selectedPost) return;
    setAiBusy(true);
    try {
      const res = await aiSuggestReply(selectedPost._id, replyForm.content);
      if (res.success) setAiSuggestionText(res.data.suggestion);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'AI suggestion failed');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <PremiumPageShell>
      <PremiumHero
        title="Community Discussion Forum"
        subtitle="Ask questions, share resources, collaborate on nested threads, and use AI summaries and smart reply tools."
        eyebrow="Collaborative learning space"
        icon={MessageSquare}
        action={(
            <button
              onClick={() => setCreateOpen((o) => !o)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(79,70,229,.9)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <PanelTopClose className="w-4 h-4" />
              {createOpen ? 'Hide Composer' : 'Show Composer'}
            </button>
        )}
      />

      {/* Interactive Filters Grid */}
      <PremiumCard className="p-5 text-left border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={filters.query}
              onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold placeholder-slate-400 text-slate-700 transition-all"
              placeholder="Search posts, tags, keywords..."
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filters.category}
              onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
              title="Filter by category"
              aria-label="Filter by category"
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 transition-all appearance-none bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              title="Filter by status"
              aria-label="Filter by status"
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 transition-all appearance-none bg-white"
            >
              <option value="all">all</option>
              <option value="pinned">pinned</option>
              <option value="solved">solved</option>
              <option value="unsolved">unsolved</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </PremiumCard>

      {/* Create Post Form */}
      {createOpen && (
        <PremiumCard className="p-6 text-left space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">Compose New Discussion Thread</h3>
          </div>

          <div className="space-y-3">
            <input
              value={newPost.title}
              onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 placeholder-slate-400 transition-all"
              placeholder="Post title"
              maxLength={200}
            />
            <textarea
              value={newPost.body}
              onChange={(e) => setNewPost((p) => ({ ...p, body: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 placeholder-slate-400 min-h-[120px] resize-y transition-all"
              placeholder="Describe your question, idea, or problem in detail..."
              maxLength={10000}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={newPost.category}
                onChange={(e) => setNewPost((p) => ({ ...p, category: e.target.value as ForumCategory }))}
                title="Choose discussion category"
                aria-label="Choose discussion category"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 transition-all appearance-none bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    Category: {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>

              <input
                value={newPost.tags}
                onChange={(e) => setNewPost((p) => ({ ...p, tags: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 placeholder-slate-400 transition-all"
                placeholder="Tags (comma-separated, e.g. react, hooks)"
              />

              <button
                onClick={handleCreatePost}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all border border-indigo-500/30 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Publish Post
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/50 border border-amber-150 rounded-2xl px-4 py-3 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>AI content filter enabled: spam or toxic responses are automatically hidden or flagged.</span>
            </div>
          </div>
        </PremiumCard>
      )}

      {/* Main Grid: Left Posts list, Right details card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List Column */}
        <PremiumCard className="lg:col-span-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-extrabold text-slate-800 text-sm inline-flex items-center gap-1.5">
              Trending Discussions
            </h3>
            <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              View All Discussions
            </button>
          </div>

          <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-xs font-bold">Fetching recent updates...</p>
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold">No discussions launched yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click "Create New Post" to start.</p>
              </div>
            ) : (
              visiblePosts.map((p) => {
                const isSelected = selectedPostId === p._id;
                const authorName = nameOf(p.author);
                const initials = authorName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);

                return (
                  <button
                    key={p._id}
                    onClick={() => {
                      setSelectedPostId(p._id);
                      fetchPostDetail(p._id);
                    }}
                    className={`w-full text-left p-4 hover:bg-slate-50/50 transition-all relative ${isSelected ? 'bg-indigo-50/40 border-l-4 border-l-indigo-500 pl-3' : ''
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Monogram circular avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${isSelected ? 'bg-indigo-650 text-white' : 'bg-slate-100 text-slate-600 border border-slate-150'
                        }`}>
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-800 line-clamp-1 hover:text-indigo-600 transition-colors">
                          {p.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          <span className="text-indigo-600 font-black">{p.category}</span> • {authorName} • {new Date(p.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {p.pinned && <Pin className="w-3.5 h-3.5 text-indigo-500 rotate-45" />}
                        {p.solved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Tags row */}
                    {p.tags && p.tags.length > 0 && (
                      <div className="mt-2.5 flex gap-1.5 flex-wrap pl-11">
                        {p.tags.slice(0, 2).map((t) => (
                          <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 border border-slate-150 rounded text-[9px] font-bold text-slate-500">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Likes & views stats */}
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400 font-bold pl-11">
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                        {p.likes?.length || 0} Likes
                      </span>
                      <span>{p.viewCount || 0} Views</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PremiumCard>

        {/* Post Details & Replies Column */}
        <PremiumCard className="lg:col-span-2 overflow-hidden flex flex-col text-left">
          {!selectedPost || detailLoading ? (
            <div className="py-28 text-center text-slate-400 px-6">
              {detailLoading ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-550" />
                  <p className="text-sm font-extrabold text-slate-650">Synchronizing thread elements...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 via-indigo-100 to-cyan-100">
                    <MessageSquare className="w-9 h-9 text-indigo-500" />
                  </div>
                  <p className="text-base font-extrabold text-slate-700">Select a discussion thread</p>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">Choose a query card from the sidebar to review details, read expert summaries, and write replies.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Detailed Post Header Card */}
              <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-3xl space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-150 text-indigo-750 px-2.5 py-0.5 rounded">
                        {selectedPost.category}
                      </span>
                      {selectedPost.pinned && (
                        <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <Pin className="w-3 h-3 rotate-45" /> Pinned
                        </span>
                      )}
                      {selectedPost.solved && (
                        <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Solved
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-2 tracking-tight">{selectedPost.title}</h3>
                    <p className="text-sm text-slate-650 font-semibold mt-3 whitespace-pre-wrap leading-relaxed">{selectedPost.body}</p>

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-bold border-t border-slate-100/60 pt-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-650">
                        {nameOf(selectedPost.author).charAt(0)}
                      </div>
                      <span>
                        Posted by <span className="text-slate-700 font-extrabold">{nameOf(selectedPost.author)}</span> •{' '}
                        {new Date(selectedPost.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {selectedPost.tags && selectedPost.tags.length > 0 && (
                      <div className="mt-3.5 flex gap-1.5 flex-wrap">
                        {selectedPost.tags.map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-white border border-slate-150 rounded text-slate-500 font-bold">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleToggleLike}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ThumbsUp className="w-4 h-4 text-indigo-500" />
                      <span>Like ({selectedPost.likes?.length || 0})</span>
                    </button>

                    <button
                      onClick={handleAiSummary}
                      disabled={aiBusy}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/30"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{aiBusy ? 'Summarizing...' : 'AI Summary'}</span>
                    </button>

                    {isModerator && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleToggleSolved}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-[11px] font-bold text-slate-650 inline-flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{selectedPost.solved ? 'Unsolve' : 'Solve'}</span>
                        </button>
                        <button
                          onClick={handleTogglePin}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-[11px] font-bold text-slate-650 inline-flex items-center justify-center gap-1"
                        >
                          <Pin className="w-3.5 h-3.5 text-indigo-500 rotate-45" />
                          <span>{selectedPost.pinned ? 'Unpin' : 'Pin'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Summary Section */}
                {aiSummaryText && (
                  <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <p className="text-xs font-black text-indigo-850">Expert AI Summary</p>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-semibold">{aiSummaryText}</p>
                  </div>
                )}
              </div>

              {/* Reply Composer Area */}
              <div className="p-5 border border-slate-200/80 rounded-3xl bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-slate-800 text-sm">Thread Responses</h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-550">
                    {replies.length} Replies
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {replyForm.parentReplyId ? (
                    <span className="text-[10px] px-2.5 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-750 rounded-full inline-flex items-center gap-1.5 font-black">
                      <Reply className="w-3 h-3" /> Replying to nested comment
                    </span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-0.5 bg-slate-50 border border-slate-150 text-slate-500 rounded-full font-bold">
                      Replying to primary post
                    </span>
                  )}
                  {replyForm.parentReplyId && (
                    <button
                      onClick={() => setReplyForm({ parentReplyId: null, content: replyForm.content })}
                      className="text-[10px] font-black text-rose-500 hover:underline"
                    >
                      (Discard nest)
                    </button>
                  )}
                </div>

                <textarea
                  value={replyForm.content}
                  onChange={(e) => setReplyForm((p) => ({ ...p, content: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 placeholder-slate-450 min-h-[90px] resize-y transition-all"
                  placeholder="Write an expert response... (Or click below for AI suggestions)"
                  maxLength={5000}
                />

                {/* AI smart suggestion box */}
                {aiSuggestionText && (
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <p className="text-[11px] font-black text-slate-800">AI smart response recommendation</p>
                    </div>
                    <p className="text-xs text-slate-650 font-semibold leading-relaxed whitespace-pre-wrap">{aiSuggestionText}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setReplyForm((p) => ({ ...p, content: aiSuggestionText }))}
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Adopt Recommendation
                      </button>
                      <button
                        onClick={() => setAiSuggestionText('')}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleAiSuggest}
                    disabled={aiBusy}
                    className="px-4 py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Suggest Smart Response</span>
                  </button>

                  <button
                    onClick={handleAddReply}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all border border-indigo-500/30"
                  >
                    Post Response
                  </button>
                </div>
              </div>

              {/* Nested Reply Roster */}
              <div className="space-y-3 pt-4">
                {replyTree.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">No replies posted yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Be the first to share your input!</p>
                  </div>
                ) : (
                  replyTree.map((n) => (
                    <ReplyNodeView
                      key={n.reply._id}
                      node={n}
                      depth={0}
                      onReply={(parentId, contentSeed) => {
                        setReplyForm({ parentReplyId: parentId, content: contentSeed || '' });
                        setAiSuggestionText('');
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </PremiumCard>
      </section>

      {/* Floating AI Assistant */}
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-slate-900 px-4 py-3 text-left shadow-[0_16px_35px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.42)]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-[0_10px_20px_rgba(6,182,212,0.45)]">
          <Bot className="w-5 h-5" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">AI Assistant</span>
          <span className="block text-[11px] text-slate-300">Open chatbot</span>
        </span>
        <Bell className="w-4 h-4 text-slate-400" />
      </button>
    </PremiumPageShell>
  );
}

function ReplyNodeView({
  node,
  depth,
  onReply,
}: {
  node: ReplyNode;
  depth: number;
  onReply: (parentReplyId: string, contentSeed?: string) => void;
}) {
  const authorName = nameOf(node.reply.author);
  const initials = authorName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-2 text-left">
      <div className={`p-4 rounded-2xl border transition-all ${depth > 0
          ? 'bg-slate-50/50 border-slate-100 ml-6 sm:ml-8'
          : 'bg-white border-slate-150/70 shadow-sm'
        }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Round avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${depth > 0 ? 'bg-slate-200 text-slate-700' : 'bg-purple-100 text-purple-700'
              }`}>
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-400 font-bold">
                Response by <span className="text-slate-700 font-extrabold">{authorName}</span> •{' '}
                {new Date(node.reply.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-2 whitespace-pre-wrap leading-relaxed">
                {node.reply.content}
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => onReply(node.reply._id)}
              className="text-[10px] font-black px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-slate-650 transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((c) => (
            <ReplyNodeView key={c.reply._id} node={c} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

