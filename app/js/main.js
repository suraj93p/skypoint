import { getBodyPosition } from './astro/index.js';
import { CONFIG } from './config.js';
import { createGuidance } from './core/guidance.js';
import { fromAzAlt } from './math.js';
import { createOverlay } from './render/overlay.js';
import { createCamera } from './sensors/camera.js';
import { createLocationWatcher } from './sensors/location.js';
import { createOrientationSensor } from './sensors/orientation.js';
import { createStore } from './store.js';
import { createHud } from './ui/hud.js';

const STORAGE_KEYS = { body: 'skypoint:body', observer: 'skypoint:observer' };

const storage = {
    read (key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    },
    write (key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            /* Private mode or full storage: the app still works, it just forgets. */
        }
    },
};

const elements = {
    app: document.querySelector('.app'),
    video: document.querySelector('.app__camera'),
    canvas: document.querySelector('.app__overlay'),
    toggle: document.querySelector('.target-toggle'),
    toggleOptions: [...document.querySelectorAll('.target-toggle__option')],
    startButton: document.querySelector('.gate__button'),
    gateError: document.querySelector('.gate__error'),
};

const store = createStore({
    phase: 'idle', // idle | starting | running | error
    body: storage.read(STORAGE_KEYS.body) === 'moon' ? 'moon' : 'sun',
    observer: storage.read(STORAGE_KEYS.observer), // last known location, so we can start instantly
    error: null,
});

const camera = createCamera(elements.video);
const orientation = createOrientationSensor();
const guidance = createGuidance();
const overlay = createOverlay(elements.canvas, elements.video);
const hud = createHud(elements.app);
const location = createLocationWatcher({
    onChange (observer) {
        store.set({ observer });
        storage.write(STORAGE_KEYS.observer, observer);
    },
    onError (error) {
        if (!store.get().observer) store.set({ error: error.message });
    },
});

/* ---------- Frame loop: pulls sensor data, never pushed by it ---------- */

let frameId = 0;
let target = { body: null, position: null, vector: null, computedAt: 0 };

function refreshTarget (now) {
    const { body, observer } = store.get();
    if (!observer) return;
    const bodyChanged = body !== target.body;
    if (!bodyChanged && now - target.computedAt < CONFIG.ephemerisIntervalMs) return;

    const position = getBodyPosition(body, new Date(), observer);
    if (bodyChanged) guidance.reset();
    target = { body, position, vector: fromAzAlt(position.azimuth, position.altitude), computedAt: now };
}

function frame (now) {
    refreshTarget(now);
    const { body, observer, error } = store.get();
    const pose = orientation.read(now);
    const result = pose && target.vector ? guidance.compute(pose, target.vector, now) : null;

    overlay.draw({ pose, body, targetVector: target.vector, guidance: result });
    hud.render({ body, observer, error, targetPosition: target.position, pose, sensor: orientation.status(), guidance: result });
    frameId = requestAnimationFrame(frame);
}

/* ---------- Start flow (one tap grants everything) ---------- */

async function start () {
    if (store.get().phase === 'starting') return;
    store.set({ phase: 'starting', error: null });
    try {
        await orientation.requestPermission(); // must stay the first await for iOS
        await camera.start();
        orientation.start();
        location.start();
        store.set({ phase: 'running' });
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(frame);
    } catch (error) {
        const message =
            error?.name === 'NotAllowedError'
                ? 'Camera access was declined. Allow it in your browser settings, then tap Start again.'
                : error?.message || 'Something blocked the start. Tap Start to try again.';
        store.set({ phase: 'error', error: message });
    }
}

function selectBody (event) {
    const option = event.target.closest('[data-body]');
    if (!option) return;
    store.set({ body: option.dataset.body });
    storage.write(STORAGE_KEYS.body, option.dataset.body);
}

async function handleVisibilityChange () {
    // iOS stops the camera when the app is backgrounded; bring it back on return.
    if (document.visibilityState !== 'visible' || store.get().phase !== 'running' || camera.isLive()) return;
    try {
        await camera.start();
    } catch {
        store.set({ phase: 'error', error: 'The camera stopped. Tap Start to resume.' });
    }
}

/* ---------- Reflect state in the DOM ---------- */

store.subscribe(({ phase, body, error }) => {
    elements.app.dataset.phase = phase;
    elements.app.dataset.body = body;
    elements.toggleOptions.forEach((option) => option.setAttribute('aria-checked', String(option.dataset.body === body)));
    elements.gateError.textContent = error ?? '';
    elements.gateError.hidden = !error;
    elements.startButton.textContent = phase === 'starting' ? 'Starting…' : 'Start';
});

/* ---------- Wiring: each handler is a stable reference, bound once ---------- */

elements.startButton.addEventListener('click', start);
elements.toggle.addEventListener('click', selectBody);
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('resize', overlay.resize);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
        /* Offline support is a bonus; the app runs without it. */
    });
}
