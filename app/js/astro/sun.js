import { DEG, wrap360 } from '../math.js';
import { J2000 } from './time.js';

/**
 * Geocentric ecliptic position of the Sun.
 * Low-precision formula from the Astronomical Almanac, good to about 0.01 deg for 1950 to 2050.
 */
export function sunEcliptic (jd) {
    const d = jd - J2000;
    const meanAnomaly = (357.529 + 0.98560028 * d) * DEG;
    const meanLongitude = 280.459 + 0.98564736 * d;

    return {
        longitude: wrap360(meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)),
        latitude: 0,
        distanceAu: 1.00014 - 0.01671 * Math.cos(meanAnomaly) - 0.00014 * Math.cos(2 * meanAnomaly),
    };
}
