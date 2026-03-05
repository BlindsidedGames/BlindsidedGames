# BlindsidedGames TODO

## Next session pickup

- [x] Games cards: remove the extra top dead space around thumbnails.
  - Goal: thumbnails should naturally fill the card's usable vertical space.
  - Constraint: thumbnail behavior must not increase overall panel/card height.

- [x] Side navigator: fix active-section tracking so it can reach both ends reliably.
  - Current issue: after recent fix, nav can go up to `profile` but not down to `support`.

- [x] Section separators: increase breathing room around separators.
  - Add a bit more vertical space above and below each separator line/marker.

- [x] Background animation: make the starfield permanently animated.
  - Keep subtle continuous motion even when the cursor is idle.
  - Preserve current interaction feel (mouse impact) without making it distracting.

- [x] Turnstile: fix contact form verification on live.
  - Current issue: challenge does not appear/render, so submit is blocked with "Complete the Turnstile check before sending."
  - Verify both client render path and Cloudflare widget/domain configuration in production.
