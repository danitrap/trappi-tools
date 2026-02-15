# Form Automation Workflow

Complete workflow for filling and submitting web forms programmatically.

## Example: Login Form

### Step 1: Start Chrome and Navigate

```bash
node scripts/browser-start.js
node scripts/browser-nav.js "https://example.com/login"
```

### Step 2: Discover Form Elements Interactively

```bash
node scripts/browser-pick.js
```

**Interactive process**:
1. Visual overlay appears with blue highlighting
2. Click on username field
3. Cmd/Ctrl+Click on password field
4. Cmd/Ctrl+Click on submit button
5. Press Enter to confirm selections

**Output shows selectors**:
```
[0]
Tag: input
ID: username
Classes: form-control
Selector: input#username
Text:
HTML: <input type="text" id="username" class="form-control" name="username">

[1]
Tag: input
ID: password
Classes: form-control
Selector: input[type="password"]
Text:
HTML: <input type="password" id="password" class="form-control" name="password">

[2]
Tag: button
ID:
Classes: btn btn-primary
Selector: button[type="submit"]
Text: Sign In
HTML: <button type="submit" class="btn btn-primary">Sign In</button>
```

### Step 3: Fill Form Fields

```bash
node scripts/browser-eval.js "
  document.querySelector('input#username').value = 'myuser';
  document.querySelector('input[type=\"password\"]').value = 'mypass';
"
```

### Step 4: Submit Form

```bash
node scripts/browser-eval.js "
  document.querySelector('button[type=\"submit\"]').click();
"
```

### Step 5: Verify Success

```bash
# Visual confirmation
node scripts/browser-screenshot.js

# Check page title changed
node scripts/browser-eval.js "document.title"
```

Output:
```
Dashboard - Example.com
```

## Advanced: Multi-Step Form with Validation

### Example: Registration Form

```bash
node scripts/browser-nav.js "https://example.com/signup"

# Step 1: Fill email and proceed
node scripts/browser-eval.js "
  document.querySelector('#email').value = 'user@example.com';
  document.querySelector('#next-btn').click();
"

# Wait for next step to load
sleep 2

# Step 2: Fill password fields
node scripts/browser-eval.js "
  document.querySelector('#password').value = 'securepass123';
  document.querySelector('#confirm-password').value = 'securepass123';
  document.querySelector('#agree-terms').checked = true;
"

# Step 3: Submit
node scripts/browser-eval.js "
  document.querySelector('#submit-btn').click();
"

# Wait for confirmation page
sleep 2

# Verify registration success
node scripts/browser-screenshot.js
node scripts/browser-eval.js "document.querySelector('.success-message').textContent"
```

## Cookie-Based Authentication

Use existing Chrome profile to preserve login sessions:

```bash
# Launch with profile sync
node scripts/browser-start.js --profile

# Navigate to authenticated pages with existing cookies
node scripts/browser-nav.js "https://example.com/dashboard"

# Check cookies are present
node scripts/browser-cookies.js
```

**Output**:
```
[0] session_id
Value: abc123xyz789
Domain: .example.com
Path: /
HttpOnly: true
Secure: true
```

## Form Automation Patterns

### Pattern 1: Simple Login

```bash
#!/bin/bash

# One-liner login automation
node scripts/browser-start.js && \
node scripts/browser-nav.js "https://site.com/login" && \
node scripts/browser-eval.js "
  document.querySelector('#user').value = '$USERNAME';
  document.querySelector('#pass').value = '$PASSWORD';
  document.querySelector('form').submit();
" && \
sleep 2 && \
node scripts/browser-screenshot.js > logged_in.png
```

### Pattern 2: Form with AJAX Validation

```bash
# Fill field that triggers AJAX validation
node scripts/browser-eval.js "
  const emailField = document.querySelector('#email');
  emailField.value = 'test@example.com';
  emailField.dispatchEvent(new Event('blur'));
"

# Wait for validation
sleep 1

# Check validation result
node scripts/browser-eval.js "
  document.querySelector('.validation-message').textContent
"
```

### Pattern 3: Select Dropdowns

```bash
# Single select
node scripts/browser-eval.js "
  const select = document.querySelector('#country');
  select.value = 'US';
  select.dispatchEvent(new Event('change'));
"

# Multiple select
node scripts/browser-eval.js "
  const options = document.querySelectorAll('#interests option');
  options[0].selected = true;
  options[2].selected = true;
  document.querySelector('#interests').dispatchEvent(new Event('change'));
"
```

### Pattern 4: Radio Buttons and Checkboxes

```bash
# Radio button
node scripts/browser-eval.js "
  document.querySelector('input[name=\"gender\"][value=\"other\"]').checked = true;
"

# Checkbox
node scripts/browser-eval.js "
  document.querySelector('#newsletter').checked = true;
  document.querySelector('#terms').checked = true;
"
```

### Pattern 5: File Upload

```bash
# Note: File upload requires setting files property, which is restricted
# Alternative: Use browser-eval with data URL

node scripts/browser-eval.js "
  const fileInput = document.querySelector('input[type=\"file\"]');
  const dataTransfer = new DataTransfer();

  // For simple text file
  const file = new File(['content'], 'test.txt', { type: 'text/plain' });
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
"
```

## Handling Common Form Challenges

### Challenge 1: Waiting for Elements

Sometimes form elements load dynamically:

```bash
# Poll until element appears
node scripts/browser-eval.js "
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (document.querySelector('#dynamic-field')) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  document.querySelector('#dynamic-field').value = 'test';
"
```

### Challenge 2: CAPTCHAs

For forms with CAPTCHAs, use profile authentication:

```bash
# Manual approach: solve CAPTCHA once in profile browser
node scripts/browser-start.js --profile
# Navigate and solve CAPTCHA manually in opened Chrome window
# Cookies preserved for future automation
```

