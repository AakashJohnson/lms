import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const TEMP_BASE_DIR = path.join(BACKEND_ROOT, 'temp', 'jobs');

/**
 * Ensures the temporary base directory exists.
 */
export const ensureTempBaseDir = () => {
  if (!fs.existsSync(TEMP_BASE_DIR)) {
    fs.mkdirSync(TEMP_BASE_DIR, { recursive: true });
  }
};

/**
 * Returns paths for a given job and ensures the directories exist.
 */
export const getJobPaths = (jobId) => {
  const safeJobId = String(jobId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const jobDir = path.join(TEMP_BASE_DIR, safeJobId);
  const chunksDir = path.join(jobDir, 'chunks');

  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  return {
    jobDir,
    chunksDir,
    videoPath: path.join(jobDir, 'source_video.mp4'),
    wavPath: path.join(jobDir, 'output.wav'),
  };
};

/**
 * Cleans up all files in a job's temp directory and deletes the directory.
 */
export const cleanupJobFiles = async (jobId) => {
  const safeJobId = String(jobId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const jobDir = path.join(TEMP_BASE_DIR, safeJobId);

  if (fs.existsSync(jobDir)) {
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`[TEMP-CLEANUP] Failed to remove job dir ${jobDir}:`, err.message);
    }
  }
};
