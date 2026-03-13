# WebWander – Launch Guide

Step-by-step instructions to get the website live and the Chrome extension published.

---

## Step 1: Deploy the Website

1. Push your website folder to GitHub (create a new repo if needed).
2. Go to the repo → **Settings** → **Pages** (in the left sidebar).
3. Under **Source**, select **Deploy from a branch**.
4. Choose branch: `main` (or `master`).
5. Choose folder: **/ (root)**.
6. Click **Save**.
7. Wait 1–2 minutes. Your site will be at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

---

## Step 2: Register as a Chrome Developer

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. If this is your first extension, pay the **one-time $5 registration fee**.
4. Accept the Developer Program Agreement.

---

## Step 3: Prepare the Extension for Upload

1. Open your extension folder (e.g. `Stumble Again test` or wherever WebWander lives).
2. Ensure you have:
   - `manifest.json`
   - All required files (icons, popup.html, scripts, etc.)
3. **Zip the extension folder** (the folder itself, not its parent). Include only the extension files, not `.git`, `node_modules`, or other non-extension files.

---

## Step 4: Upload the Extension

1. In the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), click **New Item**.
2. Click **Choose file** and select your `.zip` file.
3. Click **Upload**.
4. You’ll be taken to the store listing form.

---

## Step 5: Fill Out the Store Listing

### Required fields

| Field | What to enter |
|-------|----------------|
| **Summary** | Short description (e.g. "Discover the web, one click at a time.") |
| **Description** | Full description of what WebWander does, how it works, privacy notes. |
| **Category** | Pick the best match (e.g. Productivity, Social & Communication). |
| **Language** | Primary language (e.g. English). |

### URLs

| Field | What to enter |
|-------|----------------|
| **Homepage URL** | Your GitHub Pages URL (e.g. `https://username.github.io/WebWander-website/`). |
| **Support URL** | Your GitHub repo or issues page (e.g. `https://github.com/username/WebWander/issues`). |

### Assets

| Asset | Specs |
|-------|-------|
| **Small promotional tile** | 440×280 px |
| **Large promotional tile** | 920×680 px (optional but recommended) |
| **Screenshots** | At least 1; 1280×800 or 640×400 px. Show the popup and/or the website galaxy. |

### Privacy

- If the dashboard asks for a **Privacy Policy URL**, use:  
  `https://<username>.github.io/<repo-name>/privacy.html`

---

## Step 6: Submit for Review

1. Review all fields.
2. Click **Submit for review**.
3. Chrome will review your extension (usually 1–3 business days).
4. You’ll get an email when it’s approved or if changes are needed.

---

## Step 7: Add the Extension Link to Your Website

After the extension is approved:

1. Open your extension in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Copy the **Chrome Web Store URL** (e.g. `https://chromewebstore.google.com/detail/webwander/abcdefghijklmnop`).
3. In your website repo, edit `js/config.js`:
   ```js
   export const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/webwander/YOUR_EXTENSION_ID';
   ```
4. Save, commit, and push to GitHub.
5. The “Get the Extension” button will now link to the Chrome Web Store.

---

## Step 8: Update Footer Links (Optional)

Edit `index.html` and set your real URLs:

- **GitHub** → Your profile or repo (e.g. `https://github.com/yourusername`)
- **Contact** → Same, or your repo’s issues page

---

## Checklist

- [ ] Website pushed to GitHub
- [ ] GitHub Pages enabled
- [ ] Website loads at your GitHub Pages URL
- [ ] Chrome Developer account registered ($5 paid)
- [ ] Extension zipped (no extra files)
- [ ] Extension uploaded
- [ ] Store listing filled out (summary, description, URLs, icons, screenshots)
- [ ] Privacy Policy URL set
- [ ] Extension submitted for review
- [ ] Extension approved
- [ ] `CHROME_WEB_STORE_URL` set in `config.js`
- [ ] Changes pushed to GitHub

---

## Troubleshooting

**Website 404**  
- Confirm GitHub Pages is enabled and the branch/folder are correct.  
- Check the URL format: `https://<username>.github.io/<repo-name>/`.

**Extension rejected**  
- Read the rejection reason in the dashboard.  
- Fix issues (permissions, description, screenshots, etc.) and resubmit.

**“Get the Extension” doesn’t go to the store**  
- Ensure `CHROME_WEB_STORE_URL` in `config.js` is set and saved.  
- Hard refresh (Ctrl+F5) or clear cache.
