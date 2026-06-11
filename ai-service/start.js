#!/usr/bin/env node
/**
 * AI Service Cross-Platform Startup Script
 * -----------------------------------------
 * Works on Windows, macOS, and Linux.
 * Automatically:
 *   1. Finds a compatible Python 3 installation
 *   2. Creates .venv if it doesn't exist
 *   3. Installs/updates requirements from requirements.txt
 *   4. Starts the FastAPI server with uvicorn
 *
 * Usage: node start.js   OR   npm run ai
 */

import { execSync, spawn } from "child_process";
import { existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = platform() === "win32";
const args = new Set(process.argv.slice(2));
const setupOnly = args.has("--setup-only");
const optionalSetup = args.has("--optional");

// ── Paths ─────────────────────────────────────────────────────────
const VENV_DIR = join(__dirname, ".venv");
const REQUIREMENTS = join(__dirname, "requirements.txt");

const VENV_PYTHON = isWindows
  ? join(VENV_DIR, "Scripts", "python.exe")
  : join(VENV_DIR, "bin", "python");

const VENV_PIP = isWindows
  ? join(VENV_DIR, "Scripts", "pip.exe")
  : join(VENV_DIR, "bin", "pip");

// ── Helpers ───────────────────────────────────────────────────────
function log(msg) {
  console.log(`\x1b[36m[ai-service]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.error(`\x1b[31m[ai-service ERROR]\x1b[0m ${msg}`);
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}

function canRunVenvPython() {
  if (!existsSync(VENV_PYTHON)) return false;
  try {
    execSync(`"${VENV_PYTHON}" --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Try multiple Python candidates; return the first one that works. */
function findPython() {
  const candidates = isWindows
    ? ["python", "python3", "py -3", "py"]
    : ["python3", "python"];

  for (const cmd of candidates) {
    try {
      const version = execSync(`${cmd} --version 2>&1`, {
        encoding: "utf8",
      }).trim();
      const match = version.match(/Python (\d+)\.(\d+)/);
      if (match && parseInt(match[1]) >= 3 && parseInt(match[2]) >= 9) {
        log(`Found Python: ${version} (via '${cmd}')`);
        return cmd;
      }
    } catch {
      // not found, try next
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  log("Starting AI service setup...");

  // 1. Find Python
  const python = findPython();
  if (!python) {
    if (optionalSetup) {
      log(
        "Python 3.9+ not found. Skipping optional AI setup during npm install."
      );
      return;
    }
    logError(
      "Python 3.9+ is required but was not found.\n" +
        "  Install Python from https://www.python.org/downloads/\n" +
        "  Make sure 'python' or 'python3' is in your PATH."
    );
    process.exit(1);
  }

  // 2. Create venv if it doesn't exist or is invalid for this machine
  if (!canRunVenvPython()) {
    if (existsSync(VENV_DIR)) {
      log("Existing .venv looks invalid. Recreating it for this machine...");
      rmSync(VENV_DIR, { recursive: true, force: true });
    }
    log("Creating virtual environment (.venv)...");
    try {
      run(`${python} -m venv "${VENV_DIR}"`, { cwd: __dirname });
      log(".venv created successfully.");
    } catch (err) {
      logError(`Failed to create virtual environment: ${err.message}`);
      process.exit(1);
    }
  } else {
    log(".venv is valid, skipping creation.");
  }

  // 3. Install / upgrade requirements
  log("Installing dependencies from requirements.txt...");
  try {
    run(
      `"${VENV_PIP}" install -r "${REQUIREMENTS}" --quiet --disable-pip-version-check`,
      { cwd: __dirname }
    );
    log("Dependencies installed.");
  } catch (err) {
    logError(`Failed to install requirements: ${err.message}`);
    process.exit(1);
  }

  if (setupOnly) {
    log("AI setup complete.");
    return;
  }

  // 4. Start uvicorn
  log("Starting FastAPI server on http://0.0.0.0:8000 ...\n");

  const uvicorn = isWindows
    ? join(VENV_DIR, "Scripts", "uvicorn.exe")
    : join(VENV_DIR, "bin", "uvicorn");

  const server = spawn(
    uvicorn,
    ["app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
    {
      cwd: __dirname,
      stdio: "inherit",
      shell: false,
    }
  );

  // Forward signals so Ctrl+C properly kills uvicorn
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      server.kill(sig);
      process.exit(0);
    });
  }

  server.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  logError(err.message);
  process.exit(1);
});
