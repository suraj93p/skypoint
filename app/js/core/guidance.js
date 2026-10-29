import { CONFIG } from '../config.js';
import { RAD, angleBetweenDeg, dot, toAzAlt, wrap180 } from '../math.js';

const TREND_TIME_CONSTANT_S = 0.25;

/**
 * Compares where the camera points with where the target is.
 *   turn: degrees to rotate left (-) or right (+)
 *   tilt: degrees to tilt down (-) or up (+)
 *   separation: straight-line angle between the two
 *   trend: how the current motion relates to the target
 */
export function createGuidance () {
    let previous = null;
    let separationRate = 0; // deg/s, negative when closing in
    let cameraSpeed = 0; // deg/s

    function classify (separation) {
        if (separation <= CONFIG.onTargetDeg) return 'locked';
        if (cameraSpeed < CONFIG.stillSpeedDegPerSec) return 'still';
        // -1 = moving straight at the target, +1 = straight away, ~0 = sideways (parallel).
        const ratio = separationRate / cameraSpeed;
        if (ratio < -CONFIG.trendRatio) return 'closer';
        if (ratio > CONFIG.trendRatio) return 'away';
        return 'parallel';
    }

    function compute (pose, targetVector, now) {
        const camera = toAzAlt(pose.forward);
        const target = toAzAlt(targetVector);
        const separation = angleBetweenDeg(pose.forward, targetVector);

        if (previous) {
            const dt = (now - previous.time) / 1000;
            if (dt > 0) {
                const k = 1 - Math.exp(-dt / TREND_TIME_CONSTANT_S);
                separationRate += ((separation - previous.separation) / dt - separationRate) * k;
                cameraSpeed += (angleBetweenDeg(pose.forward, previous.forward) / dt - cameraSpeed) * k;
            }
        }
        previous = { separation, forward: pose.forward, time: now };

        return {
            camera,
            target,
            separation,
            turn: wrap180(target.azimuth - camera.azimuth),
            tilt: target.altitude - camera.altitude,
            // Screen direction toward the target: 0 = up, 90 = right (clockwise).
            screenAngle: Math.atan2(dot(targetVector, pose.right), dot(targetVector, pose.up)) * RAD,
            trend: classify(separation),
        };
    }

    function reset () {
        previous = null;
        separationRate = 0;
        cameraSpeed = 0;
    }

    return { compute, reset };
}
