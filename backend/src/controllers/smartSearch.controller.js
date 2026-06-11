import Course from '../models/Course.model.js';
import Enrollment from '../models/Enrollment.model.js';
import LessonNote from '../models/LessonNote.model.js';
import CourseQuery from '../models/CourseQuery.model.js';
import Assessment from '../models/Assessment.model.js';
import AiLessonNote from '../models/AiLessonNote.model.js';
import AiFlashcardDeck from '../models/AiFlashcardDeck.model.js';
import Media from '../models/Media.model.js';
import Certificate from '../models/Certificate.model.js';
import User from '../models/User.model.js';
import LiveSession from '../models/LiveSession.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { callAiService, logAiUsage } from '../services/aiGateway.service.js';

// ─── Text utilities ────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the','and','a','an','to','of','in','for','with','on','as','is','are','was',
  'were','be','by','at','or','from','that','this','it','will','can','could',
  'should','may','might','not','but','if','then','than','so','we','you','they',
  'i','your','our','their','them','us','into','about','how','what','when',
  'where','which','who','whom','whose','get','give','show','tell',
]);

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractKeywords = (query, limit = 10) => {
  const clean = normalize(query);
  if (!clean) return [];
  const tokens = clean
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && t.length <= 24 && !STOPWORDS.has(t));
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, limit);
};

const scoreText = (text, keywords) => {
  if (!text) return 0;
  const t = normalize(text);
  if (!t) return 0;
  let score = 0;
  for (const kw of keywords) {
    if (t.includes(kw)) score += 3;
  }
  score += Math.min(1.5, keywords.length ? score * 0.05 : 0);
  return score;
};

