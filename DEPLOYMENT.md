# Blindsided Games Cloudflare Pages Deployment

## Overview
This repository now uses Astro for core routes (`/`, `/about`, `/contact`, `/policy`) and keeps legacy surfaces (`/games`, `/moodboards`) through a post-build copy step. The website no longer ships a public quizzes browser; the `quizzes/` directory is kept only for the app-facing daily feed.

## Build Commands
- Reproducible install: `npm ci`
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

## Idle Dyson Swarm Web deployment

Idle Dyson Swarm is served from this Pages project at the canonical URL
`https://ids.blindsidedgames.com/play/`. Its source and checksummed promotion
tooling live in `BlindsidedGames/IdleDysonSwarm`; this repository owns the
promoted `public/play` package, Stripe Pages Functions, live price bindings,
and the final Pages deployment.

The authoritative operational runbook is
[`Web/docs/website-deployment-rules.md`](https://github.com/BlindsidedGames/IdleDysonSwarm/blob/main/Web/docs/website-deployment-rules.md).
Keep source publication, website promotion, merge, production deployment, and
live verification as separate checkpoints.

Production invariants:

- `ids.blindsidedgames.com/` and `ids.blindsidedgames.com/play` redirect with
  status `308` to `https://ids.blindsidedgames.com/play/`.
- Host-specific routing must not redirect the main `blindsidedgames.com` or
  `www.blindsidedgames.com` homepages.
- `STRIPE_SECRET_KEY` and `IDS_STRIPE_TOKEN_SECRET` are production secrets and
  must never be committed.
- The five `IDS_STRIPE_PRICE_*` values in `wrangler.jsonc` are live Stripe
  price IDs. Never combine them with a Sandbox key.
- The existing Pages custom domain, DNS record, TLS certificate, Stripe
  products, and unchanged secrets are reused during ordinary deployments.
- The `/play/` origin, PWA scope, browser save identifiers, and entitlement
  storage require an explicit migration plan before they may change.

After deployment, verify the three canonical routes, five available catalog
entries, existing save continuity, and—when Store or backend code changed—one
unpaid `cs_live_` Checkout session. Do not complete a real payment as a smoke
test.

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
