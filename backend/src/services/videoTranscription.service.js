import axios from 'axios';
import crypto from 'crypto';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import os from 'os';
import path from 'path';
import mongoose from 'mongoose';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getGridFSFile, materializeGridFSFileToTemp, openDownloadStream } from './fileStorage.service.js';
import FileAsset from '../models/FileAsset.model.js';
import { logger } from '../config/logger.js';
import { callAiService } from './aiGateway.service.js';

// Modular ASR system imports
import { transcribeWithPipeline } from './asr/asrPipeline.service.js';
import { getJobPaths, cleanupJobFiles } from './asr/tempJobFiles.service.js';
import { downloadVideoFromGridFS } from './asr/gridfsVideo.service.js';
import { extractAudioWav, getMediaDuration } from './asr/audioPreprocess.service.js';

class PipelineError extends Error {
  constructor(message, code, step) {
    super(message);
    this.name = 'PipelineError';
    this.code = code;
    this.step = step;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');
const TRANSCRIBE_SCRIPT = path.join(BACKEND_ROOT, 'scripts', 'nvidia-riva-transcribe.py');
const DEFAULT_PYTHON = process.platform === 'win32'
  ? path.join(REPO_ROOT, 'ai-service', '.venv', 'Scripts', 'python.exe')
  : path.join(REPO_ROOT, 'ai-service', '.venv', 'bin', 'python');
const runningTranscriptionSources = new Set();

export const getTranscriptionRuntimeStatus = () => {
  const available = Boolean(ffmpegPath && fs.existsSync(ffmpegPath));
  return {
    ffmpegAvailable: available,
    ffmpegPath: ffmpegPath || '',
    errorCode: available ? '' : 'FFMPEG_UNAVAILABLE',
    message: available
      ? 'Bundled FFmpeg binary is available'
      : 'Video transcription is temporarily unavailable because the bundled FFmpeg binary is missing. Video playback is not affected.',
  };
};

export const assertTranscriptionRuntimeReady = () => {
  const status = getTranscriptionRuntimeStatus();
  if (status.ffmpegAvailable) return status;
  throw new PipelineError(status.message, status.errorCode, 'runtime_preflight');
};

const runProcess = (command, args, { timeoutMs = 120000, env = process.env } = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env, windowsHide: true });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => {
    child.kill('SIGKILL');
    reject(new Error(`Process timed out: ${path.basename(command)}`));
  }, timeoutMs);

  child.stdout.on('data', (data) => { stdout += data.toString(); });
  child.stderr.on('data', (data) => { stderr += data.toString(); });
  child.on('error', (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    if (code === 0) resolve({ stdout, stderr });
    else reject(new Error(stderr || stdout || `${path.basename(command)} exited with code ${code}`));
  });
});

const isLocalBackendHost = (host = '') => (
  host.startsWith('localhost')
  || host.startsWith('127.0.0.1')
  || host.startsWith('0.0.0.0')
);

const localPathFromUrl = (videoUrl = '') => {
  const raw = String(videoUrl || '').trim();
  if (!raw || raw.startsWith('blob:')) return '';

  try {
    const parsed = new URL(raw);
    if (!isLocalBackendHost(parsed.host)) return '';
    const pathname = decodeURIComponent(parsed.pathname || '');
    if (!pathname.startsWith('/uploads/')) return '';
    const localPath = path.resolve(BACKEND_ROOT, pathname.slice(1));
    return localPath.startsWith(path.join(BACKEND_ROOT, 'uploads')) ? localPath : '';
  } catch {
    if (!raw.startsWith('/uploads/')) return '';
    const localPath = path.resolve(BACKEND_ROOT, raw.slice(1));
    return localPath.startsWith(path.join(BACKEND_ROOT, 'uploads')) ? localPath : '';
  }
};

