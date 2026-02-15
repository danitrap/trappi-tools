#!/usr/bin/env node

import puppeteer from 'puppeteer-core';

const REMOTE_DEBUGGING_PORT = 9222;
const CONNECTION_TIMEOUT_MS = 5000;

function showHelp() {
  console.log(`
Usage: node browser-nav.js <url> [options]

Navigate the browser to a specific URL.

Arguments:
  url          The URL to navigate to (required)

Options:
  --new        Open URL in a new tab (default: reuse current tab)
  --help       Show this help message

Examples:
  node browser-nav.js "https://example.com"
  node browser-nav.js "https://github.com" --new

Notes:
  - Chrome must be running with remote debugging (use browser-start.js)
  - Waits for DOMContentLoaded event before returning
  - Navigation timeout is 30 seconds
  `);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    showHelp();
  }

  const url = args.find(arg => !arg.startsWith('--'));
  const openNewTab = args.includes('--new');

  if (!url) {
    console.error('Error: URL is required');
    showHelp();
  }

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: `http://localhost:${REMOTE_DEBUGGING_PORT}`,
      defaultViewport: null,
      timeout: CONNECTION_TIMEOUT_MS
    });

    let page;
    if (openNewTab) {
      page = await browser.newPage();
    } else {
      const pages = await browser.pages();
      page = pages[0] || await browser.newPage();
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const finalUrl = page.url();
    const title = await page.title();

    console.log(`✓ Navigated to: ${finalUrl}`);
    console.log(`  Title: ${title}`);

    await browser.disconnect();
    process.exit(0);

  } catch (error) {
    if (error.message.includes('connect')) {
      console.error('✗ Could not connect to Chrome on localhost:' + REMOTE_DEBUGGING_PORT);
      console.error('  Make sure Chrome is running with remote debugging enabled.');
      console.error('  Run: node browser-start.js');
    } else if (error.message.includes('Navigation timeout')) {
      console.error('✗ Navigation timeout after 30 seconds');
      console.error('  The page took too long to load.');
      console.error('  URL:', url);
    } else {
      console.error('✗ Navigation failed:', error.message);
    }

    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

main();
