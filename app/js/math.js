/**
 * Small vector and angle helpers.
 * World vectors are [east, north, up] unit vectors (local horizon frame).
 */
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const wrap360 = (deg) => ((deg % 360) + 360) % 360;
export const wrap180 = (deg) => wrap360(deg + 180) - 180;

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
export const length = (a) => Math.hypot(a[0], a[1], a[2]);
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function normalize (a) {
    const len = length(a) || 1;
    return [a[0] / len, a[1] / len, a[2] / len];
}

/** Angle between two unit vectors. atan2 form stays precise for tiny angles. */
export const angleBetweenDeg = (a, b) => Math.atan2(length(cross(a, b)), dot(a, b)) * RAD;

/** Azimuth (clockwise from north) and altitude to a world vector. */
export function fromAzAlt (azimuthDeg, altitudeDeg) {
    const az = azimuthDeg * DEG;
    const alt = altitudeDeg * DEG;
    return [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
}

export function toAzAlt (vector) {
    const [east, north, up] = normalize(vector);
    return {
        azimuth: wrap360(Math.atan2(east, north) * RAD),
        altitude: Math.asin(clamp(up, -1, 1)) * RAD,
    };
}

/** Rotates a world vector around the vertical axis. Positive degrees increase its azimuth. */
export function rotateAboutUp (vector, degrees) {
    const r = degrees * DEG;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [vector[0] * c + vector[1] * s, -vector[0] * s + vector[1] * c, vector[2]];
}
