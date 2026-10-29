/** Rear camera feed into a <video>. */
export function createCamera (video) {
    let stream = null;

    async function start () {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera is unavailable here. Open the app over HTTPS.');
        }
        stop();
        stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
        });
        video.srcObject = stream;
        await video.play();
    }

    function stop () {
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        video.srcObject = null;
    }

    const isLive = () => Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live'));

    return { start, stop, isLive };
}
