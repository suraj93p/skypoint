import { DEG, RAD, toAzAlt, wrap360 } from '../math.js';
import { centuriesSinceJ2000, greenwichSiderealDeg } from './time.js';

const meanObliquityDeg = (jd) => 23.439291 - 0.0130042 * centuriesSinceJ2000(jd);

/** Ecliptic longitude/latitude to right ascension/declination (degrees). */
export function eclipticToEquatorial (longitudeDeg, latitudeDeg, jd) {
    const eps = meanObliquityDeg(jd) * DEG;
    const lon = longitudeDeg * DEG;
    const lat = latitudeDeg * DEG;
    const sinDec = Math.sin(lat) * Math.cos(eps) + Math.cos(lat) * Math.sin(eps) * Math.sin(lon);
    const ra = Math.atan2(Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps), Math.cos(lon));
    return { raDeg: wrap360(ra * RAD), decDeg: Math.asin(sinDec) * RAD };
}

/** Atmospheric refraction for a true altitude (Saemundsson). Lifts objects near the horizon by up to ~0.6 deg. */
function refractionDeg (altitudeDeg) {
    if (altitudeDeg < -1) return 0;
    const arcMinutes = 1.02 / Math.tan((altitudeDeg + 10.3 / (altitudeDeg + 5.11)) * DEG);
    return arcMinutes / 60;
}

/**
 * Right ascension/declination to apparent azimuth/altitude for an observer.
 * Pass distanceEarthRadii for nearby bodies (the Moon) to apply topocentric parallax,
 * which shifts the Moon by up to ~1 deg. Leave it out for the Sun.
 */
export function equatorialToHorizontal ({ raDeg, decDeg, distanceEarthRadii = Infinity }, jd, observer) {
    const hourAngle = (greenwichSiderealDeg(jd) + observer.longitude - raDeg) * DEG;
    const dec = decDeg * DEG;
    const lat = observer.latitude * DEG;

    let east = -Math.cos(dec) * Math.sin(hourAngle);
    let north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(hourAngle) * Math.sin(lat);
    let up = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(hourAngle) * Math.cos(lat);

    if (Number.isFinite(distanceEarthRadii)) {
        // Move the origin from Earth's centre to the observer, one Earth radius "up".
        east *= distanceEarthRadii;
        north *= distanceEarthRadii;
        up = up * distanceEarthRadii - 1;
    }

    const { azimuth, altitude } = toAzAlt([east, north, up]);
    return { azimuth, altitude: altitude + refractionDeg(altitude) };
}
