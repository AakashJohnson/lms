import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { logger } from '../../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');
const TRANSCRIBE_SCRIPT = path.join(BACKEND_ROOT, 'scripts', 'nvidia-riva-transcribe.py');
const DEFAULT_PYTHON = process.platform === 'win32'
  ? path.join(REPO_ROOT, 'ai-service', '.venv', 'Scripts', 'python.exe')
  : path.join(REPO_ROOT, 'ai-service', '.venv', 'bin', 'python');

const runProcess = (command, args, timeoutMs = 240000) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env: process.env, windowsHide: true });
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

export class RivaAsrProvider {
  constructor() {
    this.name = 'riva';
  }

  async transcribe(wavPath, options = {}) {
    logger.info('[RIVA-PROVIDER] Starting Riva ASR', { wavPath, options });
    const python = process.env.AI_SERVICE_PYTHON || (fs.existsSync(DEFAULT_PYTHON) ? DEFAULT_PYTHON : 'python');
    
    // Map language hints to Riva support (typically en-US, hi-IN, etc.)
    let langCode = options.language || options.languageHint || 'en';
    if (langCode === 'en' || langCode === 'auto') langCode = 'en-US';
    else if (langCode === 'hi' || langCode === 'hinglish') langCode = 'hi-IN';

    try {
      const { stdout } = await runProcess(python, [
        TRANSCRIBE_SCRIPT,
        '--input', wavPath,
        '--server', process.env.NVIDIA_ASR_SERVER || 'grpc.nvcf.nvidia.com:443',
        '--function-id', process.env.NVIDIA_ASR_FUNCTION_ID || 'b702f636-f60c-4a3d-a6f4-f3568c13bd7d',
        '--language-code', langCode,
      ], Number(process.env.VIDEO_TRANSCRIPTION_TIMEOUT_MS || 240000));

      const parsed = JSON.parse(stdout.trim());
      if (!parsed.success || !parsed.text) {
        throw new Error(parsed.error || 'Riva returned no text');
      }

      return {
        success: true,
        provider: this.name,
        language: langCode,
        text: parsed.text,
        segments: parsed.segments || []
      };
    } catch (err) {
      logger.error('[RIVA-PROVIDER] Riva transcription failed', { error: err.message });
      throw err;
    }
  }
}
export default RivaAsrProvider;
