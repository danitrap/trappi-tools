#!/usr/bin/env node

import puppeteer from 'puppeteer-core';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const REMOTE_DEBUGGING_PORT = 9222;
const CONNECTION_TIMEOUT_MS = 5000;
const PAGE_LOAD_TIMEOUT_MS = 10000;
const GLOBAL_TIMEOUT_MS = 60000;
const MAX_RESULTS = 100;
const DEFAULT_RESULTS = 5;

function showHelp() {
  console.log(`
Usage: node browser-search.js <query> [options]

Perform a Google search and extract results.

Arguments:
  query         Search query (required)

Options:
  -n <number>   Number of results (default: ${DEFAULT_RESULTS}, max: ${MAX_RESULTS})
  --content     Fetch full article content for each result
  --help        Show this help message

Examples:
  node browser-search.js "machine learning tutorials"
  node browser-search.js "climate change" -n 10
  node browser-search.js "web scraping" -n 5 --content

Output:
  For each result:
  - Title
  - Link
  - Snippet
  - Content (if --content flag used, first 5000 chars)

Notes:
  - Chrome must be running (use browser-start.js)
  - Global timeout: ${GLOBAL_TIMEOUT_MS / 1000}s
  - Per-page timeout: ${PAGE_LOAD_TIMEOUT_MS / 1000}s
  - Content extraction uses Mozilla Readability
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

async function extractContent(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT_MS });

    const html = await page.content();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return null;
    }

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    turndownService.use(gfm);

    const markdown = turndownService.turndown(article.content);
    return cleanText(markdown).substring(0, 5000);

  } catch (error) {
    console.error(`  Warning: Failed to extract content from ${url}: ${error.message}`);
    return null;
  }
}

async function performSearch(page, query, numResults, fetchContent) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT_MS });

  const results = await page.evaluate(() => {
    const items = [];
    const resultElements = document.querySelectorAll('div.MjjYud');

    for (const el of resultElements) {
      const titleEl = el.querySelector('h3');
      const linkEl = el.querySelector('a');
      const snippetEl = el.querySelector('div[data-sncf]') || el.querySelector('.VwiC3b');

      if (titleEl && linkEl) {
        items.push({
          title: titleEl.textContent,
          link: linkEl.href,
          snippet: snippetEl ? snippetEl.textContent : ''
        });
      }
    }

    return items;
  });

  const limitedResults = results.slice(0, numResults);

  if (fetchContent) {
    for (const result of limitedResults) {
      const content = await extractContent(page, result.link);
      result.content = content || '(content extraction failed)';
    }
  }

  return limitedResults;
}

function formatResults(results, includeContent) {
  return results.map((result, i) => {
    let output = `
[${i}] ${result.title}
Link: ${result.link}
Snippet: ${result.snippet}
`.trim();

    if (includeContent && result.content) {
      output += `\n\nContent:\n${result.content}`;
    }

    return output;
  }).join('\n\n' + '='.repeat(60) + '\n\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    showHelp();
  }

  const query = args.find(arg => !arg.startsWith('-'));
  const nIndex = args.indexOf('-n');
  const numResults = nIndex > -1 ? Math.min(parseInt(args[nIndex + 1]) || DEFAULT_RESULTS, MAX_RESULTS) : DEFAULT_RESULTS;
  const fetchContent = args.includes('--content');

  if (!query) {
    console.error('Error: Search query is required');
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

    console.error(`Searching for: "${query}" (${numResults} results)${fetchContent ? ' with content' : ''}...`);

    const results = await performSearch(page, query, numResults, fetchContent);

    console.log(formatResults(results, fetchContent));

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
      console.error('✗ Search failed:', error.message);
    }

    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

main();
