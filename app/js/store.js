/**
 * Tiny observable store: the vanilla stand-in for React Context.
 * Holds app-level state only. High-frequency sensor data stays in the sensor
 * modules and is pulled by the frame loop, so 60 Hz events never fan out to listeners.
 */
export function createStore (initialState) {
    let state = initialState;
    const listeners = new Set();

    return {
        get: () => state,
        set (patch) {
            state = { ...state, ...patch };
            listeners.forEach((listener) => listener(state));
        },
        subscribe (listener) {
            listeners.add(listener);
            listener(state);
            return () => listeners.delete(listener);
        },
    };
}
