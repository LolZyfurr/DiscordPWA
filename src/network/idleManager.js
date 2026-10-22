export function initIdleManager(sendPayload, getUserSettings) {
    let idleTimer = null;
    let idleDelayTimer = null;
    let isAfk = false;
    let isIdle = false;
    const AFK_TIMEOUT = 2 * 60 * 1000; // 2 minutes
    const IDLE_DELAY = 1500; // 1500 millisecond period

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
                console.log("[IdleManager] Setting status to idle (unfocused/hidden after 1500ms period)");

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
            console.log("[IdleManager] Activity detected, restoring original status (isAfk:", isAfk, "isIdle:", isIdle, ")");
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

        console.log("[IdleManager] Resetting AFK timer for 2 minutes.");
        idleTimer = setTimeout(() => {
            isAfk = true;
            isIdle = false;
            console.log("[IdleManager] AFK timeout reached (2 mins). Setting status to invisible.");

            // Set AFK after 2 minutes and switch status to invisible
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

    // Listen to user activity across DOM events in browser/client environment
    if (typeof window !== 'undefined') {
        ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(event => {
            window.addEventListener(event, () => {
                // Only trigger activity reset if the window actually has focus (prevents hover from waking up an unfocused window)
                if (typeof document === 'undefined' || document.hasFocus()) {
                    console.log(`[IdleManager] Event triggered: ${event}`);
                    resetTimer();
                } else {
                    console.log(`[IdleManager] Event ignored (window not focused): ${event}`);
                }
            }, { passive: true });
        });

        // Use visibilitychange for standard environments
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                console.log(`[IdleManager] visibilitychange event: state=${document.visibilityState}, hidden=${document.hidden}`);
                if (document.hidden || document.visibilityState === 'hidden') {
                    setIdleState();
                } else {
                    resetTimer();
                }
            });

            // Poll document.hasFocus() every second with explicit debug output to check sandbox state
            let lastFocusState = document.hasFocus();
            console.log(`[IdleManager] Initial document.hasFocus(): ${lastFocusState}`);

            setInterval(() => {
                const currentFocus = document.hasFocus();
                if (currentFocus !== lastFocusState) {
                    lastFocusState = currentFocus;
                    console.log(`[IdleManager] document.hasFocus() CHANGED to: ${currentFocus}`);
                    if (!currentFocus) {
                        setIdleState();
                    } else {
                        resetTimer();
                    }
                }
            }, 1000);
        }

        window.addEventListener('blur', () => {
            console.log("[IdleManager] RAW window blur event fired!");
            setIdleState();
        });

        window.addEventListener('focus', () => {
            console.log("[IdleManager] RAW window focus event fired!");
            resetTimer();
        });
    }

    // Initialize timer on start
    console.log("[IdleManager] Initialized");
    resetTimer();
}