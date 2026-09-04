# Debug Cats

A standalone, photos-only gallery for `debugcats.blindsidedgames.com`. Maintained alongside the main website, with its own static output. The main website has no inbound links or sitemap entries for this gallery.

## Local preview

```sh
npm ci
npm run gallery:preview
```

Open http://127.0.0.1:4328. The local Node server serves only `dist-debugcats/` and applies the same indexing and content-security headers as the deployment. It binds to loopback only.

`npm run gallery:build` builds the already-optimized assets without needing the source archive. `npm run build` continues to build the main Astro website independently.

## Photos

There are 104 photos, 822 AVIF/WebP variants and no video assets. Source photos are preserved outside the repository in the owner's Debug Cats Archive. Only reviewed descriptions and web derivatives are published; capture dates, EXIF/GPS, original filenames and temporary Apple download URLs are excluded.

To regenerate from that local archive:

```sh
npm run gallery:images -- "/path/to/Debug Cats Archive/2026-09-04"
npm run gallery:build
```

Sharp is pinned at 0.35.3. The pipeline checks archive SHA-256 hashes, applies orientation, converts to sRGB and strips metadata. Long edges are capped at 400/800/1280/2048 pixels without upscaling, at AVIF quality 50 / WebP quality 80. The build uses actual output widths in responsive-image descriptors. Hashed asset filenames allow immutable caching.

For new photos, append to the archive photo ordering, add corresponding reviewed descriptions, regenerate, and update the displayed total in the template. Keep existing order stable. For removed/replaced sources, prune obsolete hashed variants from `assets/` before publishing; never remove the source archive. Review changes before adding personal photos.

Photos are shown in batches of 24, with separate masonry columns for each batch so loading more does not reshuffle earlier photos. The native dialog supports keyboard arrows, Escape, touch swipes, focus return and bounded previous/next controls. Below-fold previews are lazy-loaded; larger images are fetched when opened. A no-JavaScript stylesheet exposes all photo links. The featured photograph also appears in the collection and is not counted twice.

## Publication

The dedicated Cloudflare Pages project is `debugcats`, with production branch `main` and output directory `dist-debugcats`. It uses direct deployment: run `npm run gallery:deploy` from the repository root. Its own `wrangler.jsonc` contains no main-site Functions, bindings or secrets. If deploying by CLI, run from `galleries/debugcats/` and pass `../../dist-debugcats` with the explicit gallery project name, so the root website Functions directory is not deployed. Configure the custom domain in Pages, then DNS and TLS. Do not reuse the existing main website deployment command or its output directory.

The `_headers` file applies `noindex, nofollow, noimageindex` to all routes and assets, including the project's alternate Pages hostname. `robots.txt` permits reading those directives; there is no sitemap. These are indexing preferences, not access control: anyone with the URL may view and share the gallery.

After reviewing and publishing the gallery, verify HTTPS, headers and photo loading on the intended domain before replacing `SUPPORTER_CAT_GALLERY_URL` in the Idle Dyson Swarm repository. Keep the old iCloud album for older installed game versions. The photos-only gallery was deployed on 4 September 2026 at https://debugcats.pages.dev (deployment https://f1a2cad8.debugcats.pages.dev). The custom domain `debugcats.blindsidedgames.com` is registered with Pages; DNS activation is pending. The game URL has been changed locally as a one-line edit, without a PR or game release.

## Validation — 4 September 2026

- Gallery build passed with 104 photos and no videos; 822 generated files have verified dimensions and no EXIF/XMP metadata.
- Existing main Astro site build passed.
- Codex browser inspected at desktop 1280×720 and mobile 390×844. No horizontal overflow on mobile; images remain uncropped.
- Opened featured photo, advanced with keyboard, closed with Escape and verified focus return. Opened the last photo on mobile and verified Next is disabled.
- Load more reached 48, 72, 96 and 104 photos and then hid its control.
- Cold mobile load with browser cache disabled and a 100 ms / 200 KB-per-second throttle recorded 313,442 bytes over 15 resources before scrolling. This includes uncompressed HTML from the local server, and is within the 600 KB initial budget. No browser warning/error logs were reported during that check.
- Median AVIF sizes: 9 KB at 400 px, 28 KB at 800 px, 58 KB at 1280 px and 123 KB at 2048 px. Maximum 2048 px AVIF size: 264 KB.
- Physical-device Safari and real touch gestures have not yet been tested. Deployed HTML and all 104 small AVIF variants were compared byte-for-byte with the local build; live indexing headers were verified.
