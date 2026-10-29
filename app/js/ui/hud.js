import { BODIES } from '../astro/index.js';

const TREND_TEXT = {
    locked: 'On target',
    still: 'Holding still',
    closer: 'Getting closer',
    away: 'Moving away',
    parallel: 'Moving parallel',
};

const formatDegrees = (value) => `${ Math.round(Math.abs(value)) }°`;

/** Writes HUD text only when it changes, so the 60 fps loop never thrashes layout. */
export function createHud (root) {
    const fields = Object.fromEntries(
        [...root.querySelectorAll('[data-field]')].map((element) => [element.dataset.field, element]),
    );
    const written = new Map();

    function write (name, value, attribute = 'textContent') {
        const key = `${ name }:${ attribute }`;
        if (written.get(key) === value) return;
        written.set(key, value);
        if (attribute === 'textContent') fields[name].textContent = value;
        else fields[name].setAttribute(attribute, value);
    }

    function statusFor ({ body, observer, targetPosition, pose, sensor, error }) {
        const label = BODIES[body].label;
        if (!observer) return error ?? 'Finding your location…';
        if (!sensor.hasData) return 'Waiting for the compass. Move your phone slowly.';
        if (!pose) return 'Compass paused. Keep the app open in front.';
        if (targetPosition && targetPosition.altitude < 0) return `The ${ label } is below the horizon right now.`;
        return `Point the centre ring at the ${ label }.`;
    }

    function render ({ body, observer, targetPosition, pose, sensor, guidance, error }) {
        write('status', statusFor({ body, observer, targetPosition, pose, sensor, error }));
        const meta = targetPosition
            ? `Azimuth ${ targetPosition.azimuth.toFixed(1) }°, altitude ${ targetPosition.altitude.toFixed(1) }°`
            : '';
        write('targetMeta', meta);

        const ready = Boolean(pose && guidance);
        write('guidance', String(ready), 'data-ready');
        if (!ready) return;

        const { turn, tilt, separation, trend } = guidance;
        write('turnLabel', turn >= 0 ? 'Turn right' : 'Turn left');
        write('turnValue', formatDegrees(turn));
        write('tiltLabel', tilt >= 0 ? 'Tilt up' : 'Tilt down');
        write('tiltValue', formatDegrees(tilt));
        write('separation', `${ formatDegrees(separation) } from the ${ BODIES[body].label }`);
        write('trend', TREND_TEXT[trend]);
        write('trend', trend, 'data-trend');
    }

    return { render };
}
