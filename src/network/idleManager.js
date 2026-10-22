export function initIdleManager(sendPayload, getUserSettings) {
    let idleTimer = null;
    let idleDelayTimer = null;
    let isAfk = false;
    let isIdle = false;
    const AFK_TIMEOUT = 2 * 60 * 1000;
    const IDLE_DELAY = 1500;
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
        ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(event => {
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
            }, 1000);
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