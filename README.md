# WebWander

**Discover the internet one site at a time.**

Official website for the WebWander Chrome extension. An interactive landing page that visualizes the web as a galaxy—stars are websites, threads are connections, and clusters are categories.

## Project Structure

**GitHub repo** (`WebWander-website` — what you clone/push):

```
WebWander-website/
├── index.html
├── css/styles.css
├── js/
│   ├── config.example.js   # Template — copy to config.js and add keys
│   ├── config.js           # Gitignored — Supabase + Chrome Web Store URL
│   ├── data-loader.js
│   ├── galaxy.js
│   └── main.js
├── data/sites.json
├── supabase/schema.sql
└── README.md
```

**Local dev folder** (`WebWander-website-dev` — sibling, never committed):

```
WebWander-website-dev/      # Sibling to WebWander-website — NOT in Git
├── js/config.js            # Your real config (copy into repo for local dev)
├── sql/                    # Sensitive seeds, dumps
├── notes.md                # Personal notes
└── README.md               # Setup instructions
```

`config.js` is in `.gitignore`. Copy it from `WebWander-website-dev/js/config.js` after cloning, or create from `config.example.js`.

## Supabase Integration

The site fetches websites from your Supabase project:

- **Tables used:** `community_sites`, `suggestions`
- **Flow:** Loads community sites (score ≥ 0) + approved suggestions (score ≥ 5)
- **Fallback:** Uses `data/sites.json` if Supabase fails
- **Submit form:** Sends new suggestions to the `suggestions` table

Configure in `js/config.js` (copy from `config.example.js`).

## Build Status

- [x] **Step 1** — Architecture & layout
- [x] **Step 2** — Web galaxy visualization
- [x] **Step 3** — Connect real website data
- [x] **Step 4** — Wander the Web feature
- [x] **Step 5** — Polish (glowing stars, animated links, fullscreen)

## Local Development

Open `index.html` in a browser, or use a simple local server:

```bash
# Python 3
python -m http.server 8000

# Node (if you have npx)
npx serve .
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` (or `master`), folder: `/ (root)`
5. Save — your site will be at `https://<username>.github.io/<repo-name>/`

## Chrome Web Store Submission

1. **Deploy the website first** (GitHub Pages above) — you need a live URL for the store listing
2. Submit your extension to the Chrome Web Store, using your GitHub Pages URL as the homepage
3. **After the extension is published**, add the store URL to `js/config.js`:
   ```js
   export const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/webwander/YOUR_EXTENSION_ID';
   ```
4. Push the update — "Get the Extension" will now link to the store

## License

MIT