const downloadRemoteVideo = async (videoUrl, workDir) => {
  const target = path.join(workDir, `remote-${crypto.randomBytes(6).toString('hex')}.mp4`);
  const response = await axios.get(videoUrl, {
    responseType: 'stream',
    timeout: 30000,
    maxContentLength: 500 * 1024 * 1024,
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(target);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return target;
};

const resolveVideoPath = async (videoUrl, workDir) => {
  const localPath = localPathFromUrl(videoUrl);
  if (localPath && fs.existsSync(localPath)) return localPath;

  if (/^https?:\/\//i.test(videoUrl || '') && !/(youtube\.com|youtu\.be)/i.test(videoUrl)) {
    return downloadRemoteVideo(videoUrl, workDir);
  }

  return '';
};

const extractAudio = async ({ videoPath, wavPath }) => {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error('Bundled FFmpeg binary is not available');
  }

  await runProcess(ffmpegPath, [
    '-y',
    '-i', videoPath,
    '-vn',
    '-acodec', 'pcm_s16le',
    '-ar', '16000',
    '-ac', '1',
    wavPath,
  ], { timeoutMs: Number(process.env.VIDEO_AUDIO_EXTRACT_TIMEOUT_MS || 180000) });
};

const checkAudioSilence = async (wavPath) => {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    return false;
  }
  
  return new Promise((resolve) => {
    const child = spawn(ffmpegPath, ['-i', wavPath, '-filter_complex', 'volumedetect', '-f', 'null', '-'], { windowsHide: true });
    let output = '';
    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { output += data.toString(); });
    child.on('close', () => {
      const maxVolumeMatch = output.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
      if (maxVolumeMatch) {
        const maxVol = parseFloat(maxVolumeMatch[1]);
        if (maxVol < -50) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    });
    child.on('error', () => resolve(false));
  });
};

const probeMedia = async (filePath) => {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error('Bundled FFmpeg binary is not available');
  }

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-i', filePath], { windowsHide: true });
    let output = '';
    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { output += data.toString(); });
    child.on('error', (err) => reject(err));
    child.on('close', () => {
      const durationMatch = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
      const duration = durationMatch ? durationMatch[0].replace('Duration: ', '').trim() : 'unknown';

      const streamLines = output.split('\n').filter(line => line.includes('Stream #'));
      const audioStreams = streamLines.filter(line => line.includes('Audio:'));
      
      let audioCodec = 'unknown';
      let audioChannels = 'unknown';
      let sampleRate = 'unknown';

      if (audioStreams.length > 0) {
        const audioLine = audioStreams[0];
        const audioPart = audioLine.split('Audio:')[1] || '';
        const parts = audioPart.split(',').map(p => p.trim());
        audioCodec = parts[0] || 'unknown';
        
        const hzPart = parts.find(p => p.includes('Hz'));
        if (hzPart) sampleRate = hzPart;

        const channelsKeywords = ['stereo', 'mono', '5.1', 'surround', 'channels'];
        const channelsPart = parts.find(p => channelsKeywords.some(k => p.toLowerCase().includes(k)));
        if (channelsPart) audioChannels = channelsPart;
      }

      resolve({
        duration,
        streams: streamLines.map(s => s.trim()),
        audioStreamCount: audioStreams.length,
        audioCodec,
        audioChannels,
        sampleRate,
        rawOutput: output
      });
    });
  });
};

const transcribeWav = async (wavPath) => {
  const python = process.env.AI_SERVICE_PYTHON || (fs.existsSync(DEFAULT_PYTHON) ? DEFAULT_PYTHON : 'python');
  const { stdout } = await runProcess(python, [
    TRANSCRIBE_SCRIPT,
    '--input', wavPath,
    '--server', process.env.NVIDIA_ASR_SERVER || 'grpc.nvcf.nvidia.com:443',
    '--function-id', process.env.NVIDIA_ASR_FUNCTION_ID || 'b702f636-f60c-4a3d-a6f4-f3568c13bd7d',
    '--language-code', process.env.NVIDIA_ASR_LANGUAGE || 'en',
  ], {
    timeoutMs: Number(process.env.VIDEO_TRANSCRIPTION_TIMEOUT_MS || 240000),
    env: process.env,
  });

  const parsed = JSON.parse(stdout.trim());
  if (!parsed.success || !parsed.text) {
    throw new Error(parsed.error || 'Video transcription returned no text');
  }
  return parsed.text;
};

