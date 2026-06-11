import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { logger } from '../../config/logger.js';

const runProcess = (command, args, timeoutMs = 180000) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true });
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

/**
 * Probes the video/audio file for streams and duration.
 */
export const probeMedia = async (filePath) => {
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

      let durationSeconds = 0;
      if (durationMatch) {
        const [, hh, mm, ss] = durationMatch;
        durationSeconds = (Number(hh) * 3600) + (Number(mm) * 60) + Number(ss);
      }

      resolve({
        duration,
        durationSeconds,
        streams: streamLines.map(s => s.trim()),
        audioStreamCount: audioStreams.length,
        audioCodec,
        audioChannels,
        sampleRate
      });
    });
  });
};

export const getMediaDuration = async (filePath) => {
  try {
    const media = await probeMedia(filePath);
    const duration = Number(media.durationSeconds || 0);
    if (duration > 0) return duration;
  } catch (error) {
    logger.warn('[ASR-PREPROCESS] Duration probe failed', { filePath, error: error.message });
  }
  return null;
};

/**
 * Extracts a high-quality mono WAV from the video path.
 */
export const extractAudioWav = async (videoPath, wavPath) => {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error('Bundled FFmpeg binary is not available');
  }

  const sampleRate = process.env.ASR_AUDIO_SAMPLE_RATE || '16000';
  const channels = process.env.ASR_AUDIO_CHANNELS || '1';
  const enableLoudnorm = String(process.env.ASR_ENABLE_LOUDNORM) === 'true';
  const enableDenoise = String(process.env.ASR_ENABLE_DENOISE) === 'true';

  const ffmpegArgs = ['-y', '-i', videoPath, '-vn'];

  // Build audio filters if enabled
  const filters = [];
  if (enableDenoise) {
    // Basic highpass and lowpass filters for voice frequency denoise
    filters.push('highpass=f=200', 'lowpass=f=3000');
  }
  if (enableLoudnorm) {
    filters.push('loudnorm');
  }

  if (filters.length > 0) {
    ffmpegArgs.push('-af', filters.join(','));
  }

  ffmpegArgs.push(
    '-acodec', 'pcm_s16le',
    '-ar', sampleRate,
    '-ac', channels,
    wavPath
  );

  logger.info('[ASR-PREPROCESS] Extracting audio', { ffmpegArgs });

  await runProcess(
    ffmpegPath,
    ffmpegArgs,
    Number(process.env.VIDEO_AUDIO_EXTRACT_TIMEOUT_MS || 180000)
  );

  if (!fs.existsSync(wavPath)) {
    throw new Error('Extracted audio file does not exist');
  }

  const stats = fs.statSync(wavPath);
  if (stats.size <= 10 * 1024) {
    throw new Error('Extracted audio file is empty or too small.');
  }

  return stats.size;
};

/**
 * Volume-based silence detection.
 */
export const checkAudioSilence = async (wavPath) => {
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

/**
 * Splitting long audio files into chunks with overlap.
 */
export const chunkAudio = async (wavPath, chunksDir, durationSeconds) => {
  const isChunkingEnabled = String(process.env.ASR_ENABLE_CHUNKING) !== 'false';
  const maxSingleFileDuration = 600; // 10 minutes in seconds
  const configuredChunkLength = Number(process.env.ASR_CHUNK_SECONDS || 300);
  const forceConfiguredChunkLength = String(process.env.ASR_FORCE_CHUNK_SECONDS || 'false').toLowerCase() === 'true';
  const chunkLength = forceConfiguredChunkLength
    ? Math.max(60, configuredChunkLength)
    : Math.max(300, configuredChunkLength);
  const overlap = Number(process.env.ASR_CHUNK_OVERLAP_SECONDS || 5);

  if (!isChunkingEnabled || durationSeconds <= maxSingleFileDuration) {
    logger.info('[ASR-PREPROCESS] Chunking not required, duration is short', { durationSeconds });
    return [];
  }

  const chunks = [];
  let index = 0;
  let start = 0;

  while (start < durationSeconds) {
    // For subsequent chunks, adjust start position back by overlap
    const adjustedStart = start === 0 ? 0 : start - overlap;
    const duration = start === 0 ? chunkLength : chunkLength + overlap;
    
    // Safety check to stop infinite loop
    if (adjustedStart >= durationSeconds) break;

    const chunkFilename = `chunk_${String(index).padStart(3, '0')}.wav`;
    const chunkPath = path.join(chunksDir, chunkFilename);

    const args = [
      '-y',
      '-ss', String(adjustedStart),
      '-t', String(duration),
      '-i', wavPath,
      '-acodec', 'copy',
      chunkPath
    ];

    logger.info(`[ASR-PREPROCESS] Creating chunk ${index}`, { start: adjustedStart, duration });
    await runProcess(ffmpegPath, args);

    if (fs.existsSync(chunkPath)) {
      chunks.push({
        index,
        path: chunkPath,
        startTime: adjustedStart,
        duration: Math.min(duration, durationSeconds - adjustedStart)
      });
    }

    start += chunkLength;
    index += 1;
  }

  logger.info('[ASR-PREPROCESS] Audio chunking completed', { count: chunks.length });
  return chunks;
};
