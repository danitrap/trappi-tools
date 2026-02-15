#!/usr/bin/env node

import puppeteer from 'puppeteer-core';

const REMOTE_DEBUGGING_PORT = 9222;
const CONNECTION_TIMEOUT_MS = 5000;

function showHelp() {
  console.log(`
Usage: node browser-pick.js

Interactive element selector for DOM inspection.

Controls:
  Click              Select single element
  Cmd/Ctrl+Click     Multi-select elements
  Enter              Confirm selections
  Escape             Cancel

Output:
  For each selected element:
  - Tag name
  - ID and classes
  - Text content (first 200 chars)
  - HTML snippet (500 chars)
  - CSS selector
  - Parent hierarchy

Examples:
  node browser-pick.js

Notes:
  - Chrome must be running (use browser-start.js)
  - Navigate to page first (use browser-nav.js)
  - Visual overlay shows selections in real-time
  `);
  process.exit(0);
}

const PICKER_SCRIPT = `
(function() {
  const selectedElements = [];
  let currentHighlight = null;

  const style = document.createElement('style');
  style.textContent = \`
    .picker-highlight {
      outline: 2px solid #4A9EFF !important;
      outline-offset: 2px !important;
    }
    .picker-selected {
      outline: 2px solid #4AFF9E !important;
      outline-offset: 2px !important;
      background-color: rgba(74, 255, 158, 0.1) !important;
    }
    .picker-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #2D3748;
      color: white;
      padding: 12px;
      font-family: monospace;
      font-size: 14px;
      z-index: 999999;
      text-align: center;
    }
  \`;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.className = 'picker-banner';
  banner.textContent = 'Element Picker: Click to select | Cmd/Ctrl+Click for multi-select | Enter to confirm | Escape to cancel';
  document.body.appendChild(banner);

  function updateBanner() {
    banner.textContent = \`Selected: \${selectedElements.length} elements | Enter to confirm | Escape to cancel\`;
  }

  function getSelector(element) {
    if (element.id) {
      return '#' + element.id;
    }

    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.className) {
        const classes = current.className.trim().split(/\\s+/)
          .filter(c => !c.startsWith('picker-'))
          .slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  function getElementInfo(element) {
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || '',
      classes: element.className ? element.className.split(/\\s+/).filter(c => !c.startsWith('picker-')).join(' ') : '',
      text: (element.textContent || '').trim().substring(0, 200),
      html: element.outerHTML.substring(0, 500),
      selector: getSelector(element),
      position: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
  }

  function handleMouseOver(e) {
    if (e.target === banner) return;

    if (currentHighlight && currentHighlight !== e.target) {
      currentHighlight.classList.remove('picker-highlight');
    }

    if (!selectedElements.includes(e.target)) {
      e.target.classList.add('picker-highlight');
      currentHighlight = e.target;
    }
  }

  function handleMouseOut(e) {
    if (e.target !== banner) {
      e.target.classList.remove('picker-highlight');
    }
  }

  function cleanup() {
    document.querySelectorAll('.picker-highlight, .picker-selected').forEach(el => {
      el.classList.remove('picker-highlight', 'picker-selected');
    });

    if (banner.parentNode) {
      banner.parentNode.removeChild(banner);
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }

  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);

  return new Promise((resolve) => {
    function handleClick(e) {
      e.preventDefault();
      e.stopPropagation();

      if (e.target === banner) return;

      if (e.metaKey || e.ctrlKey) {
        // Multi-select
        const index = selectedElements.indexOf(e.target);
        if (index > -1) {
          selectedElements.splice(index, 1);
          e.target.classList.remove('picker-selected');
        } else {
          selectedElements.push(e.target);
          e.target.classList.add('picker-selected');
        }
        e.target.classList.remove('picker-highlight');
        updateBanner();
      } else {
        // Single select - finish immediately
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown);
        cleanup();
        resolve(getElementInfo(e.target));
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown);
        cleanup();
        resolve(selectedElements.map(getElementInfo));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown);
        cleanup();
        resolve(null);
      }
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
  });
})();
`;

function formatElementInfo(info) {
  if (Array.isArray(info)) {
    return info.map((el, i) => {
      return `
[${i}]
Tag: ${el.tag}
ID: ${el.id || '(none)'}
Classes: ${el.classes || '(none)'}
Selector: ${el.selector}
Text: ${el.text || '(none)'}
HTML: ${el.html}
`.trim();
    }).join('\n\n' + '='.repeat(60) + '\n\n');
  } else {
    return `
Tag: ${info.tag}
ID: ${info.id || '(none)'}
Classes: ${info.classes || '(none)'}
Selector: ${info.selector}
Text: ${info.text || '(none)'}
HTML: ${info.html}
`.trim();
  }
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

    const result = await page.evaluate(PICKER_SCRIPT);

    if (result === null) {
      console.log('Selection cancelled');
      await browser.disconnect();
      process.exit(0);
    }

    console.log(formatElementInfo(result));

    await browser.disconnect();
    process.exit(0);

  } catch (error) {
    if (error.message.includes('connect')) {
      console.error('✗ Could not connect to Chrome on localhost:' + REMOTE_DEBUGGING_PORT);
      console.error('  Make sure Chrome is running with remote debugging enabled.');
      console.error('  Run: node browser-start.js');
    } else {
      console.error('✗ Element picker failed:', error.message);
    }

    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

main();
