import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const archive = process.argv[2];
if (!archive) throw new Error('Usage: npm run gallery:images -- /path/to/archive');
const source = JSON.parse(await readFile(path.join(archive, 'manifest.json'), 'utf8'));
const descriptions = JSON.parse(await readFile(path.join(root, 'galleries/debugcats/descriptions.json'), 'utf8'));
const photos = source.files.filter(file => file.kind === 'photo');
if (photos.length !== descriptions.length) throw new Error('Every photo needs a reviewed description.');
const target = path.join(root, 'galleries/debugcats/assets');
await mkdir(target, { recursive: true });
const output = [];
// Only photo records enter this pipeline. Source metadata and signed URLs stay local.
for (const [index, photo] of photos.entries()) {
  const input = await readFile(path.join(archive, photo.filename));
  if (createHash('sha256').update(input).digest('hex') !== photo.sha256) throw new Error(`Archive checksum failed: ${photo.filename}`);
  const metadata = await sharp(input).metadata();
  const longEdge = Math.max(metadata.width, metadata.height);
  const sizes = [...new Set([400, 800, 1280, 2048].map(size => Math.min(size, longEdge)))];
  const variants = [];
  for (const size of sizes) {
    for (const format of ['avif', 'webp']) {
      const pipeline = sharp(input).rotate().resize(size, size, { fit: 'inside', withoutEnlargement: true }).toColourspace('srgb');
      const { data, info } = await pipeline[format]({ quality: format === 'avif' ? 50 : 80, effort: 4 }).toBuffer({ resolveWithObject: true });
      const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
      const filename = `cat-${String(index + 1).padStart(3, '0')}-${size}-${hash}.${format}`;
      await writeFile(path.join(target, filename), data);
      variants.push({ src: `assets/${filename}`, width: info.width, height: info.height, bytes: data.length, format, size });
    }
  }
  output.push({ id: index + 1, alt: descriptions[index], variants });
  if ((index + 1) % 10 === 0) console.log(`Prepared ${index + 1}/${photos.length} photos`);
}
await writeFile(path.join(root, 'galleries/debugcats/photos.json'), JSON.stringify(output) + '\n');
console.log(`Prepared ${output.length} photos; ${(output.flatMap(p => p.variants).reduce((sum, v) => sum + v.bytes, 0) / 1e6).toFixed(1)} MB across all formats and sizes.`);
