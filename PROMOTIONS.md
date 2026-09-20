# App promotion catalog

The public endpoint is `https://www.blindsidedgames.com/promotions/v1/catalog.json`.
This catalog is independent of the build manifests in the root `promotions/`
folder, which publish IDS web builds.

## Edit and publish

- Edit `public/promotions/v1/catalog.json`: stable ID, enabled flag, copy keyed by
  locale (English required), platform store links, immutable banner path.
- Base blurbs on the linked store description: keep concrete mechanics and the
  game’s own voice. Preserve short original blurbs where practical; shorten
  longer descriptions without inventing slogans. Update existing translations
  alongside English. Copy source URLs are recorded in sources.json.
- Verify platform availability before adding links. Do not copy obsolete links
  from the website portfolio. Demos share their parent game's entry. Whitecell
  and website prototypes are excluded.
- Bump revision for each update. A valid empty games array removes all promotions.
  Remove a platform link to delist just that platform; enabled=false disables
  the whole entry. Current clients revalidate on startup and when opening More games, with a
  one-minute request throttle; background resume checks use a six-hour window.
- Add original official gameplay captures to `source-assets/promotions/originals`
  and their source URLs/paths to `sources.json`. Run `npm run promotions:build`.
  The recipe produces 960×540 WebP, quality 86, below 250 KiB. Landscape shots are
  cover-cropped; portrait gameplay uses three panels without losing the UI.
  Keep titles and marketing copy outside artwork. Inspect all exported banners.
- Run `npm run promotions:check` and `npm run build`, then deploy via the existing
  Pages workflow. Verify CORS `*`, JSON type, ETag, and the image's immutable cache
  header. Keep old hashed images available for clients with older catalogs.
- Roll back by restoring the prior games array/image references with a new
  revision. Publish compatible additive changes under schemaVersion 1; breaking
  changes require a new endpoint version.

IDS can refresh its shipped fallback using `npm run promotions:sync --
/path/to/website/public/promotions` from its own checkout. The website remains
canonical. Per-game translations live in this catalog; English fallback is
intentional for titles without translated copy. No reward rules, tracking IDs,
accounts, or analytics belong here.

## Initial inventory (20 September 2026)

Verified against the official [App Store developer listing](https://apps.apple.com/au/developer/blindsided-games/id1538856129),
[Google Play developer listing](https://play.google.com/store/apps/dev?id=8315705273233616064),
and [Steam publisher listing](https://store.steampowered.com/curator/45715273/).

| Platform | Entries before self-exclusion |
| --- | --- |
| iOS | Pulse Citadel, The Daily Quiz, Echoes of Vasteria, Eternum Inc, Nanite, Nebula Navigator, Skrimp Fall, Idle Sheep Counter, IDS, Idle SpaceFlight, RocketMania |
| Android | Pulse Citadel, Echoes of Vasteria, Eternum Inc, Nanite, IDS |
| Desktop/web | Echoes of Vasteria, Rocket Mania, Stupid Space Shooter, IDS |

Availability varies by store region and should be rechecked when editing.
Sources for individual banner compositions are recorded alongside the original
artwork. Portrait captures were requested at up to 1600px from Apple's official
media service; Steam gameplay uses the original full-size screenshot URLs.

Blindsided Labs was removed from promotions by request on 20 September 2026.
Its previously published hashed banner remains available for older cached catalogs.
Stupid Space Shooter was rechecked and remains purchasable on Steam.
