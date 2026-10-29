/** Tunable values in one place. Adjust these while testing on a real device. */
export const CONFIG = Object.freeze({
    /** Field of view across the camera image's long side, in degrees. Most phone main cameras sit between 62 and 70. */
    cameraLongSideFovDeg: 66,
    /** Pose smoothing time constant in ms. Lower feels snappier, higher feels calmer. */
    poseSmoothingMs: 90,
    /** iOS only: how fast the gyro frame is pulled toward the (noisy) magnetic compass, 0..1 per event. */
    compassBlend: 0.04,
    /** Magnetic declination in degrees, east positive. Converts magnetic north to true north. */
    magneticDeclinationDeg: 0,
    /** Angular distance that counts as "on target". */
    onTargetDeg: 3,
    /** Camera rotation speed below which the phone counts as held still (deg/s). */
    stillSpeedDegPerSec: 4,
    /** Share of the camera's motion that must point toward or away from the target to count as such (0..1). */
    trendRatio: 0.35,
    /** How often the Sun or Moon position is recomputed (ms). */
    ephemerisIntervalMs: 1000,
});
