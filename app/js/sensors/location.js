const ERROR_MESSAGES = {
    1: 'Location access is off. Allow it in your browser settings to locate the Sun and Moon.',
    2: 'Your location could not be determined. Check that location services are on.',
    3: 'Finding your location is taking longer than usual.',
};

/**
 * Watches the device position. City-level accuracy is plenty:
 * moving 10 km changes the Sun's direction by less than 0.1 deg.
 */
export function createLocationWatcher ({ onChange, onError }) {
    let watchId = null;

    const handleSuccess = ({ coords }) =>
        onChange({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
    const handleError = (error) => onError(new Error(ERROR_MESSAGES[error.code] ?? error.message));

    function start () {
        if (watchId !== null) return;
        if (!('geolocation' in navigator)) {
            onError(new Error('Location is not supported on this device.'));
            return;
        }
        watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: false,
            maximumAge: 5 * 60_000,
            timeout: 20_000,
        });
    }

    function stop () {
        if (watchId === null) return;
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    return { start, stop };
}
