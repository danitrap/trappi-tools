# Content Extraction Workflow

Extracting clean article content as Markdown from web pages.

## Example: Extract Blog Post

### Basic Extraction

```bash
node scripts/browser-start.js
node scripts/browser-content.js "https://example.com/blog/post" > article.md
```

**Output** (`article.md`):
```markdown
URL: https://example.com/blog/post
Title: How to Build Web Scrapers

# How to Build Web Scrapers

Web scraping is the process of extracting data from websites...

## Getting Started

First, you'll need to install the required dependencies...
```

Clean markdown with:
- Article title as H1
- Main content only (no navigation, ads, footers)
- Preserved formatting (headers, lists, links, code blocks)
- Images converted to markdown syntax

## Google Search → Content Extraction

### Option 1: Search with Content (Batch Retrieval)

For comprehensive research with full article content:

```bash
node scripts/browser-search.js "machine learning tutorials" -n 5 --content > research.txt
```

**Output**: All 5 results with full article content (first 5000 chars each)

```
[0] Introduction to Machine Learning - Tutorial
Link: https://example.com/ml-tutorial
Snippet: Learn the fundamentals of machine learning...

Content:
# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence...

## Core Concepts

1. Supervised Learning
2. Unsupervised Learning
...

============================================================

[1] Deep Learning Fundamentals
Link: https://another-site.com/deep-learning
...
```

**Pros**:
- Gets all content in one operation
- Good for comprehensive research
- Parallel content fetching

**Cons**:
- Higher token usage (5000 chars × 5 results = 25k chars)
- Slower execution
- May fetch irrelevant content

### Option 2: Targeted Research (Token Efficient)

For selective content extraction:

```bash
# Step 1: Get search results (snippets only)
node scripts/browser-search.js "climate change reports" -n 10 > results.txt

# Step 2: Review results and select relevant URLs
cat results.txt

# Step 3: Extract content from specific URLs only
node scripts/browser-content.js "https://selected-url-1.com" > report1.md
node scripts/browser-content.js "https://selected-url-2.com" > report2.md
```

**Pros**:
- Lower token usage (only fetch what you need)
- Better quality control (manual selection)
- Full article content (no 5000 char limit)

**Cons**:
- Requires manual URL selection
- Multiple steps

**When to use each**:
- **Option 1 (--content)**: Initial exploration, need overview of many sources
- **Option 2 (targeted)**: Deep research, specific high-quality sources needed

## Content Extraction Strategies

### Strategy 1: Direct URL Extraction

Best for: Known URLs, single articles

```bash
node scripts/browser-content.js "https://blog.example.com/article" > output.md
```

### Strategy 2: Batch Extraction from URL List

Best for: Pre-collected URLs, bookmarks, reading lists

```bash
#!/bin/bash

# Read URLs from file (one per line)
while IFS= read -r url; do
  echo "Extracting: $url"

  # Create safe filename
  filename=$(echo "$url" | md5sum | cut -d' ' -f1)

  # Extract content
  node scripts/browser-content.js "$url" > "articles/${filename}.md"

  # Add metadata file
  echo "$url" > "articles/${filename}.url"

  sleep 1  # Polite delay
done < urls.txt

echo "Extracted $(wc -l < urls.txt) articles"
```

### Strategy 3: Search-Driven Extraction

Best for: Research on specific topics

```bash
#!/bin/bash

QUERY="artificial intelligence ethics"
NUM_RESULTS=5

# Get search results
node scripts/browser-search.js "$QUERY" -n $NUM_RESULTS --content > research_output.txt

# Or for token efficiency:
# 1. Search first
node scripts/browser-search.js "$QUERY" -n 10 > search_results.txt

# 2. Extract URLs
grep "^Link:" search_results.txt | cut -d' ' -f2 > urls.txt

# 3. Manually review and filter urls.txt

# 4. Extract selected articles
while IFS= read -r url; do
  node scripts/browser-content.js "$url" > "$(basename "$url").md"
done < urls.txt
```

### Strategy 4: Site Crawling

Best for: Extracting multiple pages from same site

```bash
#!/bin/bash

BASE_URL="https://example.com/blog"

# Start browser once
node scripts/browser-start.js

# Get all article links from index page
URLS=$(node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('.article-link')).map(a => a.href)
")

# Extract each article
echo "$URLS" | jq -r '.[]' | while read -r url; do
  echo "Extracting: $url"
  node scripts/browser-content.js "$url" > "blog_$(basename "$url").md"
  sleep 1
done
```

## Understanding Content Extraction Pipeline

### How browser-content.js Works

```
1. Navigate to URL via CDP
   ↓
2. Retrieve HTML content
   ↓
3. Parse with JSDOM
   ↓
4. Extract article with Mozilla Readability
   ↓ (if successful)
5. Convert to Markdown with Turndown
   ↓
6. Clean text (remove empty parens, excess whitespace)
   ↓
7. Output: URL, Title, Content
```

### Fallback Handling

If Readability fails (returns null):

