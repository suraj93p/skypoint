/**
 * Draws the app icon and writes PNGs with nothing but Node's zlib.
 * Run once: npm run icons
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const OUT_DIR = new URL('../app/icons/', import.meta.url);
const SIZES = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };

/* ---------- Minimal PNG encoder (RGBA, 8-bit) ---------- */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32 (buffer) {
    let c = 0xffffffff;
    for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk (type, data) {
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
}

function encodePng (size, pixels) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(size, 0);
    header.writeUInt32BE(size, 4);
    header[8] = 8; // bit depth
    header[9] = 6; // colour type RGBA

    const stride = size * 4;
    const raw = Buffer.alloc((stride + 1) * size); // each row starts with filter byte 0
    for (let y = 0; y < size; y += 1) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/* ---------- Icon artwork: a gold crescent inside a sighting ring ---------- */
const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const SKY_TOP = hex('#1a2350');
const SKY_BOTTOM = hex('#070b1c');
const GOLD = hex('#f6b941');
const PEARL = hex('#d7def5');

const mix = (a, b, t) => a.map((channel, i) => channel + (b[i] - channel) * t);
const coverage = (signedDistance, pixel) => Math.min(1, Math.max(0, 0.5 - signedDistance / pixel));

function box (x, y, halfWidth, halfHeight) {
    const dx = Math.abs(x) - halfWidth;
    const dy = Math.abs(y) - halfHeight;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
}

function shade (x, y, pixel) {
    // x, y in [-1, 1]; everything important stays inside the maskable safe circle (r = 0.8).
    let color = mix(SKY_TOP, SKY_BOTTOM, (y + 1) / 2);
    const r = Math.hypot(x, y);

    color = mix(color, GOLD, 0.28 * Math.max(0, 1 - r / 0.62) ** 2); // glow

    const ring = Math.abs(r - 0.47) - 0.022;
    color = mix(color, PEARL, 0.9 * coverage(ring, pixel));

    const ticks = Math.min(box(x, y - 0.6, 0.022, 0.07), box(x, y + 0.6, 0.022, 0.07), box(x - 0.6, y, 0.07, 0.022), box(x + 0.6, y, 0.07, 0.022));
    color = mix(color, PEARL, 0.9 * coverage(ticks, pixel));

    const disc = coverage(r - 0.26, pixel);
    const bite = coverage(Math.hypot(x - 0.13, y + 0.08) - 0.23, pixel);
    color = mix(color, GOLD, disc * (1 - bite));

    return color;
}

function renderIcon (size) {
    const pixels = Buffer.alloc(size * size * 4);
    const pixel = 2 / size;
    for (let py = 0; py < size; py += 1) {
        for (let px = 0; px < size; px += 1) {
            const [r, g, b] = shade((px + 0.5) * pixel - 1, (py + 0.5) * pixel - 1, pixel);
            const i = (py * size + px) * 4;
            pixels[i] = Math.round(r);
            pixels[i + 1] = Math.round(g);
            pixels[i + 2] = Math.round(b);
            pixels[i + 3] = 255;
        }
    }
    return encodePng(size, pixels);
}

await mkdir(OUT_DIR, { recursive: true });
for (const [name, size] of Object.entries(SIZES)) {
    await writeFile(new URL(name, OUT_DIR), renderIcon(size));
    console.log(`icons/${ name } (${ size }x${ size })`);
}