const buildRegexForKeywords = (keywords) => {
  if (!keywords.length) return null;
  return new RegExp(keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
};

// ─── Aggregate Intent Patterns ─────────────────────────────────────────────
const AGGREGATE_PATTERNS = [
  { keys: ['STUDENT_COUNT'],      patterns: [/\b(student|learner|participant)s?\s*(count|number|total|how many|registered|enrolled)\b/i, /\b(number|total|how many)\s*(of\s*)?(student|learner|participant)s?\b/i] },
  { keys: ['TRAINER_COUNT'],      patterns: [/\b(trainer|teacher|instructor|faculty)s?\s*(count|number|total|how many)\b/i, /\b(number|total|how many)\s*(of\s*)?(trainer|teacher|instructor|faculty)s?\b/i] },
  { keys: ['COURSE_COUNT'],       patterns: [/\b(course|class|module)s?\s*(count|number|total|how many|active)\b/i, /\b(number|total|how many)\s*(of\s*)?(active\s*)?(course|class|module)s?\b/i] },
  { keys: ['PENDING_APPROVALS'],  patterns: [/\b(pending|unapproved|not approved)\s*(user|approval|student|trainer)s?\b/i, /\b(user|approval)s?\s*(pending|waiting|not approved)\b/i] },
  { keys: ['CERTIFICATE_COUNT'],  patterns: [/\b(certificate|cert|diploma|degree)s?\s*(count|number|total|issued|how many)\b/i, /\b(number|total|how many)\s*(of\s*)?(issued\s*)?(certificate|cert|diploma|degree)s?\b/i] },
  { keys: ['LIVE_SESSION_COUNT'], patterns: [/\b(live.?session|webinar|class)s?\s*(count|number|total|scheduled|how many)\b/i] },
];

const detectAggregateKey = (query) => {
  for (const { keys, patterns } of AGGREGATE_PATTERNS) {
    if (patterns.some((p) => p.test(query))) return keys[0];
  }
  return null;
};

// ─── Special Feature Intent Detection ──────────────────────────────────────
const FEATURE_INTENTS = [
  { key: 'aiTutor', label: 'AI Tutor', desc: 'Ask questions, clear doubts, or get study assistance from our smart AI Tutor bot.', action: 'Open AI Tutor', page: 'ai-tutor', patterns: [/\b(ai\s*tutor|ai\s*chat|chat\s*with\s*ai|ask\s*tutor|tutor\s*bot|bot|chatbot)\b/i] },
  { key: 'byteLearning', label: 'Byte Learning', desc: 'Improve memory retention with byte-sized micro-lessons and daily AI flashcards.', action: 'Start Practice', page: 'byte-size-learning', patterns: [/\b(byte\s*learning|micro\s*learning|daily\s*byte|byte\s*size|practice\s*byte|flashcard|card)s?\b/i] },
  { key: 'liveSessions', label: 'Live Sessions', desc: 'Attend interactive live webinars, virtual classrooms, and Q&A sessions with trainers.', action: 'View Calendar', page: 'live-sessions', patterns: [/\b(live\s*session|webinar|class|virtual\s*classroom)s?\b/i] },
];

const detectFeatureIntent = (query) => {
  for (const f of FEATURE_INTENTS) {
    if (f.patterns.some((p) => p.test(query))) {
      return {
        key: f.key,
        label: f.label,
        description: f.desc,
        actionLabel: f.action,
        page: f.page,
      };
    }
  }
  return null;
};

// ─── Run Aggregates ────────────────────────────────────────────────────────
const runAggregates = async (aggKey, userRole) => {
  // Only admin can see cross-user counts
  if (userRole !== 'administrator') return null;
  try {
    switch (aggKey) {
      case 'STUDENT_COUNT':      return { label: 'Total Students',       count: await User.countDocuments({ role: 'student' }),       icon: 'Users' };
      case 'TRAINER_COUNT':      return { label: 'Total Trainers',       count: await User.countDocuments({ role: 'trainer' }),       icon: 'GraduationCap' };
      case 'COURSE_COUNT':       return { label: 'Active Courses',       count: await Course.countDocuments({ status: 'active' }),    icon: 'BookOpen' };
      case 'PENDING_APPROVALS':  return { label: 'Pending Approvals',    count: await User.countDocuments({ isApproved: false }),     icon: 'Clock' };
      case 'CERTIFICATE_COUNT':  return { label: 'Certificates Issued',  count: await Certificate.countDocuments({}),                icon: 'Award' };
      case 'LIVE_SESSION_COUNT': return { label: 'Scheduled Live Sessions', count: await LiveSession.countDocuments({}),             icon: 'Video' };
      default:                   return null;
    }
  } catch {
    return null;
  }
};

// ─── INTENT WEIGHT MAP ─────────────────────────────────────────────────────
const INTENT_WEIGHT = 1.5; // Boost factor for primary-intent category


// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export const smartSearch = asyncHandler(async (req, res) => {
  const { query, filters = {}, limit = 6 } = req.body || {};
  const role = req.user?.role;          // 'student' | 'trainer' | 'administrator'
  const userId = req.user?._id;

  const getSuggestionsForRole = (r) => {
    if (r === 'student') {
      return [
        { label: "how to play course lectures", description: "Learn how to access course contents and play lecture videos", icon: "BookOpen" },
        { label: "give a quick quiz on cooperatives", description: "Take a practice assessment to test your knowledge", icon: "Brain" },
        { label: "ai tutor chat for study help", description: "Ask the AI tutor questions, clarify concepts, or request examples", icon: "Bot" },
        { label: "flashcard practice session", description: "Study micro-lessons and boost key concept recall", icon: "Zap" },
        { label: "download my learning certificates", description: "Access and print your earned certificates", icon: "Award" },
        { label: "show upcoming live webinars this week", description: "Check scheduled live sessions with trainers", icon: "Video" }
      ];
    }
    if (r === 'trainer') {
      return [
        { label: "how many students are enrolled", description: "Check registration and enrollment numbers for your courses", icon: "Users" },
        { label: "create a new quiz assessment", description: "Build automated quizzes and practice tests for students", icon: "Brain" },
        { label: "scheduled live sessions and webinars", description: "View or set up upcoming interactive classrooms", icon: "Video" },
        { label: "edit my active courses and lessons", description: "Update course descriptions, lessons, and content outline", icon: "Edit3" },
        { label: "view student quiz submissions and grades", description: "Monitor quiz attempts, grades, and average scores", icon: "BarChart2" },
        { label: "pending student questions in forum", description: "Answer student doubts and participate in forum threads", icon: "MessageSquare" }
      ];
    }
    // Administrator
    return [
      { label: "pending user registration approvals", description: "Approve new users, students, or trainers to the platform", icon: "UserCheck" },
      { label: "view platform active user list", description: "Browse all users, change roles, or manage accounts", icon: "Users" },
      { label: "how many certificates have been issued", description: "Audit certificates issued to students across all courses", icon: "Award" },
      { label: "manage trainer assignments", description: "Assign or modify instructors for active courses", icon: "GraduationCap" },
      { label: "audit system logs and AI usage metrics", description: "Track NVIDIA API token usage and latency diagnostics", icon: "Clock" },
      { label: "list all active courses on the platform", description: "See the catalog of courses, public registry, and status", icon: "BookOpen" }
    ];
  };

  const getTrendingForRole = (r) => {
    if (r === 'student') {
      return [
        { label: "Cooperative Law & Principles", reason: "Popular course content this week", category: "Courses" },
        { label: "Active Recall Flashcards", reason: "Highly used study method", category: "Flashcards" },
        { label: "Passing Criteria for Assessments", reason: "Frequently searched question", category: "Quizzes" },
        { label: "Video Lecture Summaries", reason: "Saved AI revision notes", category: "AI Notes" },
        { label: "Discussion Board Q&A", reason: "Active community chat", category: "Forum" }
      ];
    }
    if (r === 'trainer') {
      return [
        { label: "Student Completion Analytics", reason: "Key teaching performance indicator", category: "Analytics" },
        { label: "Live Webinar Class Scheduling", reason: "High volume of scheduled sessions", category: "Live Sessions" },
        { label: "Quiz Performance Reports", reason: "Review recent grade spreads", category: "Quizzes" },
        { label: "Curriculum Update Requests", reason: "Active course syllabus editing", category: "Courses" },
        { label: "Active Peer Discussions", reason: "High forum engagement", category: "Forum" }
      ];
    }
    // Administrator
    return [
      { label: "Pending Approvals Registry", reason: "Required admin task", category: "Users" },
      { label: "System Token Consumption", reason: "Track AI service credits", category: "System" },
      { label: "Trainer Load Assignments", reason: "Update instructor course loads", category: "Courses" },
      { label: "Issued Certificates Audit", reason: "Credentials verification", category: "Certificates" },
      { label: "User Role Modifications", reason: "Security auditing", category: "Users" }
    ];
  };

  const emptyResponse = () => res.status(200).json({
    success: true,
    data: {
      query: '',
      suggestions: getSuggestionsForRole(role),
      trending: getTrendingForRole(role),
      aggregates: null,
      intentCategory: null,
      results: {
        courses: [], lessons: [], notes: [], discussions: [],
        aiNotes: [], flashcards: [], quizzes: [], media: [],
        certificates: [], liveSessions: [], users: [],
      },
    },
  });

  if (!query || !String(query).trim()) return emptyResponse();

  const start = Date.now();
  let q = String(query).trim();
  let originalQuery = q;

  // ── 1. AI: Auto-Correction + Keyword Expansion + Intent Detection + RAG AI Answer ──
  let expandedKeywords = [];
  let intentCategory = null;
  let isAggregateQuery = false;
  let aggregateKey = detectAggregateKey(q);   // fast local pattern check first
  let aiAnswer = '';

  try {
    const [expandResp, ragResp] = await Promise.all([
      // Expand semantics, detect intent and correct spelling typos
      callAiService({
        endpoint: '/v1/search/expand',
        payload: { query: q },
      }).catch(() => null),

      // RAG AI Answer in parallel
      callAiService({
        endpoint: '/v1/search/rag',
        payload: { query: q, context: [] },
      }).catch(() => null),
    ]);

    // Apply auto-correction and expansion
    if (expandResp?.success && expandResp.data) {
      const d = expandResp.data;
      if (d.corrected_query) {
        const corrected = d.corrected_query.trim();
        if (corrected && corrected.toLowerCase() !== q.toLowerCase() && corrected.split(' ').length <= q.split(' ').length + 1) {
          q = corrected;
        }
      }
      if (Array.isArray(d.expanded_keywords)) expandedKeywords = d.expanded_keywords.map(String);
      if (d.primary_intent_category)         intentCategory = d.primary_intent_category;
      if (d.is_aggregate_query)              isAggregateQuery = true;
      if (d.aggregate_key && !aggregateKey)  aggregateKey = d.aggregate_key;
    }

    // Apply RAG Answer
    if (ragResp?.success && ragResp.answer) {
      aiAnswer = ragResp.answer;
    }
  } catch { /* silent – run with base query */ }

  // ── 2. Keyword Merging: base + AI-expanded ─────────────────────────────
  const baseKeywords = extractKeywords(q, 10);
  // Deduplicate and cap total to 15
  const allKeywords = [...new Set([...baseKeywords, ...expandedKeywords.map(normalize).filter(Boolean)])].slice(0, 15);
  const keywordRegex = buildRegexForKeywords(allKeywords) || new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  // ── 3. Real-Time Aggregates (admin only) ────────────────────────────────
  const aggregates = aggregateKey ? await runAggregates(aggregateKey, role) : null;

  // ── 4. RBAC-filtered Course Discovery ────────────────────────────────────
  let courseIds = [];
  if (role === 'student') {
    const enrollments = await Enrollment.find({ user: userId }).select('course').lean();
    courseIds = enrollments.map((e) => e.course).filter(Boolean);
  }

  let trainerCourseIds = [];
  if (role === 'trainer') {
    const trainerCourses = await Course.find({ instructor: userId }).select('_id').lean();
    trainerCourseIds = trainerCourses.map((c) => c._id);
  }

  const approvedPublicCourseFilter = {
    visibility: 'public',
    status: 'active',
    isPublished: true,
    $or: [{ reviewStatus: 'published' }, { reviewStatus: { $exists: false } }],
  };
  const courseDiscoveryFilter =
    role === 'student'
      ? { $or: [{ _id: { $in: courseIds } }, approvedPublicCourseFilter] }
      : role === 'trainer'
      ? { instructor: userId }
      : {};                        // admin: unrestricted

  const courseRegex = keywordRegex;

  // ── 5. Parallel DB + Vector Search ───────────────────────────────────────
  const [
    dbCourses,
    dbNotes,
    dbAiNotes,
    dbFlashDecks,
    dbDiscussions,
    dbQuizzes,
    dbMedia,
    dbCertificates,
    dbLiveSessions,
    dbUsers,
    vectorResults,
  ] = await Promise.all([

    // Courses
    Course.find({
      $and: [
        courseDiscoveryFilter,
        {
          $or: [
            { title: courseRegex },
            { description: courseRegex },
            { tags: courseRegex },
            { 'sections.lessons.title': courseRegex },
            { 'sections.lessons.content': courseRegex },
          ],
        },
      ],
    }).select('title description tags sections _id').limit(15).lean(),

    // Personal Notes – always scoped to current user
    LessonNote.find({
      student: userId,
      content: { $regex: q, $options: 'i' },
    }).populate('course', 'title').sort({ createdAt: -1 }).limit(10).lean(),

    // AI Notes – always scoped to current user
    AiLessonNote.find({
      student: userId,
      $or: [
        { 'generated.summary': { $regex: q, $options: 'i' } },
        { 'generated.revisionMaterial': { $regex: q, $options: 'i' } },
        { lesson: { $regex: q, $options: 'i' } },
      ],
    }).limit(10).lean(),

    // Flashcards – always scoped to current user
    AiFlashcardDeck.find({
      student: userId,
      cards: {
        $elemMatch: {
          $or: [
            { front: { $regex: q, $options: 'i' } },
            { back: { $regex: q, $options: 'i' } },
          ],
        },
      },
    }).limit(10).lean(),

    // Discussions – public or own; for trainer also show course-related
    role === 'student'
      ? CourseQuery.find({
          $or: [{ student: userId }, { isPublic: true }],
          question: { $regex: q, $options: 'i' },
        }).populate('course', 'title').limit(10).lean()
      : role === 'trainer'
      ? CourseQuery.find({
          $or: [
            { course: { $in: trainerCourseIds } },
            { student: userId },
            { isPublic: true },
          ],
          question: { $regex: q, $options: 'i' },
        }).populate('course', 'title').limit(10).lean()
      : CourseQuery.find({ question: { $regex: q, $options: 'i' } })
          .populate('course', 'title').limit(10).lean(),

    // Quizzes/Assessments
    role === 'student'
      ? Assessment.find({
          $or: [
            { course: { $in: courseIds } },
            { course: { $in: courseIds.map(String) } },
            { courseRef: { $in: courseIds } }
          ],
          $and: [
            { $or: [{ title: courseRegex }, { 'questions.questionText': { $regex: q, $options: 'i' } }] }
          ]
        }).limit(10).lean()
      : role === 'trainer'
      ? Assessment.find({
          $or: [
            { course: { $in: trainerCourseIds } },
            { course: { $in: trainerCourseIds.map(String) } },
            { courseRef: { $in: trainerCourseIds } }
          ],
          $and: [
            { $or: [{ title: courseRegex }, { 'questions.questionText': { $regex: q, $options: 'i' } }] }
          ]
        }).limit(10).lean()
      : Assessment.find({
          $or: [{ title: courseRegex }, { 'questions.questionText': { $regex: q, $options: 'i' } }],
        }).limit(10).lean(),

    // Media – global for all (admin full, others public)
    Media.find({
      $or: [{ title: courseRegex }, { description: courseRegex }, { tags: courseRegex }],
    }).limit(10).lean(),

    // Certificates
    role === 'student'
      ? Certificate.find({
          $or: [
            { 'metadata.studentId': userId },
            { certificateId: { $regex: q, $options: 'i' } },
            { 'metadata.courseName': { $regex: q, $options: 'i' } },
          ],
        }).limit(10).lean()
      : Certificate.find({
          $or: [
            { certificateId: { $regex: q, $options: 'i' } },
            { 'metadata.courseName': { $regex: q, $options: 'i' } },
            { 'metadata.studentName': { $regex: q, $options: 'i' } },
          ],
        }).limit(10).lean(),

    // Live Sessions
    LiveSession.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
    }).limit(10).lean(),

    // Users – admin: all; trainer: enrolled students; student: hidden (returns [])
    role === 'administrator'
      ? User.find({
          $or: [
            { firstName: { $regex: q, $options: 'i' } },
            { lastName: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        }).select('firstName lastName email role isApproved status').limit(10).lean()
      : role === 'trainer'
      ? User.find({
          role: 'student',
          _id: {
            $in: (
              await Enrollment.find({ course: { $in: trainerCourseIds } }).select('user').lean()
            ).map((e) => e.user),
          },
          $or: [
            { firstName: { $regex: q, $options: 'i' } },
            { lastName: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        }).select('firstName lastName email role').limit(10).lean()
      : [],   // student cannot see users

    // Vector Semantic Search
    callAiService({
      endpoint: '/v1/search/vector',
      payload: { query: q, top_k: 15, threshold: 0.1 },
    }).catch(() => ({ success: false, results: [] })),
  ]);

  // ── 6. Process Vector Results ─────────────────────────────────────────
  const vectorDocs = vectorResults?.success && Array.isArray(vectorResults.results) ? vectorResults.results : [];

  // Broaden type matching – indexer may use 'course' OR 'courses' etc.
  const typeMatch = (doc, ...types) => types.some(t => doc.metadata?.type === t);
  const vectorCourses     = vectorDocs.filter((d) => typeMatch(d, 'course', 'courses'));
  const vectorLessons     = vectorDocs.filter((d) => typeMatch(d, 'lesson', 'lessons'));
  const vectorAiNotes     = vectorDocs.filter((d) => typeMatch(d, 'ai_note', 'ai_notes', 'ainote'));
  const vectorDiscussions = vectorDocs.filter((d) => typeMatch(d, 'discussion', 'discussions', 'query'));
  const vectorAssessments = vectorDocs.filter((d) => typeMatch(d, 'assessment', 'assessments', 'quiz'));

  // ── 7. Hydrate Missing Semantic Documents ────────────────────────────
  const hydrateIds = async (vectorItems, existing, Model, filterFn, idField = '_id') => {
    const existSet = new Set(existing.map((c) => String(c[idField] || c._id)));
    const missing  = vectorItems.map((d) => d.metadata?.id).filter(Boolean).filter((id) => !existSet.has(id));
    if (!missing.length) return;
    try {
      const fetched = await Model.find({ _id: { $in: missing }, ...filterFn() }).lean();
      existing.push(...fetched);
    } catch {}
  };

  await Promise.all([
    hydrateIds(vectorCourses,     dbCourses,      Course,      () => courseDiscoveryFilter),
    hydrateIds(vectorAiNotes,     dbAiNotes,      AiLessonNote, () => ({ student: userId })),
    hydrateIds(vectorDiscussions, dbDiscussions,  CourseQuery,  () => role === 'student' ? { $or: [{ student: userId }, { isPublic: true }] } : {}),
    hydrateIds(vectorAssessments, dbQuizzes,      Assessment,   () => role === 'student' ? { course: { $in: courseIds } } : role === 'trainer' ? { course: { $in: trainerCourseIds } } : {}),
  ]);

  // Also hydrate courses needed for semantic lessons
  const lessonCourseIds = vectorLessons.map((d) => d.metadata?.courseId).filter(Boolean);
  const existCourseIdSet = new Set(dbCourses.map((c) => String(c._id)));
  const missingLessonCourseIds = lessonCourseIds.filter((id) => !existCourseIdSet.has(id));
  if (missingLessonCourseIds.length) {
    try {
      const extra = await Course.find({ _id: { $in: missingLessonCourseIds }, ...courseDiscoveryFilter }).select('title description tags sections _id').lean();
      dbCourses.push(...extra);
    } catch {}
  }

  // ── 8a. Intent-Category Fallback ─────────────────────────────────────
  // If intentCategory detected but DB returned nothing, do a broad fetch
  // so the user always sees *something* relevant.
  const INTENT_FALLBACK_LIMIT = 6;
  if (intentCategory === 'courses' && dbCourses.length === 0) {
    try {
      const fallback = await Course.find({ $and: [courseDiscoveryFilter, { status: 'active' }] })
        .select('title description tags sections _id').limit(INTENT_FALLBACK_LIMIT).lean();
      dbCourses.push(...fallback);
    } catch {}
  }
  if (intentCategory === 'quizzes' && dbQuizzes.length === 0) {
    try {
      const fallback = await Assessment.find(
        role === 'student'
          ? {
              $or: [
                { course: { $in: courseIds } },
                { course: { $in: courseIds.map(String) } },
                { courseRef: { $in: courseIds } }
              ]
            }
          : role === 'trainer'
          ? {
              $or: [
                { course: { $in: trainerCourseIds } },
                { course: { $in: trainerCourseIds.map(String) } },
                { courseRef: { $in: trainerCourseIds } }
              ]
            }
          : {}
      ).limit(INTENT_FALLBACK_LIMIT).lean();
      dbQuizzes.push(...fallback);
    } catch {}
  }
  if (intentCategory === 'certificates' && dbCertificates.length === 0) {
    try {
      const fallback = await Certificate.find(
        role === 'student' ? { 'metadata.studentId': userId } : {}
      ).limit(INTENT_FALLBACK_LIMIT).lean();
      dbCertificates.push(...fallback);
    } catch {}
  }
  if (intentCategory === 'liveSessions' && dbLiveSessions.length === 0) {
    try {
      const fallback = await LiveSession.find({}).limit(INTENT_FALLBACK_LIMIT).lean();
      dbLiveSessions.push(...fallback);
    } catch {}
  }
  if (intentCategory === 'discussions' && dbDiscussions.length === 0) {
    try {
      const fallback = await CourseQuery.find(
        role === 'student' ? { $or: [{ student: userId }, { isPublic: true }] } : {}
      ).populate('course', 'title').limit(INTENT_FALLBACK_LIMIT).lean();
      dbDiscussions.push(...fallback);
    } catch {}
  }

  // ── 8. Scoring with Intent Weight Boost ──────────────────────────────

  const intentBoost = (category) => (intentCategory && intentCategory === category ? INTENT_WEIGHT : 1);

  const scoredCourses = dbCourses.map((c) => {
    const lex    = scoreText(`${c.title} ${c.description} ${(c.tags || []).join(' ')}`, allKeywords);
    const vecM   = vectorCourses.find((v) => String(v.metadata?.id) === String(c._id));
    const vec    = vecM ? vecM.score * 10 : 0;
    return { courseId: c._id, title: c.title, description: c.description, tags: c.tags, score: (lex + vec) * intentBoost('courses') };
  }).sort((a, b) => b.score - a.score);

  const lessons = [];
  for (const c of dbCourses) {
    for (const sec of c.sections || []) {
      for (const l of sec.lessons || []) {
        const lex  = scoreText(`${l.title} ${l.content}`, allKeywords);
        const vecM = vectorLessons.find((v) => String(v.metadata?.id) === String(l._id));
        const vec  = vecM ? vecM.score * 10 : 0;
        const total = (lex + vec) * intentBoost('lessons');
        // Include all lessons (score 0+ allowed — user browsing course content)
        lessons.push({ lessonId: l._id, title: l.title, courseTitle: c.title, courseId: c._id, type: l.type, score: total });
      }
    }
  }
  lessons.sort((a, b) => b.score - a.score);

  const scoredAiNotes = dbAiNotes.map((n) => {
    const lex  = scoreText(`${n.lesson} ${n.generated?.summary}`, allKeywords);
    const vecM = vectorAiNotes.find((v) => String(v.metadata?.id) === String(n._id));
    const vec  = vecM ? vecM.score * 10 : 0;
    return { ...n, score: (lex + vec) * intentBoost('aiNotes') };
  }).sort((a, b) => b.score - a.score);

  const scoredDiscussions = dbDiscussions.map((d) => {
    const lex  = scoreText(d.question, allKeywords);
    const vecM = vectorDiscussions.find((v) => String(v.metadata?.id) === String(d._id));
    const vec  = vecM ? vecM.score * 10 : 0;
    return { ...d, score: (lex + vec) * intentBoost('discussions') };
  }).sort((a, b) => b.score - a.score);

  const scoredQuizzes = dbQuizzes.map((q2) => {
    const lex  = scoreText(q2.title, allKeywords);
    const vecM = vectorAssessments.find((v) => String(v.metadata?.id) === String(q2._id));
    const vec  = vecM ? vecM.score * 10 : 0;
    return { ...q2, score: (lex + vec) * intentBoost('quizzes') };
  }).sort((a, b) => b.score - a.score);

  const mediaResults = dbMedia.map((m) => ({
    mediaId: m._id, title: m.title, type: m.type, url: m.url,
    score: scoreText(`${m.title} ${m.description}`, allKeywords) * intentBoost('media'),
  })).sort((a, b) => b.score - a.score);

  const certResults = dbCertificates.map((c) => ({
    ...c,
    score: scoreText(`${c.certificateId} ${c.metadata?.courseName} ${c.metadata?.studentName}`, allKeywords) * intentBoost('certificates'),
  })).sort((a, b) => b.score - a.score);

  // Extract and score individual flashcards from decks
  const scoredFlashcards = [];
  for (const deck of dbFlashDecks) {
    for (const card of deck.cards || []) {
      const match =
        card.front?.toLowerCase().includes(q.toLowerCase()) ||
        card.back?.toLowerCase().includes(q.toLowerCase());
      if (match || allKeywords.some((kw) => card.front?.toLowerCase().includes(kw) || card.back?.toLowerCase().includes(kw))) {
        scoredFlashcards.push({
          ...card,
          _id: card._id || deck._id,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty,
          deckId: deck._id,
          course: deck.course,
          section: deck.section,
          lesson: deck.lesson,
          score: scoreText(`${card.front} ${card.back}`, allKeywords) * intentBoost('flashcards'),
        });
      }
    }
  }
  scoredFlashcards.sort((a, b) => b.score - a.score);

  // Score live sessions
  const scoredLiveSessions = dbLiveSessions.map((s) => ({
    ...s,
    title: s.title,
    description: s.description,
    score: scoreText(`${s.title} ${s.description}`, allKeywords) * intentBoost('liveSessions'),
  })).sort((a, b) => b.score - a.score);

  // ── 9. RAG AI Answer ──────────────────────────────────────────────────
  // Resolved in Phase 1 (aiAnswer)

  // ── 10. Suggestions & Trending ────────────────────────────────────────
  const suggestions = getSuggestionsForRole(role);
  const trending = getTrendingForRole(role);

  // ── 11. Final Response ────────────────────────────────────────────────
  res.status(200).json({
    success: true,
    data: {
      query: q,
      originalQuery,
      aiAnswer,
      suggestions,
      trending,
      aggregates,          // null | { label, count, icon }
      intentCategory,      // e.g. "certificates"
      featureIntent: detectFeatureIntent(q), // Special feature quick-action
      expandedKeywords,    // for frontend debugging / display
      results: {
        courses:      scoredCourses.slice(0, limit),
        lessons:      lessons.slice(0, limit),
        notes:        dbNotes.slice(0, limit),
        discussions:  scoredDiscussions.slice(0, limit),
        aiNotes:      scoredAiNotes.slice(0, limit),
        flashcards:   scoredFlashcards.slice(0, limit),
        quizzes:      scoredQuizzes.slice(0, limit),
        media:        mediaResults.slice(0, limit),
        certificates: certResults.slice(0, limit),
        liveSessions: scoredLiveSessions.slice(0, limit),
        users:        dbUsers.slice(0, limit),         // [] for students
      },
      meta: {
        latencyMs:     Date.now() - start,
        semanticMatch: vectorDocs.length,
        role,
        keywordsUsed:  allKeywords,
      },
    },
  });
});
