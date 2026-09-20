import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const source = new URL('../source-assets/promotions/', import.meta.url);
const output = new URL('../public/promotions/images/', import.meta.url);
const catalogPath = new URL('../public/promotions/v1/catalog.json', import.meta.url);
const sources = JSON.parse(await readFile(new URL('sources.json', source), 'utf8'));
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
await mkdir(output, { recursive: true });
for (const game of catalog.games) {
  const recipe = sources[game.id];
  const files = recipe.images.map(image => new URL(image.file, source));
  const first = await sharp(await readFile(files[0])).metadata();
  let banner;
  if (first.width / first.height > 1.3) {
    banner = sharp(await readFile(files[0])).resize(960, 540, { fit: 'cover' });
  } else {
    // Preserve portrait gameplay in three readable panels rather than cropping away the UI.
    const layers = await Promise.all(files.slice(0, 3).map(async (file, index) => ({
      input: await sharp(await readFile(file)).resize(304, 508, { fit: 'contain', background: recipe.background }).png().toBuffer(),
      left: 16 + index * 312, top: 16,
    })));
    banner = sharp({ create: { width: 960, height: 540, channels: 3, background: recipe.background } }).composite(layers);
  }
  const bytes = await banner.webp({ quality: 86 }).toBuffer();
  if (bytes.length > 250 * 1024) throw new Error(`${game.id} exceeds the image budget`);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const filename = `${game.id}.${hash}.webp`;
  await writeFile(new URL(filename, output), bytes);
  game.banner = `/promotions/images/${filename}`;
  console.log(`${game.id}: ${Math.round(bytes.length / 1024)} KB`);
}
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
