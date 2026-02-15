#!/usr/bin/env node

import puppeteer from 'puppeteer-core';

const REMOTE_DEBUGGING_PORT = 9222;
const CONNECTION_TIMEOUT_MS = 5000;

function showHelp() {
  console.log(`
Usage: node browser-cookies.js

Display all cookies from the active browser tab.

Options:
  --help    Show this help message

Output:
  For each cookie:
  - Name
  - Value
  - Domain
  - Path
  - Security flags (httpOnly, secure)

Examples:
  node browser-cookies.js

Notes:
  - Chrome must be running (use browser-start.js)
  - Shows cookies for current page domain
  `);
  process.exit(0);
}

function formatCookies(cookies) {
  if (cookies.length === 0) {
    return 'No cookies found';
  }

  return cookies.map((cookie, i) => {
    return `
[${i}] ${cookie.name}
Value: ${cookie.value}
Domain: ${cookie.domain}
Path: ${cookie.path}
HttpOnly: ${cookie.httpOnly}
Secure: ${cookie.secure}
`.trim();
  }).join('\n\n' + '-'.repeat(60) + '\n\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
  }

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

    const cookies = await page.cookies();
    console.log(formatCookies(cookies));

    await browser.disconnect();
    process.exit(0);

  } catch (error) {
    if (error.message.includes('connect')) {
      console.error('✗ Could not connect to Chrome on localhost:' + REMOTE_DEBUGGING_PORT);
      console.error('  Make sure Chrome is running with remote debugging enabled.');
      console.error('  Run: node browser-start.js');
    } else {
      console.error('✗ Failed to retrieve cookies:', error.message);
    }

    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

main();
