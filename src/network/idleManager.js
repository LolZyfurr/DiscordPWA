export function initIdleManager(sendPayload, getUserSettings) {
    let idleTimer = null;
    let idleDelayTimer = null;
    let isAfk = false;
    let isIdle = false;
    let lastActivityTime = 0;

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowNetwork = connection && ['slow-2g', '2g', '3g'].includes(connection.effectiveType);

    const AFK_TIMEOUT = isSlowNetwork ? 5 * 60 * 1000 : 2 * 60 * 1000;
    const IDLE_DELAY = isSlowNetwork ? 3000 : 1500;
    const THROTTLE_INTERVAL = isSlowNetwork ? 2000 : 1000;
    const POLL_INTERVAL = isSlowNetwork ? 3000 : 1000;

    function getActivities() {
        const settings = getUserSettings();
        const activitiesArr = [];
        const customStatusText = settings?.status?.custom_status?.text;
        if (customStatusText) {
            activitiesArr.push({
                name: 'Custom Status',
                type: 4,
                state: customStatusText,
                emoji: null,
                metadata: {}
            });
        }
        return activitiesArr;
    }

    function setIdleState() {
        if (idleDelayTimer) {
            clearTimeout(idleDelayTimer);
            idleDelayTimer = null;
        }
        idleDelayTimer = setTimeout(() => {
            if (!isAfk && !isIdle) {
                isIdle = true;
                const settings = getUserSettings();
                const originalStatus = settings?.status?.status?.value || settings?.status || 'online';
                sendPayload({
                    op: 3,
                    d: {
                        status: originalStatus == 'online' ? 'idle' : originalStatus,
                        since: Date.now(),
                        activities: getActivities(),
                        idle: true,
                        afk: false
                    }
                });
            }
        }, IDLE_DELAY);
    }

    function resetTimer() {
        if (idleDelayTimer) {
            clearTimeout(idleDelayTimer);
            idleDelayTimer = null;
        }
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        if (isAfk || isIdle) {
            isAfk = false;
            isIdle = false;
            const settings = getUserSettings();
            const originalStatus = settings?.status?.status?.value || settings?.status || 'online';
            sendPayload({
                op: 3,
                d: {
                    status: originalStatus,
                    since: 0,
                    activities: getActivities(),
                    afk: false,
                    idle: false
                }
            });
        }
        idleTimer = setTimeout(() => {
            isAfk = true;
            isIdle = false;
            sendPayload({
                op: 3,
                d: {
                    status: 'invisible',
                    since: Date.now(),
                    activities: getActivities(),
                    afk: true,
                    idle: true
                }
            });
        }, AFK_TIMEOUT);
    }

    if (typeof window !== 'undefined') {
        const handleHighFrequencyActivity = () => {
            const now = Date.now();
            if (now - lastActivityTime > THROTTLE_INTERVAL) {
                lastActivityTime = now;
                if (typeof document === 'undefined' || document.hasFocus()) {
                    resetTimer();
                }
            }
        };

        ['mousemove', 'scroll'].forEach(event => {
            window.addEventListener(event, handleHighFrequencyActivity, { passive: true });
        });

        ['keydown', 'mousedown', 'touchstart'].forEach(event => {
            window.addEventListener(event, () => {
                if (typeof document === 'undefined' || document.hasFocus()) {
                    resetTimer();
                }
            }, { passive: true });
        });

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden || document.visibilityState === 'hidden') {
                    setIdleState();
                } else {
                    resetTimer();
                }
            });

            let lastFocusState = document.hasFocus();
            setInterval(() => {
                const currentFocus = document.hasFocus();
                if (currentFocus !== lastFocusState) {
                    lastFocusState = currentFocus;
                    if (!currentFocus) {
                        setIdleState();
                    } else {
                        resetTimer();
                    }
                }
            }, POLL_INTERVAL);
        }

        window.addEventListener('blur', () => {
            setIdleState();
        });

        window.addEventListener('focus', () => {
            resetTimer();
        });
    }

    resetTimer();
}