#!/usr/bin/env node

import puppeteer from 'puppeteer-core';

const REMOTE_DEBUGGING_PORT = 9222;
const CONNECTION_TIMEOUT_MS = 5000;

function showHelp() {
  console.log(`
Usage: node browser-eval.js <javascript-code>

Execute JavaScript code in the active browser tab.

Arguments:
  javascript-code    JavaScript code to execute (required)

Options:
  --help            Show this help message

Examples:
  node browser-eval.js "document.title"
  node browser-eval.js "document.querySelectorAll('a').length"
  node browser-eval.js "await fetch('/api/data').then(r => r.json())"
  node browser-eval.js "document.querySelector('#username').value = 'test'"

Output Formatting:
  - Arrays: key-value pairs separated by blank lines
  - Objects: properties line by line
  - Primitives: direct output

Notes:
  - Code executes in async context (can use await)
  - Chrome must be running (use browser-start.js)
  - Returns result via console.log
  `);
  process.exit(0);
}

function formatOutput(result) {
  if (result === null) {
    return 'null';
  }
  if (result === undefined) {
    return 'undefined';
  }

  if (Array.isArray(result)) {
    return result.map((item, index) => `[${index}]: ${formatOutput(item)}`).join('\n\n');
  }

  if (typeof result === 'object') {
    return Object.entries(result)
      .map(([key, value]) => `${key}: ${formatOutput(value)}`)
      .join('\n');
  }

  return String(result);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    showHelp();
  }

  const code = args.join(' ');

  if (!code.trim()) {
    console.error('Error: JavaScript code is required');
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

    // Execute code in async context
    const result = await page.evaluate((codeStr) => {
      // Use Function constructor to evaluate in global scope
      return eval(codeStr);
    }, code);

    console.log(formatOutput(result));

    await browser.disconnect();
    process.exit(0);

  } catch (error) {
    if (error.message.includes('connect')) {
      console.error('✗ Could not connect to Chrome on localhost:' + REMOTE_DEBUGGING_PORT);
      console.error('  Make sure Chrome is running with remote debugging enabled.');
      console.error('  Run: node browser-start.js');
    } else {
      console.error('✗ Evaluation failed:', error.message);
    }

    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

main();
