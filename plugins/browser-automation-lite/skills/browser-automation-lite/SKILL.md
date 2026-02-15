---
name: browser-automation-lite
description: Lightweight browser automation toolkit using Chrome DevTools Protocol for web scraping, content extraction, element inspection, and browser testing. Use when you need to scrape web pages, extract article content, automate form filling, capture screenshots, inspect DOM elements, manage cookies, or build custom web scrapers. Based on Mario Zechner's minimal approach - uses Node.js scripts that connect to Chrome on localhost:9222. Choose this over webapp-testing for existing web pages and CLI-composable operations; choose webapp-testing for local server testing and full Playwright API access.
---

# Browser Automation Lite

## Overview

This skill provides lightweight browser automation through minimal Node.js scripts that connect to Chrome via the Chrome DevTools Protocol (CDP). Unlike heavy MCP servers or full Playwright implementations, these scripts are designed to be CLI-composable, token-efficient, and follow the "black box" pattern: execute with `--help` to understand usage, without reading source code unless absolutely necessary.

## Prerequisites

Before using this skill, ensure:

1. **Chrome installed** - Google Chrome or Chromium browser
2. **Node.js v18+** - Required for running scripts
3. **Dependencies installed** - Run once in the scripts directory:

```bash
cd scripts/
npm install
```

Dependencies: puppeteer-core, @mozilla/readability, turndown, turndown-plugin-gfm, cheerio, jsdom

## Quick Start

### 1. Launch Chrome with Remote Debugging

```bash
node scripts/browser-start.js
```

This starts Chrome on `localhost:9222`. All other scripts connect to this instance.

**Important**: Keep Chrome running throughout your session. All browser-* scripts require this connection.

### 2. Navigate to a Page

```bash
node scripts/browser-nav.js "https://example.com"
```

### 3. Capture Screenshot

```bash
node scripts/browser-screenshot.js
# Output: /tmp/screenshot-2026-02-15-14-30-45.png
```

### 4. Extract Clean Content

```bash
node scripts/browser-content.js "https://example.com/article" > article.md
```

The content is converted to clean Markdown, removing navigation, ads, and non-content elements.

## Core Workflow Patterns

### Web Scraping

**Goal**: Extract data from existing web pages

```bash
# 1. Start browser
node scripts/browser-start.js

# 2. Navigate to target page
node scripts/browser-nav.js "https://news.ycombinator.com"

# 3. Extract content or evaluate JavaScript
node scripts/browser-content.js "https://news.ycombinator.com" > hn.md

# 4. Capture visual confirmation
node scripts/browser-screenshot.js
```

**Alternative**: Use the dedicated Hacker News scraper

```bash
node scripts/browser-hn-scraper.js --limit 50 > hn_results.json
```

### Element Inspection

**Goal**: Discover CSS selectors and element properties for automation

```bash
# 1. Start and navigate
node scripts/browser-start.js
node scripts/browser-nav.js "https://example.com/form"

# 2. Interactive element picker
node scripts/browser-pick.js
# Click on elements → Press Enter to confirm
# Output shows: tag, ID, classes, CSS selector, text, HTML snippet

# 3. Use discovered selectors in automation
node scripts/browser-eval.js "document.querySelector('#username').value = 'testuser'"
```

### Content Extraction

**Goal**: Convert web articles to clean Markdown

```bash
# Direct extraction (single URL)
node scripts/browser-content.js "https://example.com/blog/post" > post.md

# Batch extraction (multiple URLs)
for url in url1 url2 url3; do
  node scripts/browser-content.js "$url" > "$(echo $url | md5sum | cut -d' ' -f1).md"
done
```

**With Google Search integration**:

```bash
# Option 1: Search + get titles/snippets (token efficient)
node scripts/browser-search.js "machine learning tutorials" -n 10 > results.txt

# Option 2: Search + fetch full content (comprehensive)
node scripts/browser-search.js "climate change" -n 5 --content > research.txt
```

### Form Automation

**Goal**: Fill and submit web forms programmatically

```bash
# 1. Navigate to form
node scripts/browser-start.js
node scripts/browser-nav.js "https://example.com/login"

# 2. Discover form fields
node scripts/browser-pick.js
# Click username, password, submit → note selectors

# 3. Fill form
node scripts/browser-eval.js "
  document.querySelector('#username').value = 'myuser';
  document.querySelector('#password').value = 'mypass';
"

# 4. Submit
node scripts/browser-eval.js "document.querySelector('button[type=submit]').click()"

# 5. Verify success
node scripts/browser-screenshot.js
```

## Script Reference

| Script | Purpose |
|--------|---------|
| `browser-start.js` | Launch Chrome with remote debugging on :9222 |
| `browser-nav.js` | Navigate to URL (reuse tab or open new) |
| `browser-eval.js` | Execute JavaScript in page context |
| `browser-screenshot.js` | Capture viewport or full-page screenshot |
| `browser-pick.js` | Interactive element selector (visual overlay) |
| `browser-cookies.js` | Display all cookies for current page |
| `browser-content.js` | Extract article content as Markdown |
| `browser-search.js` | Google search with optional content fetching |
| `browser-hn-scraper.js` | Scrape Hacker News front page (standalone) |

### Black Box Pattern

**CRITICAL**: Always execute scripts with `--help` flag first to understand usage:

```bash
node scripts/browser-content.js --help
```

**DO NOT** read the source code unless absolutely necessary for debugging or extending functionality. The scripts can be very large (150-200+ lines) and will pollute your context window. Trust the `--help` documentation and focus on composition.

### Script Composition

Scripts are designed to be chained in shell pipelines:

```bash
# Search → extract URLs → fetch content
node scripts/browser-search.js "web scraping" -n 3 | \
  grep "^Link:" | \
  cut -d' ' -f2 | \
  while read url; do
    node scripts/browser-content.js "$url"
  done
```

## When to Use This Skill vs webapp-testing

### Choose `browser-automation-lite` when:

- ✅ Working with **existing web pages** (scraping, monitoring, research)
- ✅ Need **persistent browser session** across multiple operations
- ✅ Want **minimal dependencies** (just Node.js + npm packages)
- ✅ Prefer **CLI-composable tools** over writing full scripts
- ✅ Need to interact with **authenticated sessions** using existing profile (`--profile` flag)
- ✅ Building **custom scrapers** from composable components
- ✅ Performing **content extraction** to Markdown for research/documentation
- ✅ **Quick prototyping** of browser automation workflows

### Choose `webapp-testing` when:

- ✅ Testing **local development servers** (localhost:3000, etc.)
- ✅ Need **full Playwright API** (advanced selectors, network interception, multiple contexts)
- ✅ Require **Python integration** for complex test automation
- ✅ Working with **single-page applications** with heavy dynamic rendering
- ✅ Building **comprehensive test suites** with assertions and reporting
- ✅ Need **cross-browser testing** (Firefox, WebKit, not just Chrome)

**Rule of thumb**: If the browser needs to stay open between operations and you're working with real websites → use `browser-automation-lite`. If you're launching fresh browser instances to test your own app → use `webapp-testing`.

## Troubleshooting

### "Could not connect to Chrome on localhost:9222"

**Cause**: Browser not running or crashed

**Solutions**:
1. Check if Chrome is running: `lsof -i :9222`
2. Restart Chrome: `node scripts/browser-start.js`
3. Kill stuck processes: `pkill -f "remote-debugging-port=9222"` then restart

### Port Conflict (9222 already in use)

**Cause**: Another application using port 9222

**Solutions**:
1. Find conflicting process: `lsof -i :9222`
2. Kill it: `kill -9 <PID>`
3. Alternative: Modify `REMOTE_DEBUGGING_PORT` in scripts (advanced)

### Profile Sync Issues

**Symptom**: `--profile` flag doesn't preserve cookies/login state

**Solutions**:
1. Verify Chrome profile path: `ls ~/.config/google-chrome/Default`
2. Ensure rsync installed: `which rsync`
3. Check permissions: `ls -la ~/.config/google-chrome/Default`

### Navigation Timeout

**Symptom**: "Navigation timeout after 30 seconds"

**Solutions**:
1. Check internet connection
2. Try with `--new` flag: `node scripts/browser-nav.js "url" --new`
3. For slow pages, increase timeout in script (edit `timeout: 30000` value)

### Content Extraction Fails

**Symptom**: "Insufficient content extracted" or blank output

**Solutions**:
1. Verify page loaded: `node scripts/browser-screenshot.js`
2. Check if JavaScript required: Some pages need JS execution to render content
3. Try manual extraction: `node scripts/browser-eval.js "document.body.innerText"`
4. Check robots.txt: Some sites block scraping

## Examples Reference

For detailed workflow examples, see the `examples/` directory:

- **basic_scraping.md** - Complete scraping workflow with batch processing
- **form_automation.md** - Multi-step form filling and authentication
- **content_extraction.md** - Article extraction strategies and fallback handling

Load these files only when you need specific workflow patterns beyond the core examples in this document.

## Advanced Usage

### Using Existing Chrome Profile

To preserve cookies, login sessions, and browser history:

```bash
node scripts/browser-start.js --profile
```

This syncs your default Chrome profile using rsync. **Warning**: Changes in the automation session may affect your main profile.

### Multi-Tab Operations

Open URLs in separate tabs to maintain context:

```bash
node scripts/browser-nav.js "https://page1.com"
node scripts/browser-nav.js "https://page2.com" --new
node scripts/browser-nav.js "https://page3.com" --new
# Now you have 3 tabs open simultaneously
```

### Full-Page Screenshots

Capture entire scrollable page, not just viewport:

```bash
node scripts/browser-screenshot.js --fullpage
```

### Cookie Inspection

Useful for debugging authentication issues:

```bash
node scripts/browser-cookies.js
# Shows all cookies: name, value, domain, security flags
```

## Token Efficiency Notes

This skill is designed for minimal context consumption:

- **SKILL.md**: ~350 lines (you're reading it now)
- **Each script**: 50-150 lines (use `--help`, don't read source)
- **Examples**: Load on-demand only when needed

Compare to traditional MCP servers:
- Playwright MCP: ~13,700 tokens
- Chrome DevTools MCP: ~18,000 tokens
- This skill (metadata only): ~500 tokens

**Best practice**: Load this skill → execute scripts with `--help` → compose workflows → only load `examples/` if stuck.

## Resources

### scripts/

All Node.js scripts are executable and designed for CLI composition. Each script:
- Accepts `--help` flag for self-documentation
- Connects to Chrome on `localhost:9222`
- Returns predictable exit codes (0 = success, 1 = error)
- Outputs to stdout (results) and stderr (logs/errors)

**Do not modify scripts** unless extending functionality. Use as black boxes.

### examples/

Markdown files documenting complete workflows:
- `basic_scraping.md` - Scraping patterns and batch processing
- `form_automation.md` - Form filling, multi-step workflows
- `content_extraction.md` - Article extraction strategies

Load these files only when you need detailed workflow guidance beyond this SKILL.md.

### LICENSE.txt

MIT License. Based on Mario Zechner's browser-tools project.
