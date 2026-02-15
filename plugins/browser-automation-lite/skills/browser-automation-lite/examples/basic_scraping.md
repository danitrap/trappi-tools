# Basic Web Scraping Workflow

Complete workflow showing how to scrape a webpage and extract content.

## Example: Scraping a Wikipedia Article

### Step 1: Start Chrome

```bash
node scripts/browser-start.js
```

Output:
```
✓ Chrome started on :9222
```

### Step 2: Navigate to Page

```bash
node scripts/browser-nav.js "https://en.wikipedia.org/wiki/Web_scraping"
```

Output:
```
✓ Navigated to: https://en.wikipedia.org/wiki/Web_scraping
  Title: Web scraping - Wikipedia
```

### Step 3: Extract Clean Content as Markdown

```bash
node scripts/browser-content.js "https://en.wikipedia.org/wiki/Web_scraping" > article.md
```

This extracts the article content, removes navigation/sidebar/footer, and converts to clean Markdown format.

### Step 4: Capture Screenshot for Verification

```bash
node scripts/browser-screenshot.js
```

Output:
```
/tmp/screenshot-2026-02-15-14-30-45.png
```

## Output

- `article.md` contains clean markdown content
- Screenshot saved to `/tmp/screenshot-<timestamp>.png`

## Common Pattern: Batch Scraping Multiple URLs

Create a shell script to scrape multiple pages:

```bash
#!/bin/bash

urls=(
  "https://example.com/page1"
  "https://example.com/page2"
  "https://example.com/page3"
)

# Start browser once
node scripts/browser-start.js

# Scrape each URL
for url in "${urls[@]}"; do
  # Create safe filename from URL
  filename=$(echo "$url" | sed 's/[^a-zA-Z0-9]/_/g')

  echo "Scraping: $url"

  # Navigate to page
  node scripts/browser-nav.js "$url"

  # Extract content
  node scripts/browser-content.js "$url" > "content_${filename}.md"

  # Be polite - add delay between requests
  sleep 1
done

echo "Done! Scraped ${#urls[@]} pages"
```

## Advanced: Scraping with JavaScript Execution

Some pages require JavaScript execution to display content:

```bash
# Start and navigate
node scripts/browser-start.js
node scripts/browser-nav.js "https://example.com/dynamic-page"

# Wait for content to load (if needed)
sleep 2

# Extract specific data using JavaScript
node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('article')).map(a => ({
    title: a.querySelector('h2').textContent,
    link: a.querySelector('a').href
  }))
"
```

## Scraping Structured Data

### Example: Extracting Product Information

```bash
node scripts/browser-nav.js "https://example.com/products"

# Use browser-pick.js to discover selectors first
node scripts/browser-pick.js
# Click on: product title, price, description

# Then extract using discovered selectors
node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('.product-card')).map(card => ({
    title: card.querySelector('.product-title').textContent.trim(),
    price: card.querySelector('.product-price').textContent.trim(),
    description: card.querySelector('.product-desc').textContent.trim(),
    image: card.querySelector('img').src
  }))
"
```

## Error Handling

### If you see "Could not connect to Chrome on localhost:9222"

**Solution**:
```bash
# Check if Chrome is running
lsof -i :9222

# If not, restart it
node scripts/browser-start.js
```

### If content extraction returns empty

**Possible causes**:
1. Page hasn't finished loading
2. Content is dynamically generated
3. Page blocks scraping

**Solutions**:
```bash
# 1. Take screenshot to see what loaded
node scripts/browser-screenshot.js

# 2. Try extracting raw text
node scripts/browser-eval.js "document.body.innerText"

# 3. Check for dynamic content with delay
node scripts/browser-nav.js "https://example.com"
sleep 3  # Wait for dynamic content
node scripts/browser-content.js "https://example.com"
```

### If navigation times out

**Solution**:
```bash
# For slow-loading pages, open in new tab
node scripts/browser-nav.js "https://slow-site.com" --new

# Then try again
node scripts/browser-content.js "https://slow-site.com"
```

## Best Practices

### 1. Respect robots.txt

Check if scraping is allowed:
```bash
curl https://example.com/robots.txt
```

### 2. Add delays between requests

Prevent overloading servers:
```bash
sleep 1  # 1 second delay
# or
sleep 0.5  # 500ms delay
```

### 3. Use existing profile for authenticated pages

```bash
node scripts/browser-start.js --profile
node scripts/browser-nav.js "https://authenticated-site.com/dashboard"
```

This preserves your login cookies from your regular Chrome profile.

### 4. Verify with screenshots

Always capture screenshots to confirm pages loaded correctly:
```bash
node scripts/browser-screenshot.js
```

## Integration with Other Tools

### Save to JSON

```bash
node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('.item')).map(i => ({
    text: i.textContent.trim()
  }))
" | jq '.' > data.json
```

### Pipe to other scripts

```bash
# Extract links and download them
node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('a')).map(a => a.href)
" | while read url; do
  wget "$url"
done
```

### Use with cron for monitoring

```bash
# Add to crontab for daily scraping
0 9 * * * cd /path/to/scripts && node browser-start.js && node browser-content.js "https://example.com/news" > daily_news.md
```

## Troubleshooting Checklist

Before reporting issues:

- [ ] Chrome is running on :9222 (`lsof -i :9222`)
- [ ] Page loaded successfully (`node scripts/browser-screenshot.js`)
- [ ] URL is accessible in regular browser
- [ ] robots.txt allows scraping
- [ ] No CAPTCHA or anti-bot measures on page
- [ ] Sufficient delay between requests (1+ seconds)

## Performance Tips

### For large batches

```bash
# Process URLs in parallel (max 3 at a time)
cat urls.txt | xargs -P 3 -I {} bash -c '
  node scripts/browser-content.js "{}" > "$(echo {} | md5sum | cut -d\" \" -f1).md"
'
```

### For memory efficiency

Restart browser periodically:
```bash
for batch in batch1 batch2 batch3; do
  node scripts/browser-start.js

  # Process batch
  for url in $(cat "$batch.txt"); do
    node scripts/browser-content.js "$url" > "output_${url}.md"
  done

  # Kill browser to free memory
  pkill -f "remote-debugging-port=9222"
done
```
