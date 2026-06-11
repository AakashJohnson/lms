import FileAsset from '../models/FileAsset.model.js';
import Course from '../models/Course.model.js';
import { logger } from '../config/logger.js';
import { transcribeFileAssetVideo } from './videoTranscription.service.js';

const runningAssetJobs = new Set();

const countMeaningfulWords = (text = '') => (
  String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1).length
);

const isVideoAsset = (asset = {}) => (
  asset.mediaType === 'video' || String(asset.mimeType || '').toLowerCase().startsWith('video/')
);

const syncTranscriptToLinkedLessons = async ({ asset, transcript, wordCount }) => {
  const assetIds = [asset._id, String(asset._id)];
  await Course.updateMany(
    { 'sections.lessons.videoAsset.fileAssetId': { $in: assetIds } },
    {
      $set: {
        'sections.$[].lessons.$[lesson].transcript': transcript,
        'sections.$[].lessons.$[lesson].transcriptRaw': {
          text: transcript,
          segments: asset.transcript?.segments || [],
          language: asset.transcript?.language || 'auto',
          provider: asset.transcript?.provider || 'unknown',
          createdAt: new Date(),
        },
        'sections.$[].lessons.$[lesson].transcriptMeta': {
          selectedProvider: asset.transcript?.provider || 'unknown',
          detectedLanguage: asset.transcript?.language || 'auto',
          rawTranscriptLength: String(transcript || '').length,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
    {
      arrayFilters: [
        { 'lesson.videoAsset.fileAssetId': { $in: assetIds } },
      ],
    },
  );
};

export const processFileAssetTranscriptJob = async ({ fileAssetId, force = false } = {}) => {
  if (!fileAssetId) return;
  const jobKey = String(fileAssetId);
  if (runningAssetJobs.has(jobKey)) return;
  runningAssetJobs.add(jobKey);

  try {
    const asset = await FileAsset.findById(fileAssetId);
    if (!asset || !asset.isActive) throw new Error('FileAsset not found');
    if (!isVideoAsset(asset)) return;
    if (!force && asset.aiProcessing?.transcriptStatus === 'completed' && asset.transcript?.text) return;

    const jobId = `file-transcript:${fileAssetId}:${Date.now()}`;
    asset.aiProcessing = {
      ...(asset.aiProcessing?.toObject ? asset.aiProcessing.toObject() : asset.aiProcessing),
      transcriptStatus: 'processing',
      transcriptStartedAt: new Date(),
      transcriptErrorMessage: '',
      transcriptJobId: jobId,
      lastTranscriptAttempt: new Date(),
    };
    await asset.save();

    let transcriptMeta = {};
    const transcript = await transcribeFileAssetVideo({
      asset,
      onMetadata: (metadata = {}) => {
        transcriptMeta = { ...transcriptMeta, ...metadata };
      },
      onProgress: ({ completed = 0, total = 1 } = {}) => {
        logger.info('[FILE TRANSCRIPT] Processing upload transcript chunk', {
          fileAssetId: String(fileAssetId),
          completed,
          total,
        });
      },
    });

    const transcriptText = transcript && typeof transcript === 'object' ? transcript.text : (transcript || '');
    const wordCount = countMeaningfulWords(transcriptText);
    if (!transcriptText || wordCount === 0) {
      throw new Error('TranscriptGenerator could not detect spoken lecture content from this video');
    }

    const providerUsed = (transcript && typeof transcript === 'object' && transcript.provider)
      || process.env.ASR_PRIMARY_PROVIDER
      || 'transcript-generator';
    const languageUsed = (transcript && typeof transcript === 'object' && transcript.language)
      || process.env.ASR_LANGUAGE
      || process.env.TRANSCRIPT_GENERATOR_LANGUAGE
      || 'auto';

    asset.transcript = {
      text: transcriptText,
      language: languageUsed,
      provider: providerUsed,
      model: process.env.TRANSCRIPT_GENERATOR_MODEL || 'large-v3',
      wordCount,
      audioDuration: Number(transcriptMeta.audioDuration || (transcript && typeof transcript === 'object' && transcript.audioDuration) || 0),
      generatedAt: new Date(),
      warning: wordCount < 20 ? 'Transcript was generated but appears short for this video' : '',
    };
    asset.aiProcessing = {
      ...(asset.aiProcessing?.toObject ? asset.aiProcessing.toObject() : asset.aiProcessing),
      transcriptStatus: 'completed',
      transcriptCompletedAt: new Date(),
      transcriptErrorMessage: '',
      lastTranscriptAttempt: new Date(),
    };
    await asset.save();
    await syncTranscriptToLinkedLessons({ asset, transcript: transcriptText, wordCount });

    logger.info('[FILE TRANSCRIPT] Upload transcript completed', {
      fileAssetId: String(fileAssetId),
      wordCount,
      provider: asset.transcript.provider,
    });
  } catch (error) {
    logger.error('[FILE TRANSCRIPT] Upload transcript failed', {
      fileAssetId: String(fileAssetId),
      error: error.message,
    });
    await FileAsset.findByIdAndUpdate(fileAssetId, {
      $set: {
        'aiProcessing.transcriptStatus': 'failed',
        'aiProcessing.transcriptErrorMessage': error.message,
        'aiProcessing.lastTranscriptAttempt': new Date(),
      },
    }).catch(() => {});
  } finally {
    runningAssetJobs.delete(jobKey);
  }
};

export const enqueueFileAssetTranscriptJob = ({ fileAssetId, force = false } = {}) => {
  if (!fileAssetId) return;
  FileAsset.findByIdAndUpdate(fileAssetId, {
    $set: {
      'aiProcessing.transcriptStatus': 'pending',
      'aiProcessing.transcriptErrorMessage': '',
      'aiProcessing.lastTranscriptAttempt': new Date(),
    },
  }).catch(() => {});
  setTimeout(() => {
    processFileAssetTranscriptJob({ fileAssetId, force }).catch(() => {});
  }, 0);
};
