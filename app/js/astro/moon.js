import { DEG, wrap360 } from '../math.js';
import { centuriesSinceJ2000 } from './time.js';

/*
 * Geocentric ecliptic position of the Moon.
 * Meeus, Astronomical Algorithms (2nd ed.), chapter 47, keeping the largest periodic terms.
 * Accuracy is a few hundredths of a degree, far finer than any phone compass.
 */

// [D, M, M', F, longitude (1e-6 deg), distance (1e-3 km)]
const LONGITUDE_DISTANCE_TERMS = [
    [0, 0, 1, 0, 6288774, -20905355],
    [2, 0, -1, 0, 1274027, -3699111],
    [2, 0, 0, 0, 658314, -2955968],
    [0, 0, 2, 0, 213618, -569925],
    [0, 1, 0, 0, -185116, 48888],
    [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158],
    [2, -1, -1, 0, 57066, -152138],
    [2, 0, 1, 0, 53322, -170733],
    [2, -1, 0, 0, 45758, -204586],
    [0, 1, -1, 0, -40923, -129620],
    [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755],
    [2, 0, 0, -2, 15327, 10321],
    [0, 0, 1, 2, -12528, 0],
    [0, 0, 1, -2, 10980, 79661],
    [4, 0, -1, 0, 10675, -34782],
    [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636],
    [2, 1, -1, 0, -7888, 24208],
    [2, 1, 0, 0, -6766, 30824],
    [1, 0, -1, 0, -5163, -8379],
    [1, 1, 0, 0, 4987, -16675],
    [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445],
    [4, 0, 0, 0, 3861, -11650],
    [2, 0, -3, 0, 3665, 14403],
    [0, 1, -2, 0, -2689, -7003],
    [2, 0, -1, 2, -2602, 0],
    [2, -1, -2, 0, 2390, 10056],
    [1, 0, 1, 0, -2348, 6322],
    [2, -2, 0, 0, 2236, -9884],
];

// [D, M, M', F, latitude (1e-6 deg)]
const LATITUDE_TERMS = [
    [0, 0, 0, 1, 5128122],
    [0, 0, 1, 1, 280602],
    [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573],
    [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266],
    [0, 0, 2, -1, 8822],
    [2, -1, 0, -1, 8216],
    [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200],
    [2, 1, 0, -1, -3359],
    [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065],
    [0, 1, -1, -1, -1870],
    [4, 0, -1, -1, 1828],
    [0, 1, 0, 1, -1794],
];

export function moonEcliptic (jd) {
    const t = centuriesSinceJ2000(jd);
    const t2 = t * t;

    const meanLongitude = wrap360(218.3164477 + 481267.88123421 * t - 0.0015786 * t2);
    const elongation = wrap360(297.8501921 + 445267.1114034 * t - 0.0018819 * t2) * DEG;
    const sunAnomaly = wrap360(357.5291092 + 35999.0502909 * t - 0.0001536 * t2) * DEG;
    const moonAnomaly = wrap360(134.9633964 + 477198.8675055 * t + 0.0087414 * t2) * DEG;
    const latitudeArg = wrap360(93.272095 + 483202.0175233 * t - 0.0036539 * t2) * DEG;
    const a1 = (119.75 + 131.849 * t) * DEG;
    const a2 = (53.09 + 479264.29 * t) * DEG;
    const a3 = (313.45 + 481266.484 * t) * DEG;
    const eccentricity = 1 - 0.002516 * t - 0.0000074 * t2;
    const L = meanLongitude * DEG;

    const argument = (d, m, mp, f) => d * elongation + m * sunAnomaly + mp * moonAnomaly + f * latitudeArg;
    const eFactor = (m) => eccentricity ** Math.abs(m);

    let sumLongitude = 0;
    let sumDistance = 0;
    for (const [d, m, mp, f, lon, dist] of LONGITUDE_DISTANCE_TERMS) {
        const arg = argument(d, m, mp, f);
        const e = eFactor(m);
        sumLongitude += lon * e * Math.sin(arg);
        sumDistance += dist * e * Math.cos(arg);
    }

    let sumLatitude = 0;
    for (const [d, m, mp, f, lat] of LATITUDE_TERMS) {
        sumLatitude += lat * eFactor(m) * Math.sin(argument(d, m, mp, f));
    }

    sumLongitude += 3958 * Math.sin(a1) + 1962 * Math.sin(L - latitudeArg) + 318 * Math.sin(a2);
    sumLatitude +=
        -2235 * Math.sin(L) +
        382 * Math.sin(a3) +
        175 * Math.sin(a1 - latitudeArg) +
        175 * Math.sin(a1 + latitudeArg) +
        127 * Math.sin(L - moonAnomaly) -
        115 * Math.sin(L + moonAnomaly);

    return {
        longitude: wrap360(meanLongitude + sumLongitude / 1e6),
        latitude: sumLatitude / 1e6,
        distanceKm: 385000.56 + sumDistance / 1000,
    };
}