const transcribeWavWithWhisper = async (wavPath) => {
  const python = process.env.AI_SERVICE_PYTHON || (fs.existsSync(DEFAULT_PYTHON) ? DEFAULT_PYTHON : 'python');
  const whisperScript = path.join(BACKEND_ROOT, 'scripts', 'whisper-transcribe.py');
  
  const { stdout } = await runProcess(python, [
    whisperScript,
    '--input', wavPath,
  ], {
    timeoutMs: Number(process.env.WHISPER_TRANSCRIPTION_TIMEOUT_MS || 300000),
    env: process.env,
  });

  const parsed = JSON.parse(stdout.trim());
  if (!parsed.success || !parsed.text) {
    throw new Error(parsed.error || 'Whisper fallback returned no text');
  }
  return parsed;
};

const gatherCandidates = async (lesson) => {
  const candidates = [];
  const visitedFileIds = new Set();

  const addCandidate = async (field, item) => {
    if (!item) return;

    let fileAsset = null;
    let gridfsFileId = null;
    let originalName = '';
    let mimeType = '';
    let size = 0;
    let type = '';

    if (mongoose.Types.ObjectId.isValid(item) || (typeof item === 'string' && /^[0-9a-fA-F]{24}$/.test(item))) {
      const id = String(item);
      fileAsset = await FileAsset.findById(id).lean();
      if (!fileAsset) {
        gridfsFileId = id;
      }
    } else if (typeof item === 'object') {
      const id = item.fileAssetId || item._id;
      if (mongoose.Types.ObjectId.isValid(id) || (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))) {
        fileAsset = await FileAsset.findById(String(id)).lean();
      }
      
      gridfsFileId = item.gridfsFileId || item.fileId || gridfsFileId;
      originalName = item.originalName || item.fileName || item.filename || '';
      mimeType = item.mimeType || item.contentType || '';
      size = item.fileSize || item.size || item.length || 0;
      type = item.mediaType || item.type || '';
    }

    if (fileAsset) {
      gridfsFileId = fileAsset.gridfsFileId || gridfsFileId;
      originalName = fileAsset.originalName || fileAsset.fileName || originalName;
      mimeType = fileAsset.mimeType || mimeType;
      size = fileAsset.fileSize || size;
      type = fileAsset.mediaType || type;
    }

    if (gridfsFileId && (!mimeType || !size)) {
      try {
        const gridfsFile = await getGridFSFile(gridfsFileId);
        if (gridfsFile) {
          mimeType = mimeType || gridfsFile.contentType || '';
          size = size || gridfsFile.length || 0;
          originalName = originalName || gridfsFile.filename || '';
        }
      } catch (err) {
        logger.warn('Failed to fetch fallback GridFS file details for candidate', { gridfsFileId, error: err.message });
      }
    }

    if (gridfsFileId) {
      const fileIdStr = String(gridfsFileId);
      if (!visitedFileIds.has(fileIdStr)) {
        visitedFileIds.add(fileIdStr);
        candidates.push({
          field,
          fileId: fileIdStr,
          fileAssetId: fileAsset ? String(fileAsset._id) : null,
          originalName,
          mimeType,
          size,
          type: type || (mimeType ? mimeType.split('/')[0] : '')
        });
      }
    }
  };

  if (lesson.videoAsset) {
    await addCandidate('videoAsset', lesson.videoAsset);
  }

  if (Array.isArray(lesson.mediaAssets)) {
    for (let i = 0; i < lesson.mediaAssets.length; i++) {
      await addCandidate(`mediaAssets[${i}]`, lesson.mediaAssets[i]);
    }
  } else if (lesson.mediaAssets) {
    await addCandidate('mediaAssets', lesson.mediaAssets);
  }

  if (Array.isArray(lesson.assets)) {
    for (let i = 0; i < lesson.assets.length; i++) {
      await addCandidate(`assets[${i}]`, lesson.assets[i]);
    }
  } else if (lesson.assets) {
    await addCandidate('assets', lesson.assets);
  }

  if (lesson.fileId) {
    await addCandidate('fileId', lesson.fileId);
  }

  if (lesson.videoFileId) {
    await addCandidate('videoFileId', lesson.videoFileId);
  }

  return candidates;
};

