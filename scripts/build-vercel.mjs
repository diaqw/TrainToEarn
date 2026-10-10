import './build.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public', { recursive: true });
await writeFile('public/robots.txt', 'User-agent: *\nDisallow: /\n');
console.log('Vercel function ready; all routes require authentication.');
