import MicroLesson from '../models/MicroLesson.model.js';
import { callAiService } from './aiGateway.service.js';

// This service analyzes content and generates micro-lessons using the AI server
const BYTE_LEARNING_AI_TIMEOUT_MS = Number(process.env.BYTE_LEARNING_AI_TIMEOUT_MS || 90000);
const BYTE_LEARNING_AI_RETRIES = Number(process.env.BYTE_LEARNING_AI_RETRIES || 0);

function normalizeGeneratedBytes(aiResponse) {
  if (!aiResponse) return [];

  if (Array.isArray(aiResponse)) return aiResponse;
  if (Array.isArray(aiResponse.bytes)) return aiResponse.bytes;
  if (Array.isArray(aiResponse.microLessons)) return aiResponse.microLessons;
  if (Array.isArray(aiResponse.lessons)) return aiResponse.lessons;
  if (Array.isArray(aiResponse.generatedBytes)) return aiResponse.generatedBytes;
  if (Array.isArray(aiResponse.data?.bytes)) return aiResponse.data.bytes;
  if (Array.isArray(aiResponse.data?.microLessons)) return aiResponse.data.microLessons;
  if (Array.isArray(aiResponse.result?.bytes)) return aiResponse.result.bytes;

  return [];
}

class AIContentAnalyzer {
  constructor() {
    this.defaultXPPeward = 10;
    this.minDuration = 2; // minutes
    this.maxDuration = 5; // minutes
  }

  // Main entry point - analyze content and generate micro-lessons
  async analyzeContent(courseId, content, options = {}) {
    try {
      console.log(`[AIContentAnalyzer] Generating micro-learning bytes for course: ${courseId}`);
      const response = await callAiService({
        endpoint: '/v1/byte-learning/generate',
        payload: {
          courseId,
          content,
          difficulty: options.difficulty || 'medium',
          targetLanguage: options.targetLanguage || 'en',
          mode: options.mode || 'auto'
        },
        timeout: BYTE_LEARNING_AI_TIMEOUT_MS,
        retries: BYTE_LEARNING_AI_RETRIES,
        includeFallbackUrls: false,
      });

      const keys = response ? Object.keys(response) : [];
      const rawBytes = normalizeGeneratedBytes(response);
      console.log(`[ByteLearning] AI response received { keys: ${JSON.stringify(keys)}, byteCount: ${rawBytes.length} }`);
      if (!rawBytes || rawBytes.length === 0) {
        const err = new Error('AI generation succeeded but no byte array found in AI response.');
        err.noFallback = true;
        throw err;
      }
      if (false) { // remove
        // removed
      }



      // Group/Map them to MicroLesson schema structure
      const microLessons = rawBytes.map((byte, index) => {
        // Map difficulty values
        let difficulty = 'intermediate';
        if (byte.difficulty === 'easy' || byte.difficulty === 'beginner') {
          difficulty = 'beginner';
        } else if (byte.difficulty === 'hard' || byte.difficulty === 'advanced') {
          difficulty = 'advanced';
        }

        // Map quiz questions ensuring correctAnswer is a 0-indexed integer
        const questions = (byte.quiz || []).map(q => {
          let correctAnswer = 0;
          if (typeof q.correctAnswer === 'number') {
            correctAnswer = q.correctAnswer;
          } else if (typeof q.correctAnswer === 'string') {
            const charCode = q.correctAnswer.trim().toUpperCase().charCodeAt(0);
            if (charCode >= 65 && charCode <= 68) {
              correctAnswer = charCode - 65; // A=0, B=1, C=2, D=3
            } else {
              const parsed = parseInt(q.correctAnswer, 10);
              if (!isNaN(parsed)) correctAnswer = parsed;
            }
          }
          return {
            question: q.question || 'Review Question',
            options: q.options || ['True', 'False'],
            correctAnswer: correctAnswer,
            explanation: q.explanation || 'See lesson content for detail.'
          };
        });

        // Map flashcards
        const flashcards = (byte.flashcards || []).map(f => ({
          front: f.front || 'Question',
          back: f.back || 'Answer',
          topic: f.topic || 'General'
        }));

        // Map key takeaways
        const keyTakeaways = byte.keyPoints || [byte.learningObjective || 'Understand this concept.'];

        // Map interview questions
        const interviewQuestions = (byte.flashcards || []).slice(0, 3).map((f, i) => ({
          question: `Can you explain: ${f.front}?`,
          answer: f.back,
          difficulty: i === 0 ? 'easy' : i === 1 ? 'medium' : 'hard'
        }));

        const duration = byte.estimatedMinutes || 3;
        const videoStartTime = options.sourceVideoUrl ? index * duration * 60 : 0;

        return {
          course: courseId,
          section: options.section || 'General Bytes',
          order: index + 1,
          title: byte.title || `Byte Lesson ${index + 1}`,
          description: byte.description || byte.learningObjective || 'Micro-learning byte.',
          content: byte.content || 'Content description.',
          contentType: options.sourceVideoUrl ? 'video' : 'text',
          contentUrl: options.sourceVideoUrl || '',
          videoStartTime,
          videoEndTime: options.sourceVideoUrl ? videoStartTime + duration * 60 : 0,
          duration: duration,
          difficulty: difficulty,
          xpReward: 10 + Math.floor(duration / 3) * 2,
          aiContent: {
            summary: byte.description || 'Lesson Summary',
            keyTakeaways: keyTakeaways,
            simpleExplanation: byte.content ? byte.content.substring(0, 200) + '...' : 'Lesson Explanation',
            examples: keyTakeaways.slice(0, 2),
            analogies: ['Think of this as a core building block.'],
            revisionNotes: keyTakeaways.map((k, i) => `${i + 1}. ${k}`).join('\n\n')
          },
          quiz: {
            questions,
            passingScore: 70
          },
          flashcards,
          interviewQuestions,
          topics: [byte.title || 'Micro-learning'],
          isPublished: false
        };
      });

      return {
        success: true,
        data: {
          courseId,
          totalLessons: microLessons.length,
          estimatedTotalTime: microLessons.reduce((sum, l) => sum + l.duration, 0),
          difficulty: this.calculateOverallDifficulty(microLessons),
          microLessons
        }
      };
    } catch (error) {
      if (error.noFallback) {
        return {
          success: false,
          error: error.message
        };
      }
      console.error('AI Content Analysis Error:', error);
      console.warn('[AIContentAnalyzer] Falling back to local byte generation so trainer flow can continue.');
      return this.generateFallbackAnalysis(courseId, content, options, error);
    }
  }

