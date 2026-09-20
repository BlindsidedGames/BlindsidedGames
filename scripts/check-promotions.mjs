import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const publicRoot = new URL('../public/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('promotions/v1/catalog.json', publicRoot), 'utf8'));
if (catalog.schemaVersion !== 1 || !catalog.revision || !Array.isArray(catalog.games) || catalog.games.length > 100) throw new Error('Invalid catalog');
const ids = new Set();
const origins = new Set(['https://apps.apple.com', 'https://play.google.com', 'https://store.steampowered.com', 'https://www.blindsidedgames.com', 'https://ids.blindsidedgames.com']);
for (const game of catalog.games) {
  if (!/^[a-z0-9-]+$/.test(game.id) || ids.has(game.id) || typeof game.enabled !== 'boolean' ||
      !game.copy?.en?.title || !game.copy.en.description || !game.links ||
      !/^\/promotions\/images\/[a-z0-9-]+\.[a-f0-9]{12}\.webp$/.test(game.banner)) throw new Error(`Invalid entry: ${game.id}`);
  ids.add(game.id);
  for (const [platform, link] of Object.entries(game.links)) {
    const url = new URL(link);
    if (!['ios', 'android', 'web', 'desktop'].includes(platform) || !origins.has(url.origin) || url.username || url.password ||
        (platform === 'ios' && url.origin !== 'https://apps.apple.com') ||
        (platform === 'android' && url.origin !== 'https://play.google.com')) throw new Error(`Invalid link: ${game.id}`);
  }
  const bytes = await readFile(new URL(game.banner.slice(1), publicRoot));
  const metadata = await sharp(bytes).metadata();
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  if (bytes.length > 250 * 1024 || metadata.format !== 'webp' || metadata.width !== 960 || metadata.height !== 540 ||
      !game.banner.endsWith(`.${hash}.webp`)) throw new Error(`Invalid artwork: ${game.id}`);
}
console.log(`Validated ${ids.size} promotion entries, destinations, and banners.`);
