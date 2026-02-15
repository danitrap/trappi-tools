#!/usr/bin/env node

import puppeteer from 'puppeteer-core';
import { tmpdir } from 'os';
import { join } from 'path';

const REMOTE_DEBUGGING_PORT = 9222;
const CONNECTION_TIMEOUT_MS = 5000;

function showHelp() {
  console.log(`
Usage: node browser-screenshot.js [options]

Capture a screenshot of the current browser viewport.

Options:
  --fullpage    Capture full page (not just viewport)
  --help        Show this help message

Examples:
  node browser-screenshot.js
  node browser-screenshot.js --fullpage

Output:
  - Saves PNG screenshot to /tmp with timestamp filename
  - Prints full file path to stdout

Notes:
  - Chrome must be running (use browser-start.js)
  - Navigate to desired page first (use browser-nav.js)
  - Timestamp format: YYYY-MM-DD-HH-mm-ss
  `);
  process.exit(0);
}

function getTimestampFilename() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .replace('T', '-')
    .split('Z')[0];
  return `screenshot-${timestamp}.png`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
  }

  const fullPage = args.includes('--fullpage');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: `http://localhost:${REMOTE_DEBUGGING_PORT}`,
      defaultViewport: null,
      timeout: CONNECTION_TIMEOUT_MS
    });

    const pages = await browser.pages();
    const page = pages[0];

    if (!page) {
      throw new Error('No active tab found. Navigate to a page first.');
    }

    const filename = getTimestampFilename();
    const filepath = join(tmpdir(), filename);

    await page.screenshot({
      path: filepath,
      fullPage: fullPage
    });

    console.log(filepath);

    await browser.disconnect();
    process.exit(0);

  } catch (error) {
    if (error.message.includes('connect')) {
      console.error('✗ Could not connect to Chrome on localhost:' + REMOTE_DEBUGGING_PORT);
      console.error('  Make sure Chrome is running with remote debugging enabled.');
      console.error('  Run: node browser-start.js');
    } else {
      console.error('✗ Screenshot failed:', error.message);
    }

    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

main();
