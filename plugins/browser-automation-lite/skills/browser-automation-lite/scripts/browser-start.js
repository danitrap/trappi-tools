#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const REMOTE_DEBUGGING_PORT = 9222;
const MAX_RETRIES = 30;
const RETRY_INTERVAL_MS = 500;

function showHelp() {
  console.log(`
Usage: node browser-start.js [options]

Launches Chrome with remote debugging enabled on port ${REMOTE_DEBUGGING_PORT}.

Options:
  --profile    Sync and use existing Chrome profile from default location
  --help       Show this help message

Examples:
  node browser-start.js                    # Launch with clean profile
  node browser-start.js --profile          # Launch with synced user profile

Notes:
  - Chrome will remain open and accessible on localhost:${REMOTE_DEBUGGING_PORT}
  - All other browser-* scripts connect to this instance
  - Terminates any existing Chrome instances on port ${REMOTE_DEBUGGING_PORT}
  `);
  process.exit(0);
}

function getChromeExecutable() {
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium'
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error('Chrome/Chromium not found. Please install Google Chrome or Chromium.');
}

function killExistingChrome() {
  try {
    execSync(`pkill -f "remote-debugging-port=${REMOTE_DEBUGGING_PORT}"`, { stdio: 'ignore' });
    // Wait for process to terminate
    execSync('sleep 0.5', { stdio: 'ignore' });
  } catch (error) {
    // No existing Chrome instance, continue
  }
}

function syncProfile(targetDir) {
  const defaultProfilePath = join(homedir(), '.config/google-chrome/Default');

  if (!existsSync(defaultProfilePath)) {
    console.error('Warning: Default Chrome profile not found at', defaultProfilePath);
    return false;
  }

  console.log('Syncing Chrome profile...');
  try {
    execSync(`rsync -av --delete "${defaultProfilePath}/" "${targetDir}/"`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('Failed to sync profile:', error.message);
    return false;
  }
}

async function waitForChrome(maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://localhost:${REMOTE_DEBUGGING_PORT}/json/version`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Connection failed, retry
    }
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
  }

  const useProfile = args.includes('--profile');
  const chromeExecutable = getChromeExecutable();

  // Kill existing Chrome instances
  killExistingChrome();

  // Setup user data directory
  const userDataDir = join(homedir(), '.cache/browser-automation-lite');
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
  }

  // Sync profile if requested
  if (useProfile) {
    syncProfile(userDataDir);
  }

  // Launch Chrome
  const chromeArgs = [
    `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ];

  const chrome = spawn(chromeExecutable, chromeArgs, {
    detached: true,
    stdio: 'ignore'
  });

  chrome.unref();

  // Wait for Chrome to be ready
  const isReady = await waitForChrome();

  if (isReady) {
    console.log(`✓ Chrome started on :${REMOTE_DEBUGGING_PORT}`);
    process.exit(0);
  } else {
    console.error(`✗ Failed to connect to Chrome after ${MAX_RETRIES} attempts`);
    console.error('  Chrome may have crashed or failed to start.');
    console.error('  Check for error messages and try again.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