export const transcribeVideoCore = async ({
  videoPathInput,
  gridfsFileId,
  originalName,
  videoUrl,
  storageProvider,
  onMetadata,
  onProgress,
  jobId,
  languageHint = 'auto',
  asrMode = 'Balanced'
}) => {
  const safeJobId = String(jobId || crypto.randomBytes(8).toString('hex')).replace(/[^a-zA-Z0-9-_]/g, '_');
  const paths = getJobPaths(safeJobId);
  const videoPath = paths.videoPath;
  const wavPath = paths.wavPath;
  const reportProgress = typeof onProgress === 'function' ? onProgress : () => {};
  const sourceKey = gridfsFileId ? `gridfs:${gridfsFileId}` : `job:${safeJobId}`;

  try {
    assertTranscriptionRuntimeReady();
    if (runningTranscriptionSources.has(sourceKey)) {
      throw new PipelineError(
        'A transcript job is already running for this video. Please wait for it to finish.',
        'TRANSCRIPTION_ALREADY_RUNNING',
        'queue'
      );
    }
    runningTranscriptionSources.add(sourceKey);

    // 1. Download/Materialize video
    reportProgress({ completed: 5, total: 100, message: 'Resolving lecture video...' });
    if (gridfsFileId && storageProvider === 'gridfs') {
      await downloadVideoFromGridFS(gridfsFileId, videoPath);
    } else {
      const resolved = await resolveVideoPath(videoUrl, paths.jobDir);
      if (resolved && resolved !== videoPath) {
        fs.copyFileSync(resolved, videoPath);
      }
    }

    if (!fs.existsSync(videoPath)) {
      throw new PipelineError(
        "No video file could be resolved for transcription",
        "VIDEO_FILE_NOT_FOUND",
        "file_selection"
      );
    }

    // 2. Probe Media
    reportProgress({ completed: 15, total: 100, message: 'Validating video stream...' });
    const mediaProbe = await probeMedia(videoPath);
    if (mediaProbe.audioStreamCount === 0) {
      throw new PipelineError(
        "This video has no audio track.",
        "NO_AUDIO_TRACK",
        "audio_validation"
      );
    }

    let durationSeconds = mediaProbe.durationSeconds || 0;
    if (onMetadata) {
      onMetadata({ audioDuration: durationSeconds });
    }

    // 3. Extract Audio
    reportProgress({ completed: 20, total: 100, message: 'Extracting audio track...' });
    await extractAudioWav(videoPath, wavPath);
    if (!durationSeconds) {
      durationSeconds = await getMediaDuration(wavPath) || null;
      if (!durationSeconds) logger.warn('[ASR-CORE] Media duration could not be detected; continuing without chunking duration', { jobId: safeJobId });
    }

    // 4. Silence Check
    reportProgress({ completed: 30, total: 100, message: 'Checking audio levels...' });
    const isSilent = await checkAudioSilence(wavPath);
    if (isSilent) {
      throw new PipelineError(
        "Audio track is silent or has extremely low volume.",
        "AUDIO_SILENCE_DETECTED",
        "audio_validation"
      );
    }

    // 5. Run the new ASR pipeline
    const asrResult = await transcribeWithPipeline({
      wavPath,
      durationSeconds,
      languageHint,
      jobId: safeJobId,
      workDir: paths.jobDir,
      asrMode,
      onProgress: ({ stage, progress, message }) => {
        reportProgress({
          completed: progress,
          total: 100,
          message: message || stage
        });
      }
    });

    // 6. Return response
    if (onMetadata) {
      onMetadata({
        audioDuration: durationSeconds,
        sourceGridfsFileId: gridfsFileId || null,
        segments: asrResult.segments,
        language: asrResult.language,
        provider: asrResult.provider,
        qualityScore: asrResult.qualityScore,
        fallbackUsed: asrResult.fallbackUsed,
        providersTried: asrResult.providersTried,
        warnings: asrResult.warnings
      });
    }

    // Return the result object containing text, segments, provider etc.
    return asrResult;

  } catch (error) {
    logger.error('[ASR-CORE] Error transcribing video core', { error: error.message, jobId: safeJobId });
    throw error;
  } finally {
    runningTranscriptionSources.delete(sourceKey);
    // 7. Cleanup temp job files
    await cleanupJobFiles(safeJobId);
  }
};

