export const VIDEO_SUMMARY_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  LESSON_FOUND: 'lesson_found',
  SELECTING_VIDEO_ASSET: 'selecting_video_asset',
  DOWNLOADING_GRIDFS_VIDEO: 'downloading_gridfs_video',
  READING_GRIDFS_VIDEO: 'reading_gridfs_video',
  VALIDATING_VIDEO_AUDIO: 'validating_video_audio',
  EXTRACTING_AUDIO: 'extracting_audio',
  VALIDATING_EXTRACTED_AUDIO: 'validating_extracted_audio',
  DETECTING_LANGUAGE: 'detecting_language',
  DETECTING_SPEECH: 'detecting_speech',
  TRANSCRIBING: 'transcribing',
  GENERATING_TRANSCRIPT: 'generating_transcript',
  TRANSCRIPT_COMPLETED: 'transcript_completed',
  TRANSCRIPT_FAILED: 'transcript_failed',
  USING_SAVED_TRANSCRIPT: 'using_saved_transcript',
  GENERATING_SUMMARY: 'generating_summary',
  CREATING_SUMMARY: 'creating_summary',
  SAVING_SUMMARY: 'saving_summary',
  SUMMARY_COMPLETED: 'summary_completed',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CLEANING_TRANSCRIPT: 'cleaning_transcript',
  TRANSCRIPT_CLEANED: 'transcript_cleaned',
  ANALYZING_TRANSCRIPT: 'analyzing_transcript',
  ANALYZING_LECTURE: 'analyzing_lecture',
  TRANSCRIPT_ANALYSIS_COMPLETED: 'transcript_analysis_completed',
};

export const VIDEO_SUMMARY_STATUS_VALUES = Object.values(VIDEO_SUMMARY_STATUS);

export const normalizeVideoSummaryStatus = (status) => {
  const value = String(status || '').trim();
  if (!value) return VIDEO_SUMMARY_STATUS.IDLE;
  if (VIDEO_SUMMARY_STATUS_VALUES.includes(value)) return value;
  const aliases = {
    generated: VIDEO_SUMMARY_STATUS.COMPLETED,
    done: VIDEO_SUMMARY_STATUS.COMPLETED,
    success: VIDEO_SUMMARY_STATUS.COMPLETED,
    error: VIDEO_SUMMARY_STATUS.FAILED,
    transcript_done: VIDEO_SUMMARY_STATUS.TRANSCRIPT_COMPLETED,
    transcript_complete: VIDEO_SUMMARY_STATUS.TRANSCRIPT_COMPLETED,
  };
  return aliases[value] || VIDEO_SUMMARY_STATUS.IDLE;
};
