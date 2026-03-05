# Professional Redesign Plan: Blindsided Games (Core Pages, Cloudflare-First)

## Summary
- Rebuild the marketing site into a premium, professional experience using a `graphite + electric cyan` design system, subtle motion, and fully rewritten copy.
- Keep all product/store/social links intact, keep public URLs stable (`/`, `/about`, `/contact`, `/policy`), and optimize primarily for trust/polish.
- Implement as `homepage-first`, then roll the approved system across remaining core pages.
- Migrate deployment to Cloudflare Pages (GitHub-connected push deploys + preview URLs).

## Key Implementation Changes
- Platform and delivery:
  1. Move core site to Astro static output for componentized layouts, maintainability, and cleaner SEO/performance controls.
  2. Configure Cloudflare Pages for production branch deploys + PR previews.
  3. Preserve existing non-core surfaces (quiz app, game subpages) untouched in this phase.
- Design system foundation:
  1. Define tokens for palette, typography, spacing, surfaces, shadows, and motion timings (dark + light mode parity).
  2. Use premium typography pairing (non-default stack), stronger hierarchy, and consistent component states (hover/focus/active/disabled).
  3. Replace ad-hoc/inline styling patterns with reusable components and shared style primitives.
- Homepage redesign (first milestone):
  1. Structure: cinematic hero, flagship release module, curated game portfolio, trust/proof strip (release/platform signals), and clear CTA bands.
  2. Rewrite all homepage copy for professional tone while preserving product facts and outbound links.
  3. Add subtle reveal/scroll motion and polished interaction feedback without heavy animation.
- About / Contact / Policy rollout (after homepage sign-off):
  1. About: studio credibility narrative, principles, release highlights, and polished founder profile copy.
  2. Contact: redesign around clear inquiry paths plus real form workflow.
  3. Policy: rewrite into structured, professional legal-style readable sections.
- Contact backend via Cloudflare:
  1. Add `/api/contact` via Cloudflare Pages Functions.
  2. Add spam protection (Turnstile) and server-side validation/rate limiting.
  3. Deliver submissions to support inbox via transactional email API integration; keep Discord/email links as fallback.

## Public Interfaces and Contracts
- Stable routes:
  1. Keep `/`, `/about`, `/contact`, `/policy` unchanged.
- New content contract:
  1. Centralized structured game/link data source powering homepage cards and proof modules (single source of truth for product links).
- Contact API contract:
  1. `POST /api/contact` with `{ name, email, subject, message, turnstileToken }`.
  2. Returns structured success/error responses for inline UX states.

## Test Plan and Acceptance Criteria
- UX and responsiveness:
  1. Visual QA at mobile/tablet/desktop breakpoints; no overflow/clipping; nav/footer integrity on all core pages.
  2. Keyboard/focus-flow and form error-state validation.
- Quality and accessibility:
  1. WCAG-focused checks: contrast, semantic headings, labels, focus visibility, reduced-motion behavior.
  2. Link integrity test for all outbound product/store/social links.
- Performance and SEO:
  1. Lighthouse targets on core pages: high performance, accessibility, best practices, SEO.
  2. Add/verify metadata (Open Graph/Twitter), canonical URLs, sitemap, robots, and structured organization/game data.
- Deployment checks:
  1. Preview deploy validation per PR.
  2. Production deploy smoke test on Cloudflare Pages with cache/headers/redirect behavior.

## Assumptions and Defaults
- Scope for this overhaul is core pages only; quiz app and individual game subpages are deferred.
- Homepage is the approval gate: once accepted, the same system is applied to About/Contact/Policy.
- All product links remain preserved exactly; copy is fully rewritten for professionalism.
- Cloudflare Pages migration is in-scope and keeps push-to-deploy workflow from GitHub.
