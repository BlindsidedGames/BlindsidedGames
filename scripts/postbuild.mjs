import { copyFile, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

const filesToCopy = [
  'CNAME',
  'app-ads.txt',
  'newsTicker',
  'style.css',
  'questing.html'
];

const directoriesToCopy = ['games', 'icons', 'img', 'quizzes', 'moodboards'];

await mkdir(distDir, { recursive: true });

for (const fileName of filesToCopy) {
  await copyFile(path.join(root, fileName), path.join(distDir, fileName));
}

for (const dirName of directoriesToCopy) {
  await cp(path.join(root, dirName), path.join(distDir, dirName), {
    recursive: true,
    force: true
  });
}