  async generateFallbackAnalysis(courseId, content, options = {}, error = null) {
    const topics = await this.extractTopics(content);
    const segments = this.divideIntoSegments(content, topics);
    const sourceSegments = segments.length > 0
      ? segments
      : [{
        topics: [{ topic: 'Lesson Overview', sentences: [content], index: 0 }],
        content,
        order: 0
      }];

    const microLessons = await Promise.all(
      sourceSegments.map((segment, index) => this.generateMicroLesson(courseId, segment, index, options))
    );

    return {
      success: true,
      data: {
        courseId,
        totalLessons: microLessons.length,
        estimatedTotalTime: microLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
        difficulty: this.calculateOverallDifficulty(microLessons),
        microLessons,
        source: 'local-fallback',
        fallbackReason: error?.code || error?.message || 'AI service unavailable'
      }
    };
  }

  // Extract key topics from content using semantic analysis
  async extractTopics(content) {
    const topics = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);

    // Simple topic extraction - in production, use NLP/AI
    const topicKeywords = [
      'introduction', 'basics', 'fundamentals', 'overview', 'summary',
      'concept', 'principle', 'theory', 'method', 'process', 'step',
      'example', 'case', 'application', 'implementation', 'best practice',
      'advanced', 'deep dive', 'techniques', 'strategies', 'tips'
    ];

