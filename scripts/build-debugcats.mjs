import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'galleries/debugcats');
const output = path.join(root, 'dist-debugcats');
const photos = JSON.parse(await readFile(path.join(source, 'photos.json'), 'utf8'));
if (!photos.length || photos.some(p => !p.alt || !p.variants.length)) throw new Error('Gallery metadata is incomplete.');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function picture(photo, feature = false) {
  const variants = photo.variants.filter(v => v.size <= 800);
  const sizes = feature ? '(max-width: 640px) calc(100vw - 40px), (max-width: 1050px) 45vw, 570px' : '(max-width: 640px) calc((100vw - 52px) / 2), (max-width: 1050px) calc((100vw - 108px) / 3), (max-width: 1440px) calc((100vw - 182px) / 4), 315px';
  const sources = ['avif', 'webp'].map(format => `<source type="image/${format}" srcset="${variants.filter(v => v.format === format).map(v => `${v.src} ${v.width}w`).join(', ')}" sizes="${sizes}">`).join('');
  const fallback = variants.find(v => v.format === 'webp' && v.size === (feature ? 800 : 400));
  return `<picture>${sources}<img src="${fallback.src}" width="${fallback.width}" height="${fallback.height}" alt="${escape(photo.alt)}" ${feature ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}
const cards = photos.map((photo, index) => `<a class="photo" ${index >= 24 ? 'hidden' : ''} data-photo="${index}" href="${photo.variants.filter(v => v.format === 'webp').at(-1).src}" aria-label="Open photo ${index + 1}: ${escape(photo.alt)}">${picture(photo)}<span class="photo-label" aria-hidden="true">${String(index + 1).padStart(2, '0')} ↗</span></a>`);
const batches = Array.from({ length: Math.ceil(cards.length / 24) }, (_, i) => `<div class="photo-batch" ${i > 0 ? 'hidden' : ''}>${cards.slice(i * 24, (i + 1) * 24).join('\n')}</div>`).join('\n');
// One dedicated output prevents the main site's sitemap, routes and Functions being published here.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const template = await readFile(path.join(source, 'index.html'), 'utf8');
await writeFile(path.join(output, 'index.html'), template.replace('<!-- FEATURE -->', picture(photos[16], true)).replace('<!-- PHOTOS -->', batches).replace('</body>', `<script id="photo-data" type="application/json">${JSON.stringify(photos).replace(/</g, '\\u003c')}</script></body>`));
for (const file of ['gallery.css', 'gallery.js', 'noscript.css', 'assets']) await cp(path.join(source, file), path.join(output, file), { recursive: true });
// Reuse the main website logo directly so branding has one source of truth.
await cp(path.join(root, 'img/logo.jpg'), path.join(output, 'brand.jpg'));
await writeFile(path.join(output, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow, noimageindex\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src \'self\'; img-src \'self\'; style-src \'self\'; script-src \'self\'; object-src \'none\'; base-uri \'none\'; frame-ancestors \'none\'\n\n/\n  Cache-Control: public, max-age=0, must-revalidate\n\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
await writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\n');
await writeFile(path.join(output, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width"><title>Photo not found · Debug Cats</title><body style="background:#101115;color:#f0eee9;font-family:system-ui;padding:3rem"><h1>This cat wandered off.</h1><a style="color:#bca9eb" href="/">Back to Debug Cats</a></body></html>');
console.log(`Built ${photos.length} photos into dist-debugcats. No videos, source archive, or main-site routes included.`);
