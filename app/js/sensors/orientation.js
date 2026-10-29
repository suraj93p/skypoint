import { CONFIG } from '../config.js';
import { DEG, cross, lerp, normalize, rotateAboutUp, toAzAlt, wrap180 } from '../math.js';

/*
 * Turns DeviceOrientation events into a camera pose in the local East-North-Up frame:
 *   forward: where the rear camera looks
 *   right, up: the screen's axes in the world (for arrows and projection)
 *
 * Android Chrome: 'deviceorientationabsolute' is already referenced to magnetic north.
 * iOS Safari: alpha is relative to an arbitrary start, so we compute an offset from
 * webkitCompassHeading and blend it slowly. The gyro gives smooth motion, the compass
 * keeps it pointed at north.
 */

const STALE_AFTER_MS = 1500;

function screenAngleDeg () {
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    return ((angle % 360) + 360) % 360;
}

/** W3C rotation R = Rz(alpha) Rx(beta) Ry(gamma); columns are device axes in world space. */
function poseFromEuler (alphaDeg, betaDeg, gammaDeg) {
    const a = alphaDeg * DEG;
    const b = betaDeg * DEG;
    const g = gammaDeg * DEG;
    const [ca, sa, cb, sb, cg, sg] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(g), Math.sin(g)];

    const deviceX = [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg];
    const deviceY = [-sa * cb, ca * cb, sb];
    const deviceZ = [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg];

    // Screen axes follow the UI rotation (portrait, landscape, ...).
    const t = screenAngleDeg() * DEG;
    const [ct, st] = [Math.cos(t), Math.sin(t)];

    return {
        forward: [-deviceZ[0], -deviceZ[1], -deviceZ[2]],
        right: [ct * deviceX[0] - st * deviceY[0], ct * deviceX[1] - st * deviceY[1], ct * deviceX[2] - st * deviceY[2]],
        up: [st * deviceX[0] + ct * deviceY[0], st * deviceX[1] + ct * deviceY[1], st * deviceX[2] + ct * deviceY[2]],
        deviceTop: deviceY,
    };
}

const rotatePose = (pose, degrees) => ({
    forward: rotateAboutUp(pose.forward, degrees),
    right: rotateAboutUp(pose.right, degrees),
    up: rotateAboutUp(pose.up, degrees),
});

export function createOrientationSensor () {
    let source = 'none'; // 'absolute' | 'compass' | 'none'
    let listening = false;
    let latest = null;
    let smoothed = null;
    let lastEventAt = 0;
    let lastReadAt = 0;
    let compassOffset = null;
    let compassAccuracy = null;

    /** iOS: estimate how far the relative gyro frame is rotated from magnetic north. */
    function updateCompassOffset (pose, heading) {
        const verticalness = pose.forward[2];
        let measuredAzimuth;
        if (Math.abs(verticalness) < 0.6) {
            // Held upright: compass heading follows the rear camera.
            measuredAzimuth = toAzAlt(pose.forward).azimuth;
        } else if (verticalness < -0.9) {
            // Lying flat, screen up: compass heading follows the top edge.
            measuredAzimuth = toAzAlt(pose.deviceTop).azimuth;
        } else if (compassOffset === null) {
            measuredAzimuth = toAzAlt(pose.forward).azimuth;
        } else {
            return; // Steep angles are ambiguous; the gyro holds the last good offset.
        }
        const sample = wrap180(heading - measuredAzimuth);
        compassOffset =
            compassOffset === null ? sample : wrap180(compassOffset + CONFIG.compassBlend * wrap180(sample - compassOffset));
    }

    const handleAbsolute = (event) => {
        if (event.alpha === null) return;
        latest = poseFromEuler(event.alpha, event.beta, event.gamma);
        lastEventAt = performance.now();
    };

    const handleRelative = (event) => {
        if (event.alpha === null) return;
        const pose = poseFromEuler(event.alpha, event.beta, event.gamma);

        if (event.absolute === true) {
            latest = pose;
        } else if (typeof event.webkitCompassHeading === 'number' && event.webkitCompassAccuracy >= 0) {
            compassAccuracy = event.webkitCompassAccuracy;
            updateCompassOffset(pose, event.webkitCompassHeading);
            latest = rotatePose(pose, compassOffset);
        } else {
            return; // Relative-only data cannot tell us where north is.
        }
        lastEventAt = performance.now();
    };

    return {
        /** iOS 13+ needs an explicit grant, and it must be the first await inside a tap handler. */
        async requestPermission () {
            const OrientationEvent = window.DeviceOrientationEvent;
            if (typeof OrientationEvent?.requestPermission !== 'function') return;
            const result = await OrientationEvent.requestPermission();
            if (result !== 'granted') throw new Error('Motion access was declined. It is needed to know where the camera points.');
        },

        start () {
            if (listening) return;
            listening = true;
            if ('ondeviceorientationabsolute' in window) {
                source = 'absolute';
                window.addEventListener('deviceorientationabsolute', handleAbsolute);
            } else {
                source = 'compass';
                window.addEventListener('deviceorientation', handleRelative);
            }
        },

        stop () {
            if (!listening) return;
            listening = false;
            window.removeEventListener('deviceorientationabsolute', handleAbsolute);
            window.removeEventListener('deviceorientation', handleRelative);
        },

        /** Smoothed pose for this frame (true north), or null when no fresh data exists. */
        read (now) {
            if (!latest || now - lastEventAt > STALE_AFTER_MS) return null;
            const target = rotatePose(latest, CONFIG.magneticDeclinationDeg);
            const dt = lastReadAt ? Math.min(now - lastReadAt, 250) : 0;
            lastReadAt = now;

            if (!smoothed) {
                smoothed = target;
                return smoothed;
            }
            // Blend vectors (not angles) so there is no 359 to 0 jump, then rebuild an orthonormal frame.
            const k = 1 - Math.exp(-dt / CONFIG.poseSmoothingMs);
            const forward = normalize(lerp(smoothed.forward, target.forward, k));
            const upHint = normalize(lerp(smoothed.up, target.up, k));
            const right = normalize(cross(forward, upHint));
            smoothed = { forward, right, up: cross(right, forward) };
            return smoothed;
        },

        status: () => ({ source, listening, compassAccuracy, hasData: latest !== null }),
    };
}