### Challenge 3: Two-Factor Authentication

```bash
# Approach 1: Use authenticated session
node scripts/browser-start.js --profile

# Approach 2: Automate with TOTP (if available)
node scripts/browser-eval.js "
  document.querySelector('#otp-code').value = '123456';  // From authenticator app
  document.querySelector('#verify-btn').click();
"
```

### Challenge 4: Forms with CSP/CORS

Some sites block script injection:

```bash
# Use CDP commands directly (advanced)
# Alternative: Fill form by simulating user input events

node scripts/browser-eval.js "
  const field = document.querySelector('#username');

  // Simulate typing
  field.focus();
  field.value = '';  // Clear first

  const text = 'myusername';
  for (let char of text) {
    field.value += char;
    field.dispatchEvent(new KeyboardEvent('keydown', { key: char }));
    field.dispatchEvent(new KeyboardEvent('keypress', { key: char }));
    field.dispatchEvent(new KeyboardEvent('keyup', { key: char }));
  }

  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
"
```

## Complete Workflow Example: Job Application Form

```bash
#!/bin/bash

# Configuration
FIRST_NAME="John"
LAST_NAME="Doe"
EMAIL="john.doe@example.com"
PHONE="555-1234"
RESUME_PATH="/path/to/resume.pdf"

# Start browser
node scripts/browser-start.js

# Navigate to application form
node scripts/browser-nav.js "https://careers.example.com/apply/12345"

# Step 1: Personal information
node scripts/browser-eval.js "
  document.querySelector('#first-name').value = '$FIRST_NAME';
  document.querySelector('#last-name').value = '$LAST_NAME';
  document.querySelector('#email').value = '$EMAIL';
  document.querySelector('#phone').value = '$PHONE';
"

# Step 2: Click Next
node scripts/browser-eval.js "document.querySelector('#next-step-1').click()"
sleep 2

# Step 3: Education
node scripts/browser-eval.js "
  document.querySelector('#degree').value = 'Bachelor';
  document.querySelector('#university').value = 'Example University';
  document.querySelector('#graduation-year').value = '2020';
"

# Step 4: Click Next
node scripts/browser-eval.js "document.querySelector('#next-step-2').click()"
sleep 2

# Step 5: Review and submit
node scripts/browser-screenshot.js  # Capture review page
node scripts/browser-eval.js "document.querySelector('#submit-application').click()"

# Wait for confirmation
sleep 3

# Verify submission
node scripts/browser-screenshot.js > confirmation.png
node scripts/browser-eval.js "document.querySelector('.confirmation-message').textContent"
```

## Testing Form Validation

### Test Required Fields

```bash
# Submit form without filling required fields
node scripts/browser-eval.js "document.querySelector('form').submit()"

# Check for validation messages
node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('.error-message')).map(e => e.textContent)
"
```

### Test Field Constraints

```bash
# Test email validation
node scripts/browser-eval.js "
  document.querySelector('#email').value = 'invalid-email';
  document.querySelector('#email').dispatchEvent(new Event('blur'));
"

sleep 0.5

# Check validation state
node scripts/browser-eval.js "
  document.querySelector('#email').validity.valid
"
```

## Debugging Form Automation

### Inspect Form Structure

```bash
# Get all form fields
node scripts/browser-eval.js "
  Array.from(document.querySelectorAll('form input, form select, form textarea')).map(el => ({
    type: el.type,
    name: el.name,
    id: el.id,
    required: el.required
  }))
"
```

### Check Form State Before Submission

```bash
# Get all form values
node scripts/browser-eval.js "
  const form = document.querySelector('form');
  const formData = new FormData(form);
  Object.fromEntries(formData)
"
```

### Monitor Form Events

```bash
# Add event listeners for debugging
node scripts/browser-eval.js "
  const form = document.querySelector('form');

  ['submit', 'reset', 'change', 'input'].forEach(eventType => {
    form.addEventListener(eventType, (e) => {
      console.log(eventType + ' event fired:', e.target);
    });
  });
"
```

## Error Handling

### Handle Submission Errors

```bash
# Submit and check for errors
node scripts/browser-eval.js "document.querySelector('form').submit()"
sleep 2

# Check if still on same page (submission failed)
node scripts/browser-eval.js "
  document.querySelector('.error-notification') ?
    document.querySelector('.error-notification').textContent :
    'No errors'
"
```

### Retry Logic

```bash
#!/bin/bash

MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Attempt form submission
  node scripts/browser-eval.js "document.querySelector('form').submit()"
  sleep 2

  # Check for success
  SUCCESS=$(node scripts/browser-eval.js "document.querySelector('.success-message') !== null")

  if [ "$SUCCESS" = "true" ]; then
    echo "Form submitted successfully!"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Attempt $RETRY_COUNT failed, retrying..."
    sleep 2
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Failed after $MAX_RETRIES attempts"
  exit 1
fi
```

## Best Practices

1. **Always use browser-pick.js first** to discover correct selectors
2. **Add delays** between steps for dynamic content to load
3. **Verify each step** with screenshots or console checks
4. **Handle errors gracefully** with retry logic
5. **Use profile mode** for authenticated sessions
6. **Test thoroughly** before automating critical forms
7. **Respect rate limits** - add delays between submissions

## Security Notes

- Never commit credentials to version control
- Use environment variables for sensitive data:
  ```bash
  node scripts/browser-eval.js "
    document.querySelector('#password').value = '$PASSWORD';
  "
  ```
- Clear browser data after sensitive operations:
  ```bash
  pkill -f "remote-debugging-port=9222"
  rm -rf ~/.cache/browser-automation-lite
  ```
