# Local Preview Workflow (Before Any Deploy)

## Fast visual preview (core pages)
1. Run `npm install` once.
2. Run `npm run dev:host`.
3. Open `http://localhost:4321`.

Use this for visual review of:
- `/`
- `/about`
- `/contact`
- `/policy`

## Preview with Cloudflare Pages Functions
Use this when you want to test `/api/contact` locally.

1. Build + start Pages runtime:
   - `npm run preview:pages`
2. Open the local URL shown by Wrangler.

Notes:
- This mode serves built output from `dist` plus `functions/`.
- If required secrets are missing, `/api/contact` will return a config error (expected).

## Safety process we will use going forward
1. I make changes locally first.
2. You review locally via `npm run dev:host` (or `npm run preview:pages` for API paths).
3. Only after your sign-off do we push/deploy.