```
1. Remove unwanted elements (script, style, nav, header, footer)
   ↓
2. Find main content container:
   - <main>
   - <article>
   - [role="main"]
   - .content, #content
   - <body> (last resort)
   ↓
3. Extract plain text
   ↓
4. Clean and validate (minimum 100 characters)
```

### Content Quality Indicators

**High quality extraction** (Readability succeeded):
- Clean markdown formatting
- Proper heading hierarchy
- Links preserved
- Code blocks formatted
- Lists properly structured

**Fallback extraction** (Readability failed):
- Plain text only
- No markdown formatting
- May include some navigation text
- Still readable but less structured

## Handling Extraction Failures

### Failure Case 1: "Insufficient content extracted"

**Cause**: Page has minimal text content

**Solutions**:

```bash
# Check what's on the page
node scripts/browser-screenshot.js

# Try manual extraction
node scripts/browser-eval.js "document.body.innerText"

# Check if content is in specific container
node scripts/browser-eval.js "document.querySelector('main').innerText"
```

### Failure Case 2: JavaScript-Required Content

**Cause**: Content rendered via JavaScript after page load

**Solutions**:

```bash
# Navigate and wait before extracting
node scripts/browser-nav.js "https://spa-site.com"
sleep 3  # Wait for JS to render
node scripts/browser-content.js "https://spa-site.com"

# Alternative: Extract after JS execution
node scripts/browser-nav.js "https://spa-site.com"
sleep 3
node scripts/browser-eval.js "document.querySelector('article').innerHTML" > content.html
```

### Failure Case 3: Paywall or Login Required

**Cause**: Content behind authentication

**Solutions**:

```bash
# Option 1: Use profile with existing login
node scripts/browser-start.js --profile
node scripts/browser-content.js "https://paywalled-site.com/article"

# Option 2: Login first
node scripts/browser-start.js
node scripts/browser-nav.js "https://site.com/login"
# ... login workflow ...
node scripts/browser-content.js "https://site.com/premium-article"
```

### Failure Case 4: Anti-Scraping Measures

**Cause**: Site blocks automated access

**Solutions**:

```bash
# Use profile (appears as regular browser)
node scripts/browser-start.js --profile

# Add delays
sleep 2
node scripts/browser-content.js "https://protected-site.com"

# Manual: Open in browser and inspect
node scripts/browser-screenshot.js
```

## Markdown Conversion Details

### Default: GitHub-Flavored Markdown (GFM)

Turndown with GFM plugin supports:

**Tables**:
```markdown
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
```

**Code blocks with syntax highlighting**:
````markdown
```javascript
function example() {
  return true;
}
```
````

**Strikethrough**:
```markdown
~~deleted text~~
```

**Task lists**:
```markdown
- [x] Completed task
- [ ] Pending task
```

### Customizing Markdown Output

To modify conversion (requires editing `browser-content.js`):

```javascript
const turndownService = new TurndownService({
  headingStyle: 'atx',        // Use # headers (vs setext --- underlines)
  codeBlockStyle: 'fenced',   // Use ``` (vs indented)
  bulletListMarker: '-',      // Use - for lists (vs * or +)
  emDelimiter: '_',           // Use _emphasis_ (vs *emphasis*)
  strongDelimiter: '**'       // Use **strong** (vs __strong__)
});
```

## Advanced Content Extraction

### Extract Specific Sections

```bash
# Navigate to page
node scripts/browser-nav.js "https://example.com/docs"

# Extract specific section by selector
node scripts/browser-eval.js "
  const section = document.querySelector('#installation');
  section.innerHTML
" > installation_section.html

# Convert to markdown manually or with turndown
```

### Extract Metadata

```bash
# Get article metadata
node scripts/browser-eval.js "
  ({
    title: document.title,
    description: document.querySelector('meta[name=\"description\"]')?.content,
    author: document.querySelector('meta[name=\"author\"]')?.content,
    publishDate: document.querySelector('meta[property=\"article:published_time\"]')?.content,
    keywords: document.querySelector('meta[name=\"keywords\"]')?.content,
    canonical: document.querySelector('link[rel=\"canonical\"]')?.href
  })
"
```

### Extract Structured Data

```bash
# Extract JSON-LD schema data
node scripts/browser-eval.js "
  const schemas = Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]'));
  schemas.map(s => JSON.parse(s.textContent))
"
```

### Extract and Download Images

```bash
# Get all image URLs
node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('img')).map(img => ({
    src: img.src,
    alt: img.alt
  }))
" > images.json

# Download images
cat images.json | jq -r '.[].src' | while read -r url; do
  wget "$url" -P images/
