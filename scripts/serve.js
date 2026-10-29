/**
 * Zero-dependency static server for local development.
 * Phones need HTTPS for camera and sensors: run `npm run tunnel` in a second terminal.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../app', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
};

async function resolveFile (pathname) {
    const filePath = resolve(ROOT, `.${ decodeURIComponent(pathname) }`);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) return null; // block ../ escapes
    const info = await stat(filePath).catch(() => null);
    if (!info) return null;
    return info.isDirectory() ? join(filePath, 'index.html') : filePath;
}

const server = createServer(async (request, response) => {
    try {
        const { pathname } = new URL(request.url, 'http://localhost');
        const filePath = await resolveFile(pathname);
        if (!filePath) throw new Error('Not found');

        const body = await readFile(filePath);
        response.writeHead(200, {
            'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        response.end(body);
    } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`SkyPoint running at http://localhost:${ PORT }`);
    console.log('For your phone, run "npm run tunnel" in another terminal and open the https link it prints.');
});
