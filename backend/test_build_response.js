import fs from 'fs';
import mongoose from 'mongoose';

const statusProgressMap = {
  idle: 0,
  pending: 0,
  queued: 0,
  reading_gridfs_video: 10,
  validating_video_audio: 20,
  extracting_audio: 30,
  validating_extracted_audio: 35,
  transcribing: 50,
  generating_transcript: 50,
  transcript_completed: 55,
  analyzing_lecture: 65,
  analyzing_transcript: 65,
  cleaning_transcript: 70,
  transcript_analysis_completed: 80,
  creating_summary: 90,
  generating_summary: 90,
  completed: 100,
  failed: 0,
};

const statusMessage = (status, summaryType = 'short') => {
  const label = summaryType === 'detailed' ? 'detailed' : 'short';
  const messages = {
    idle: 'No AI summary has been generated yet.',
    pending: 'AI summary is queued.',
    queued: 'AI summary is queued.',
    reading_gridfs_video: 'Step 1 of 3: Reading video from storage...',
    validating_video_audio: 'Validating video audio stream...',
    extracting_audio: 'Extracting audio from video...',
    validating_extracted_audio: 'Validating extracted audio...',
    transcribing: 'AI is generating transcript...',
    generating_transcript: 'AI is generating transcript...',
    transcript_completed: 'Transcript generated successfully.',
    analyzing_lecture: 'Step 2 of 3: Analyzing transcript and removing irrelevant classroom talk...',
    analyzing_transcript: 'Step 2 of 3: Analyzing transcript and removing irrelevant classroom talk...',
    cleaning_transcript: 'Cleaning and formatting transcript...',
    transcript_analysis_completed: 'Transcript analysis completed successfully.',
    creating_summary: `Step 3 of 3: Creating English ${label} summary...`,
    generating_summary: `Step 3 of 3: Creating English ${label} summary...`,
    completed: `${label === 'detailed' ? 'Detailed' : 'Short'} English summary generated successfully.`,
    failed: 'AI summary generation failed.',
  };
  return messages[status] || messages.idle;
};

const normalizeSummaryType = (type) => {
  const t = String(type || '').toLowerCase();
  return t === 'detailed' ? 'detailed' : 'short';
};

const buildVideoSummaryResponse = (videoSummary = {}, summaryTypeInput) => {
  const summaryType = normalizeSummaryType(summaryTypeInput || videoSummary.summaryType);
  const version = videoSummary.summaryVersions?.[summaryType] || {};
  const status = version.status || videoSummary.aiProcessingStatus || videoSummary.status || 'idle';
  const generated = version.generated || videoSummary.generated || {};
  const legacySummary = summaryType === 'detailed'
    ? generated.detailedSummary || generated.summary
    : generated.summary;
  const summary = version.summary || legacySummary || '';
  const progress = Number(version.progress ?? videoSummary.aiProcessingProgress ?? statusProgressMap[status] ?? 0);
  const error = version.error || videoSummary.aiProcessingError || videoSummary.error || '';
  const errorCode = version.errorCode || videoSummary.errorCode || '';
  const warning = version.warning || videoSummary.warning || '';

  const resObj = {
    ...videoSummary,
    status,
    step: status,
    progress,
    summaryType,
    message: videoSummary.stage || statusMessage(status, summaryType),
    rawTranscriptAvailable: Boolean(videoSummary.rawTranscript || videoSummary.transcript),
    cleanedTranscriptAvailable: Boolean(version.cleanedTranscript || videoSummary.cleanedTranscript),
    summaryAvailable: Boolean(summary),
    summary,
    generated,
    transcript: videoSummary.rawTranscript || videoSummary.transcript || '',
    cleanedTranscript: version.cleanedTranscript || videoSummary.cleanedTranscript || '',
    transcriptAnalysisMeta: version.transcriptAnalysisMeta || videoSummary.transcriptAnalysisMeta || {},
    transcriptWordCount: version.transcriptWordCount || videoSummary.transcriptWordCount || 0,
    warning,
    error,
    errorMessage: error,
    errorCode,
    transcriptStatus: videoSummary.transcriptStatus || (Boolean(videoSummary.rawTranscript || videoSummary.transcript) ? 'completed' : 'idle'),
  };

  return resObj;
};

const dotenvContent = fs.readFileSync('.env', 'utf8');
let uri = '';
dotenvContent.split('\n').forEach(line => {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.substring('MONGODB_URI='.length).trim();
  }
});

async function main() {
  await mongoose.connect(uri);
  const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));
  const course = await Course.findById('6a213d7485fb6d4f3b36be0d').lean();
  const section = (course.sections || []).find((s) => String(s._id) === '6a213d7485fb6d4f3b36be0e');
  const lesson = (section?.lessons || []).find((l) => String(l._id) === '6a213d7485fb6d4f3b36be0f');

  const response = buildVideoSummaryResponse(lesson.videoSummary || {}, 'short');
  console.log('STATUS:', response.status);
  console.log('PROGRESS:', response.progress);
  console.log('TRANSCRIPT LENGTH:', response.transcript.length);
  console.log('TRANSCRIPT START:', response.transcript.substring(0, 100));

  await mongoose.disconnect();
}

main().catch(console.error);
