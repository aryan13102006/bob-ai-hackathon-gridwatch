import {cp, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supplied = process.env.GRIDWATCH_API_URL;
if (!supplied) throw new Error('Set GRIDWATCH_API_URL to the deployed Render HTTPS URL before building.');
const origin = new URL(supplied);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('GRIDWATCH_API_URL must be a plain HTTPS origin, such as https://your-service.onrender.com');
}
const dist = path.join(root, 'dist');
await mkdir(dist, {recursive: true});
await cp(path.join(root, 'src/web'), dist, {recursive: true});
// Vercel Build Output API lets an environment variable choose the external API
// origin without putting secrets or account-specific URLs in the source tree.
const output = path.join(root, '.vercel/output');
await mkdir(path.join(output, 'static'), {recursive: true});
await cp(dist, path.join(output, 'static'), {recursive: true});
await writeFile(path.join(output, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    {src: '/api/(.*)', dest: `${origin.origin}/api/$1`},
    {handle: 'filesystem'},
    {src: '/.*', status: 404}
  ]
}, null, 2));
console.log(`Built GridWatch static frontend; /api requests proxy to ${origin.origin}`);
