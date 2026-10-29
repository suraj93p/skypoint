import { CONFIG } from '../config.js';
import { DEG, dot } from '../math.js';

const COLORS = {
    sun: '#f6b941',
    moon: '#d7def5',
    reticle: 'rgba(242, 244, 250, 0.9)',
    shadow: 'rgba(3, 6, 18, 0.55)',
};

/** Canvas layer over the camera: reticle, target marker, off-screen arrow (and later the orbit). */
export function createOverlay (canvas, video) {
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;

    function resize () {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Pixels per unit of tan(angle), matching the video's object-fit: cover scaling. */
    function focalLengthPx () {
        const videoWidth = video.videoWidth || width;
        const videoHeight = video.videoHeight || height;
        const scale = Math.max(width / videoWidth, height / videoHeight);
        const longSidePx = Math.max(videoWidth, videoHeight) * scale;
        return longSidePx / 2 / Math.tan((CONFIG.cameraLongSideFovDeg * DEG) / 2);
    }

    /** World vector to screen point, or null when it is behind the camera. */
    function project (vector, pose) {
        const depth = dot(vector, pose.forward);
        if (depth < 0.05) return null;
        const f = focalLengthPx();
        return {
            x: width / 2 + (f * dot(vector, pose.right)) / depth,
            y: height / 2 - (f * dot(vector, pose.up)) / depth,
        };
    }

    const isOnScreen = (point, margin) =>
        point && point.x > margin && point.x < width - margin && point.y > margin && point.y < height - margin;

    function withShadow (draw) {
        ctx.save();
        ctx.shadowColor = COLORS.shadow;
        ctx.shadowBlur = 6;
        draw();
        ctx.restore();
    }

    function drawReticle (locked, color) {
        const cx = width / 2;
        const cy = height / 2;
        withShadow(() => {
            ctx.strokeStyle = locked ? color : COLORS.reticle;
            ctx.lineWidth = locked ? 3 : 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                ctx.moveTo(cx + dx * 38, cy + dy * 38);
                ctx.lineTo(cx + dx * 50, cy + dy * 50);
            }
            ctx.stroke();
        });
    }

    function drawTargetMarker (point, color) {
        withShadow(() => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawArrow (screenAngleDeg, color) {
        const radius = Math.min(width, height) * 0.28;
        withShadow(() => {
            ctx.translate(width / 2, height / 2);
            ctx.rotate(screenAngleDeg * DEG);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -radius - 22);
            ctx.lineTo(18, -radius + 8);
            ctx.lineTo(0, -radius);
            ctx.lineTo(-18, -radius + 8);
            ctx.closePath();
            ctx.fill();
        });
    }

    function draw ({ pose, body, targetVector, guidance }) {
        ctx.clearRect(0, 0, width, height);
        if (!pose || !targetVector || !guidance) return;

        const color = COLORS[body];
        const locked = guidance.trend === 'locked';
        drawReticle(locked, color);

        const point = project(targetVector, pose);
        if (isOnScreen(point, 24)) {
            if (!locked) drawTargetMarker(point, color);
        } else {
            drawArrow(guidance.screenAngle, color);
        }
    }

    resize();
    return { draw, resize, project };
}
