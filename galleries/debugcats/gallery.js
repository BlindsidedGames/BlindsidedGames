const photos = JSON.parse(document.querySelector('#photo-data').textContent);
const links = [...document.querySelectorAll('.photo')];
const more = document.querySelector('#load-more');
const progress = document.querySelector('#progress');
let visible = Math.min(24, photos.length);
links.forEach((link, index) => { link.hidden = index >= visible; });
more.hidden = visible >= photos.length;
more.addEventListener('click', () => {
  const firstNew = visible;
  visible = Math.min(visible + 24, photos.length);
  links.forEach((link, index) => { link.hidden = index >= visible; });
  document.querySelectorAll('.photo-batch').forEach((batch, index) => { batch.hidden = index * 24 >= visible; });
  progress.textContent = `${visible} of ${photos.length} photos`;
  more.hidden = visible === photos.length;
  links[firstNew]?.focus({ preventScroll: true });
});

const viewer = document.querySelector('#viewer');
const container = document.querySelector('#viewer-image');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const error = document.querySelector('#image-error');
let current = 0;
let returnFocus;

function display(index) {
  current = Math.max(0, Math.min(index, photos.length - 1));
  const photo = photos[current];
  const picture = document.createElement('picture');
  const candidates = photo.variants.filter(v => v.size >= Math.min(1280, Math.max(...photo.variants.map(v => v.size))));
  for (const format of ['avif', 'webp']) {
    const source = document.createElement('source');
    source.type = `image/${format}`;
    source.srcset = candidates.filter(v => v.format === format).map(v => `${v.src} ${v.width}w`).join(', ');
    source.sizes = '(max-width: 640px) calc(100vw - 24px), calc(100vw - 200px)';
    picture.append(source);
  }
  const image = document.createElement('img');
  const fallback = candidates.find(v => v.format === 'webp');
  image.src = fallback.src;
  image.width = fallback.width;
  image.height = fallback.height;
  image.alt = photo.alt;
  image.decoding = 'async';
  image.addEventListener('error', () => { if (container.contains(image)) error.hidden = false; });
  picture.append(image);
  error.hidden = true;
  container.replaceChildren(picture);
  document.querySelector('#viewer-count').textContent = `${String(current + 1).padStart(2, '0')} / ${photos.length}`;
  document.querySelector('#viewer-caption').textContent = photo.alt;
  previous.disabled = current === 0;
  next.disabled = current === photos.length - 1;
}

document.querySelectorAll('[data-photo]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    returnFocus = link;
    display(Number(link.dataset.photo));
    viewer.showModal();
    document.querySelector('#close').focus();
  });
});
document.querySelector('#close').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => { container.replaceChildren(); returnFocus?.focus({ preventScroll: true }); });
previous.addEventListener('click', () => display(current - 1));
next.addEventListener('click', () => display(current + 1));
document.querySelector('#retry').addEventListener('click', () => display(current));
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    display(current + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
let touchStart;
container.addEventListener('touchstart', event => {
  touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
container.addEventListener('touchend', event => {
  if (!touchStart || event.touches.length) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) display(current + (dx < 0 ? 1 : -1));
  touchStart = null;
}, { passive: true });
