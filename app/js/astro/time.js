import { wrap360 } from '../math.js';

const MS_PER_DAY = 86_400_000;
const UNIX_EPOCH_JD = 2440587.5;
export const J2000 = 2451545.0;

/**
 * Julian Date from a JS Date (UTC).
 * We treat UT as TT for the ephemerides; the ~69 s difference moves the Moon by about 0.01 deg.
 */
export const julianDate = (date) => date.getTime() / MS_PER_DAY + UNIX_EPOCH_JD;

export const centuriesSinceJ2000 = (jd) => (jd - J2000) / 36525;

/** Greenwich mean sidereal time in degrees (Meeus 12.4). */
export function greenwichSiderealDeg (jd) {
    const d = jd - J2000;
    const t = d / 36525;
    return wrap360(280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000);
}