export const transcribeLessonVideo = async ({
  lesson = {},
  courseId,
  sectionId,
  lessonId,
  onMetadata,
  onProgress,
  languageHint = 'auto',
  asrMode = 'Balanced'
}) => {
  const candidates = await gatherCandidates(lesson);

  logger.info("[AI SUMMARY] Lesson media candidates", {
    courseId,
    sectionId,
    lessonId,
    candidates: candidates.map(c => ({
      field: c.field,
      fileId: c.fileId,
      originalName: c.originalName,
      mimeType: c.mimeType,
      size: c.size,
      type: c.type
    }))
  });

  if (candidates.length === 0) {
    throw new PipelineError(
      "No valid uploaded video file was found for this lesson.",
      "VIDEO_FILE_NOT_FOUND",
      "file_selection"
    );
  }

  const priorityFields = ['videoAsset', 'videoFileId', 'fileId'];
  let selected = candidates.find(c => priorityFields.includes(c.field));
  if (!selected) {
    selected = candidates[0];
  }

  logger.info("[AI SUMMARY] Selected video asset", {
    selectedFileId: selected.fileId,
    selectedField: selected.field,
    originalName: selected.originalName,
    mimeType: selected.mimeType,
    size: selected.size
  });

  const mime = String(selected.mimeType || '').toLowerCase();
  if (!mime.startsWith('video/')) {
    throw new PipelineError(
      "Selected lesson asset is not a video.",
      "INVALID_MEDIA_TYPE",
      "file_selection"
    );
  }

  if (Number(selected.size) <= 1024 * 1024) {
    throw new PipelineError(
      "No valid uploaded video file was found for this lesson.",
      "VIDEO_FILE_NOT_FOUND",
      "file_selection"
    );
  }

  const gridfsFileId = selected.fileId;
  const storageProvider = 'gridfs';

  let jobId = `lesson-${courseId || 'unknown'}-${sectionId || 'unknown'}-${lessonId || 'unknown'}`;
  if (courseId && sectionId && lessonId) {
    jobId = `lesson-${courseId}-${sectionId}-${lessonId}`;
  }

  if (onMetadata) {
    onMetadata({
      sourceGridfsFileId: gridfsFileId,
      sourceFileAssetId: selected.fileAssetId || null
    });
  }

  return transcribeVideoCore({
    gridfsFileId,
    originalName: selected.originalName || '',
    videoUrl: '',
    storageProvider,
    onMetadata,
    onProgress,
    jobId,
    languageHint,
    asrMode,
  });
};

export const transcribeFileAssetVideo = async ({ asset = {}, onMetadata, onProgress }) => {
  const gridfsFileId = asset.gridfsFileId;
  const videoUrl = asset.urls?.streamUrl || asset.urls?.viewUrl || '';
  if (!videoUrl && !gridfsFileId) return '';

  const jobId = `file-asset-${asset._id || crypto.randomBytes(8).toString('hex')}`;

  if (onMetadata) {
    onMetadata({
      sourceGridfsFileId: gridfsFileId,
      sourceFileAssetId: String(asset._id)
    });
  }

  return transcribeVideoCore({
    gridfsFileId,
    originalName: asset.originalName || '',
    videoUrl,
    storageProvider: asset.storageProvider || (gridfsFileId ? 'gridfs' : 'local'),
    onMetadata,
    onProgress,
    jobId,
  });
};
