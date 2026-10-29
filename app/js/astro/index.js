import { eclipticToEquatorial, equatorialToHorizontal } from './horizon.js';
import { moonEcliptic } from './moon.js';
import { sunEcliptic } from './sun.js';
import { julianDate } from './time.js';

const EARTH_RADIUS_KM = 6378.14;

export const BODIES = Object.freeze({
    sun: { id: 'sun', label: 'Sun' },
    moon: { id: 'moon', label: 'Moon' },
});

/**
 * Apparent azimuth/altitude of the Sun or Moon, computed on-device. No network needed.
 * @param {'sun' | 'moon'} body
 * @param {Date} date
 * @param {{ latitude: number, longitude: number }} observer  degrees, east and north positive
 */
export function getBodyPosition (body, date, observer) {
    const jd = julianDate(date);

    if (body === 'moon') {
        const { longitude, latitude, distanceKm } = moonEcliptic(jd);
        const equatorial = eclipticToEquatorial(longitude, latitude, jd);
        return equatorialToHorizontal({ ...equatorial, distanceEarthRadii: distanceKm / EARTH_RADIUS_KM }, jd, observer);
    }

    const { longitude, latitude } = sunEcliptic(jd);
    return equatorialToHorizontal(eclipticToEquatorial(longitude, latitude, jd), jd, observer);
}