done
```

## Content Quality Comparison

### Example: Wikipedia Article

**Input**: https://en.wikipedia.org/wiki/Web_scraping

**Output quality**:
- ✅ Clean article content
- ✅ Proper heading hierarchy
- ✅ Links preserved
- ✅ No sidebar/navigation
- ✅ No [edit] links
- ✅ References formatted as links

### Example: Medium Article

**Input**: https://medium.com/@author/article-title

**Output quality**:
- ✅ Clean article text
- ✅ Code blocks formatted
- ✅ Images included
- ⚠️ May include "Read more" prompts
- ⚠️ Paywall content may be truncated

### Example: News Article

**Input**: https://news-site.com/article

**Output quality**:
- ✅ Article text extracted
- ✅ No ads
- ⚠️ May include author bio
- ⚠️ May include "Related articles" section
- ❌ Comments excluded (usually desired)

## Integration Examples

### Create Reading List Archive

```bash
#!/bin/bash

# Export bookmarks to urls.txt (one per line)
# Then run:

mkdir -p reading_archive

while IFS= read -r url; do
  echo "Archiving: $url"

  # Extract content
  content=$(node scripts/browser-content.js "$url")

  # Get title from first line
  title=$(echo "$content" | grep "^Title:" | cut -d' ' -f2-)

  # Safe filename
  filename=$(echo "$title" | tr '/' '-' | tr ' ' '_').md

  # Save with URL as frontmatter
  {
    echo "---"
    echo "source: $url"
    echo "archived: $(date -I)"
    echo "---"
    echo ""
    echo "$content"
  } > "reading_archive/${filename}"

  sleep 1
done < urls.txt

echo "Archived $(wc -l < urls.txt) articles to reading_archive/"
```

### Build Knowledge Base

```bash
#!/bin/bash

# Research topic with multiple queries
QUERIES=(
  "machine learning fundamentals"
  "neural networks introduction"
  "deep learning tutorials"
)

mkdir -p knowledge_base

for query in "${QUERIES[@]}"; do
  echo "Researching: $query"

  # Search and extract
  node scripts/browser-search.js "$query" -n 3 --content > "knowledge_base/${query// /_}.txt"

  sleep 2
done

# Merge all into single document
cat knowledge_base/*.txt > knowledge_base/complete_research.md

echo "Knowledge base built with ${#QUERIES[@]} topics"
```

### Monitor Content Changes

```bash
#!/bin/bash

URL="https://example.com/changelog"
ARCHIVE_DIR="archives"

mkdir -p "$ARCHIVE_DIR"

# Extract current content
current=$(node scripts/browser-content.js "$URL")
current_hash=$(echo "$current" | md5sum | cut -d' ' -f1)

# Check if content changed
if [ -f "$ARCHIVE_DIR/latest_hash.txt" ]; then
  previous_hash=$(cat "$ARCHIVE_DIR/latest_hash.txt")

  if [ "$current_hash" != "$previous_hash" ]; then
    echo "Content changed! Archiving new version..."

    # Save new version
    timestamp=$(date +%Y%m%d_%H%M%S)
    echo "$current" > "$ARCHIVE_DIR/version_${timestamp}.md"

    # Update hash
    echo "$current_hash" > "$ARCHIVE_DIR/latest_hash.txt"

    # Notify (optional)
    echo "Change detected at $URL on $(date)"
  else
    echo "No changes detected"
  fi
else
  # First run
  echo "$current" > "$ARCHIVE_DIR/version_initial.md"
  echo "$current_hash" > "$ARCHIVE_DIR/latest_hash.txt"
fi
```

## Performance Optimization

### Parallel Extraction

```bash
# Extract multiple URLs in parallel (max 5 concurrent)
cat urls.txt | xargs -P 5 -I {} bash -c '
  filename=$(echo {} | md5sum | cut -d" " -f1)
  node scripts/browser-content.js "{}" > "output/${filename}.md"
  echo "Extracted: {}"
'
```

### Batch Processing with Browser Reuse

```bash
# Start browser once for entire batch
node scripts/browser-start.js

# Process batch without restarting browser
for url in $(cat urls.txt); do
  node scripts/browser-content.js "$url" > "output/$(basename "$url").md"
done

# Cleanup
pkill -f "remote-debugging-port=9222"
```

## Troubleshooting Checklist

Before reporting content extraction issues:

- [ ] Page loads successfully (`node scripts/browser-screenshot.js`)
- [ ] Content is visible in screenshot
- [ ] Not behind paywall/login
- [ ] robots.txt allows scraping
- [ ] Waited for dynamic content (add `sleep 2`)
- [ ] Tried with `--profile` flag
- [ ] Checked manual extraction (`browser-eval.js "document.body.innerText"`)

## Quality Validation

Check extraction quality:

```bash
# Word count
wc -w article.md

# Character count
wc -m article.md

# Preview first 50 lines
head -n 50 article.md

# Check for common issues
grep -i "cookie" article.md  # Cookie notices
grep -i "javascript" article.md  # "Enable JS" warnings
grep -i "subscribe" article.md  # Newsletter prompts
```

## Best Practices

1. **Always verify first extraction** with screenshot
2. **Test on sample pages** before batch processing
3. **Handle failures gracefully** with try-catch in scripts
4. **Add delays** between requests (1-2 seconds minimum)
5. **Respect robots.txt** and rate limits
6. **Use profile mode** for authenticated content
7. **Monitor extraction quality** with validation checks
8. **Archive original URLs** alongside content
