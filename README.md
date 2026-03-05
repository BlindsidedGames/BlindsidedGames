# Blindsided Games Website

Core routes are now implemented with Astro and deployed on Cloudflare Pages.

## Architecture
- Astro core pages: `/`, `/about`, `/contact`, `/policy`
- Cloudflare Pages Function API: `POST /api/contact`
- Legacy non-core surfaces (games, quizzes, moodboards) are preserved and copied into `dist` during build
- Shared game/store link data contract: `src/data/site.ts`

## Local Development
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production output: `npm run build`

## Cloudflare Deployment
See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for environment variables, KV setup, and GitHub-connected Pages settings.
