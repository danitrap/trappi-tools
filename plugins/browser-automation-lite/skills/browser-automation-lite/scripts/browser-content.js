#!/usr/bin/env node

import puppeteer from 'puppeteer-core';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const REMOTE_DEBUGGING_PORT = 9222;
const CONNECTION_TIMEOUT_MS = 5000;
const GLOBAL_TIMEOUT_MS = 30000;
const MIN_CONTENT_LENGTH = 100;

function showHelp() {
  console.log(`
Usage: node browser-content.js <url>

Extract clean article content from a webpage as Markdown.

Arguments:
  url       URL to extract content from (required)

Options:
  --help    Show this help message

Output:
  - Final URL (after redirects)
  - Article title
  - Content as GitHub-flavored Markdown

Examples:
  node browser-content.js "https://example.com/article"
  node browser-content.js "https://en.wikipedia.org/wiki/Web_scraping" > article.md

Notes:
  - Chrome must be running (use browser-start.js)
  - Uses Mozilla Readability for extraction
  - Converts to Markdown with Turndown
  - Fallback to basic HTML cleaning if Readability fails
  - Global timeout: ${GLOBAL_TIMEOUT_MS / 1000}s
  `);
  process.exit(0);
}

function cleanText(text) {
  return text
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function fallbackExtraction(html, url) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Remove unwanted elements
  const unwanted = doc.querySelectorAll('script, style, nav, header, footer, aside, .navigation, .menu, .sidebar');
  unwanted.forEach(el => el.remove());

  // Try to find main content
  const mainContent = doc.querySelector('main') ||
                      doc.querySelector('article') ||
                      doc.querySelector('[role="main"]') ||
                      doc.querySelector('.content') ||
                      doc.querySelector('#content') ||
                      doc.body;

  const text = mainContent ? mainContent.textContent : '';
  return cleanText(text);
}

async function extractContent(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

  const finalUrl = page.url();
  const html = await page.content();

  const dom = new JSDOM(html, { url: finalUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  let title = '';
  let content = '';

  if (article) {
    title = article.title;

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    turndownService.use(gfm);

    content = turndownService.turndown(article.content);
    content = cleanText(content);
  } else {
    // Fallback
    title = dom.window.document.title || 'Untitled';
    content = fallbackExtraction(html, finalUrl);
  }

  if (content.length < MIN_CONTENT_LENGTH) {
    throw new Error(`Insufficient content extracted (${content.length} chars, minimum ${MIN_CONTENT_LENGTH})`);
  }

  return { finalUrl, title, content };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    showHelp();
  }

  const url = args.find(arg => !arg.startsWith('--'));

  if (!url) {
    console.error('Error: URL is required');
    showHelp();
  }

  let browser;
  const timeout = setTimeout(() => {
    console.error(`✗ Global timeout (${GLOBAL_TIMEOUT_MS / 1000}s) exceeded`);
    process.exit(1);
  }, GLOBAL_TIMEOUT_MS);

  try {
    browser = await puppeteer.connect({
      browserURL: `http://localhost:${REMOTE_DEBUGGING_PORT}`,
      defaultViewport: null,
      timeout: CONNECTION_TIMEOUT_MS
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    const result = await extractContent(page, url);

    console.log(`URL: ${result.finalUrl}`);
    console.log(`Title: ${result.title}`);
    console.log('');
    console.log(result.content);

    clearTimeout(timeout);
    await browser.disconnect();
    process.exit(0);

  } catch (error) {
    clearTimeout(timeout);

    if (error.message.includes('connect')) {
      console.error('✗ Could not connect to Chrome on localhost:' + REMOTE_DEBUGGING_PORT);
      console.error('  Make sure Chrome is running with remote debugging enabled.');
      console.error('  Run: node browser-start.js');
    } else {
      console.error('✗ Content extraction failed:', error.message);
    }

    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

main();