    sentences.forEach((sentence, index) => {
      const lower = sentence.toLowerCase();
      const foundKeywords = topicKeywords.filter(kw => lower.includes(kw));

      if (foundKeywords.length > 0 || index % 5 === 0) {
        // Extract potential topic from first few words
        const words = sentence.trim().split(/\s+/).slice(0, 5).join(' ');
        if (words.length > 5) {
          topics.push({
            topic: this.capitalizeFirst(words),
            sentences: [sentence.trim()],
            index
          });
        }
      }
    });

    // If no topics found, create generic ones
    if (topics.length === 0) {
      const chunkSize = Math.ceil(sentences.length / 5);
      for (let i = 0; i < 5; i++) {
        if (i * chunkSize < sentences.length) {
          topics.push({
            topic: `Part ${i + 1}`,
            sentences: sentences.slice(i * chunkSize, (i + 1) * chunkSize),
            index: i
          });
        }
      }
    }

    return topics;
  }

  // Divide content into logical segments for micro-lessons
  divideIntoSegments(content, topics) {
    const segments = [];
    const totalTopics = topics.length;

    // Calculate optimal number of lessons (2-5 min each)
    // Assuming average reading speed of 200 words/min
    const words = content.split(/\s+/).length;
    const estimatedMinutes = words / 200;
    const numLessons = Math.max(3, Math.min(Math.ceil(estimatedMinutes / 4), 10));

    // Group topics into segments
    const topicsPerSegment = Math.ceil(totalTopics / numLessons);

    for (let i = 0; i < numLessons; i++) {
      const startIdx = i * topicsPerSegment;
      const endIdx = Math.min((i + 1) * topicsPerSegment, totalTopics);
      const segmentTopics = topics.slice(startIdx, endIdx);

      if (segmentTopics.length > 0) {
        segments.push({
          topics: segmentTopics,
          content: segmentTopics.flatMap(t => t.sentences).join('. '),
          order: i
        });
      }
    }

    return segments;
  }

  // Generate a complete micro-lesson from a segment
  async generateMicroLesson(courseId, segment, order, options) {
    const content = segment.content;
    const title = this.generateTitle(segment, order);
    const summary = this.generateSummary(content);
    const keyTakeaways = this.extractKeyTakeaways(content);
    const explanation = this.generateSimpleExplanation(content);
    const examples = this.generateExamples(content);
    const analogies = this.generateAnalogies(content);

    // Generate quiz questions
    const quiz = this.generateQuiz(content, keyTakeaways);

    // Generate flashcards
    const flashcards = this.generateFlashcards(keyTakeaways);

    // Generate interview questions
    const interviewQuestions = this.generateInterviewQuestions(keyTakeaways);

    // Calculate duration based on word count
    const wordCount = content.split(/\s+/).length;
    const duration = Math.max(this.minDuration, Math.min(Math.ceil(wordCount / 200), this.maxDuration));
    const videoStartTime = options.sourceVideoUrl ? order * duration * 60 : 0;

    // Determine difficulty based on complexity
    const difficulty = this.assessDifficulty(content);

    return {
      course: courseId,
      section: options.section || 'Main Content',
      order: order + 1,
      title,
      description: summary,
      content,
      contentType: options.sourceVideoUrl ? 'video' : 'text',
      contentUrl: options.sourceVideoUrl || '',
      videoStartTime,
      videoEndTime: options.sourceVideoUrl ? videoStartTime + duration * 60 : 0,
      duration,
      difficulty,
      xpReward: this.calculateXP(duration, options),
      aiContent: {
        summary,
        keyTakeaways,
        simpleExplanation: explanation,
        examples,
        analogies,
        revisionNotes: this.generateRevisionNotes(keyTakeaways)
      },
      quiz,
      flashcards,
      interviewQuestions,
      topics: segment.topics.map(t => t.topic),
      isPublished: false
    };
  }

  // Helper methods
  generateTitle(segment, order) {
    const topics = segment.topics.map(t => t.topic);
    if (topics.length > 0) {
      return `${this.capitalizeFirst(topics[0])} - Part ${order + 1}`;
    }
    return `Lesson ${order + 1}: Key Concepts`;
  }

  generateSummary(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      // Take first 2-3 sentences
      return sentences.slice(0, 3).join('. ').substring(0, 200) + '...';
    }
    return content.substring(0, 200);
  }

  extractKeyTakeaways(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    // Extract key sentences as takeaways
    const takeaways = [];
    sentences.forEach((sentence, i) => {
      if (i % 3 === 0 && takeaways.length < 5) {
        const cleaned = sentence.trim();
        if (cleaned.length > 20 && cleaned.length < 150) {
          takeaways.push(cleaned);
        }
      }
    });

    // Ensure at least 3 takeaways
    while (takeaways.length < 3) {
      takeaways.push(`Understanding key concepts in this lesson`);
    }

    return takeaways.slice(0, 5);
  }

  generateSimpleExplanation(content) {
    // Generate a beginner-friendly explanation
    return `This lesson covers important concepts that build your understanding. ` +
      `Focus on understanding the key principles and how they apply to real situations. ` +
      `Take your time with each concept before moving to the next.`;
  }

  generateExamples(content) {
    // Generate example scenarios
    return [
      'Consider how this applies to everyday situations',
      'Think about a real-world application of this concept',
      'Practice applying this knowledge in different contexts'
    ];
  }

  generateAnalogies(content) {
    // Generate relatable analogies
    return [
      'Like building blocks, each concept builds on the previous one',
      'Think of it like learning to ride a bike - start with basics, then progress',
      'Similar to learning a language - practice makes perfect'
    ];
  }

  generateQuiz(content, keyTakeaways) {
    const questions = [];
    const questionTemplates = [
      'What is the main concept covered in this lesson?',
      'Which of the following is a key takeaway?',
      'How would you apply what you learned?'
    ];

    keyTakeaways.forEach((takeaway, i) => {
      if (i < 3) {
        questions.push({
          question: questionTemplates[i % questionTemplates.length],
          options: [
            takeaway,
            'Something unrelated',
            'Another concept',
                'None of the above'
          ],
          correctAnswer: 0,
          explanation: 'This is a key concept from the lesson.'
        });
      }
    });

    return {
      questions: questions.slice(0, 3),
      passingScore: 70
    };
  }

  generateFlashcards(keyTakeaways) {
    return keyTakeaways.map((takeaway, i) => ({
      front: `Key Concept ${i + 1}`,
      back: takeaway,
      topic: 'Main Topic'
    }));
  }

  generateInterviewQuestions(keyTakeaways) {
    return keyTakeaways.slice(0, 3).map((takeaway, i) => ({
      question: `Explain the concept of "${takeaway.substring(0, 30)}..."`,
      answer: takeaway,
      difficulty: i === 0 ? 'easy' : i === 1 ? 'medium' : 'hard'
    }));
  }

  generateRevisionNotes(keyTakeaways) {
    return keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n\n');
  }

  calculateXP(duration, options) {
    const baseXP = 10;
    const durationBonus = Math.floor(duration / 3) * 2;
    return baseXP + durationBonus;
  }

  assessDifficulty(content) {
    const complexWords = ['advanced', 'complex', 'sophisticated', 'algorithm', 'implementation', 'architecture'];
    const simpleWords = ['basic', 'simple', 'easy', 'beginner', 'intro'];

    const lower = content.toLowerCase();
    const complexCount = complexWords.filter(w => lower.includes(w)).length;
    const simpleCount = simpleWords.filter(w => lower.includes(w)).length;

    if (complexCount > simpleCount + 2) return 'advanced';
    if (simpleCount > complexCount + 2) return 'beginner';
    return 'intermediate';
  }

  calculateOverallDifficulty(microLessons) {
    const difficulties = {
      beginner: 1,
      intermediate: 2,
      advanced: 3
    };
    const avg = microLessons.reduce((sum, l) => sum + difficulties[l.difficulty], 0) / microLessons.length;
    if (avg < 1.5) return 'beginner';
    if (avg < 2.5) return 'intermediate';
    return 'advanced';
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

const aiContentAnalyzer = new AIContentAnalyzer();

export default aiContentAnalyzer;
