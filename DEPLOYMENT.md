# Blindsided Games Cloudflare Pages Deployment

## Overview
This repository now uses Astro for core routes (`/`, `/about`, `/contact`, `/policy`) and keeps legacy surfaces (`/games`, `/quizzes`, `/moodboards`) through a post-build copy step.

## Build Commands
- Install: `npm install`
- Local dev: `npm run dev`
- Production build: `npm run build`
- Cloudflare direct deploy: `npm run deploy:pages`

## Cloudflare Pages (GitHub-connected)
1. Create a Pages project in Cloudflare dashboard and connect this GitHub repository.
2. Set build command to `npm run build`.
3. Set build output directory to `dist`.
4. Keep production branch deploys enabled (for example, `main`).
5. Keep preview deploys enabled for pull requests.

## Required Environment Variables
Set these in Pages for both Production and Preview environments:
- `TURNSTILE_SECRET_KEY`: Turnstile server secret.
- `PUBLIC_TURNSTILE_SITE_KEY`: Turnstile site key used by the contact form widget.
- `CONTACT_TO_EMAIL`: Inbox recipient for contact submissions.
- `RESEND_API_KEY`: Transactional email API key.
- `CONTACT_EMAIL_FROM` (optional): Sender address override.
- `CONTACT_RATE_LIMIT_WINDOW_SECONDS` (optional): Defaults to 600.
- `CONTACT_RATE_LIMIT_MAX_REQUESTS` (optional): Defaults to 5.

## Turnstile Production Verification Checklist
Run this checklist after any Turnstile key/config update and after contact-flow deployments:

1. Confirm `PUBLIC_TURNSTILE_SITE_KEY` (client) and `TURNSTILE_SECRET_KEY` (server) are a matching pair from the same Turnstile widget.
2. In the Turnstile dashboard, confirm allowed hostnames include:
   - `blindsidedgames.com`
   - `www.blindsidedgames.com`
   - preview hostname(s), if preview deploys should support contact submissions
3. Open production homepage, launch the contact modal, and verify challenge renders.
4. Complete challenge and submit a contact message; verify `/api/contact` accepts the token and returns success.

## KV Binding for Rate Limiting
Create one KV namespace for contact rate limits, then update `wrangler.jsonc` IDs and bind it in Cloudflare Pages:
- Binding name: `CONTACT_RATE_LIMIT_KV`

If KV binding is absent, the function falls back to in-memory rate limiting for local/dev use.

## Contact API Contract
`POST /api/contact`

Request JSON:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Partnership",
  "message": "Interested in discussing publishing support.",
  "turnstileToken": "<turnstile-token>"
}
```

Success response:
```json
{
  "ok": true,
  "message": "Message sent successfully."
}
```

Error response shape:
```json
{
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Please correct the highlighted fields.",
    "fields": {
      "email": "Enter a valid email address."
    }
  }
}
```
