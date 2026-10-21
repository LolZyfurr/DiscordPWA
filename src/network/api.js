import { AppDispatcher } from '../dispatcher/Dispatcher.js';

const DISCORD_API = 'https://discord.com';

// Synchronized client super properties matching the gateway iOS fingerprint
const SUPER_PROPERTIES = btoa(JSON.stringify({
    os: "iOS",
    browser: "Discord iOS",
    device: "iPhone17,3",
    system_locale: "en-US",
    browser_user_agent: "Discord-iOS/350.0 (com.hammerandchisel.discord; build:114851; iOS 18.6.0)",
    browser_version: "350.0",
    os_version: "18.6",
    release_channel: "ptb",
    client_build_number: 114851,
    client_app_version: "350.0"
}));

function getHeaders(token, isJson = false) {
    const headers = {
        'Authorization': token,
        'X-Super-Properties': SUPER_PROPERTIES,
        'X-Discord-Locale': 'en-US'
    };
    if (isJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

let isGatewayConnected = false;
let currentUserCache = null;
let channelsCache = null;
const messagesCache = new Map(); // channelId -> array of messages
const gamesCache = new Map();

AppDispatcher.register((action) => {
    if (action.type === 'GATEWAY_STATUS') {
        if (action.status === 'connected') {
            isGatewayConnected = true;
        } else if (action.status === 'disconnected' || action.status === 'reconnecting') {
            isGatewayConnected = false;
            currentUserCache = null;
            channelsCache = null;
            messagesCache.clear();
            gamesCache.clear();
        }
    } else if (action.type === 'NETWORK_OFFLINE') {
        isGatewayConnected = false;
        currentUserCache = null;
        channelsCache = null;
        messagesCache.clear();
        gamesCache.clear();
    } else if (action.type === 'ADD_MESSAGE') {
        const msg = action.message;
        if (msg && msg.channel_id) {
            const cached = messagesCache.get(msg.channel_id) || [];
            if (cached.some(m => m.id === msg.id)) {
                return;
            }

            let updatedCache;
            if (msg.nonce) {
                const index = cached.findIndex(m => m.nonce === msg.nonce || m.id === msg.nonce);
                if (index !== -1) {
                    updatedCache = [...cached];
                    updatedCache[index] = msg;
                } else {
                    updatedCache = [...cached, msg];
                }
            } else {
                updatedCache = [...cached, msg];
            }
            messagesCache.set(msg.channel_id, updatedCache);
        }
    } else if (action.type === 'DELETE_MESSAGE') {
        const targetId = action.id || action.messageId;
        const channelId = action.channelId;
        if (targetId && channelId && messagesCache.has(channelId)) {
            const filtered = messagesCache.get(channelId).filter(m => m.id !== targetId && m.nonce !== targetId);
            messagesCache.set(channelId, filtered);
        }
    }
});

async function ensureConnected() {
    if (!navigator.onLine) {
        throw new Error('WebSocket is disconnected or offline. API requests are blocked to prevent desync.');
    }
    if (isGatewayConnected) return;

    const startTime = Date.now();
    const timeout = 5000;

    while (!isGatewayConnected) {
        if (!navigator.onLine) {
            throw new Error('WebSocket is disconnected or offline. API requests are blocked to prevent desync.');
        }
        if (Date.now() - startTime > timeout) {
            throw new Error('WebSocket is disconnected or offline. API requests are blocked to prevent desync.');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

export async function fetchCurrentUser(token) {
    await ensureConnected();
    if (currentUserCache) {
        return currentUserCache;
    }
    try {
        const res = await fetch(`${DISCORD_API}/api/v9/users/@me`, {
            headers: getHeaders(token)
        });
        if (!res.ok) {
            if (res.status === 401) {
                AppDispatcher.dispatch({ type: 'AUTH_FAILED' });
            }
            throw new Error('Failed to fetch user');
        }
        currentUserCache = await res.json();
        return currentUserCache;
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function fetchChannels(token) {
    await ensureConnected();
    if (channelsCache) {
        return channelsCache;
    }
    try {
        const res = await fetch(`${DISCORD_API}/api/v9/users/@me/channels`, {
            headers: getHeaders(token)
        });
        if (!res.ok) throw new Error('Failed to fetch DM channels');
        channelsCache = await res.json();
        return channelsCache;
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function fetchMessages(token, channelId, limit = 20, beforeId = null) {
    await ensureConnected();
    if (!beforeId && messagesCache.has(channelId)) {
        const cached = messagesCache.get(channelId);
        if (cached.length >= limit) {
            return cached.slice(-limit).reverse();
        }
    }

    let url = `${DISCORD_API}/api/v9/channels/${channelId}/messages?limit=${limit}`;
    if (beforeId) {
        url += `&before=${beforeId}`;
    }
    try {
        const res = await fetch(url, {
            headers: getHeaders(token)
        });
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();

        const existing = messagesCache.get(channelId) || [];
        const combinedMap = new Map();
        [...data].reverse().forEach(m => combinedMap.set(m.id, m));
        existing.forEach(m => combinedMap.set(m.id, m));
        messagesCache.set(channelId, Array.from(combinedMap.values()));

        return data;
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function sendMessageApi(token, channelId, payloadOrFormData, onProgress = null) {
    await ensureConnected();
    try {
        let newMsg;

        if (payloadOrFormData instanceof FormData) {
            // Use XMLHttpRequest to support upload progress tracking for files
            newMsg = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                let startTime = Date.now();

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable && onProgress) {
                        const loaded = event.loaded;
                        const total = event.total;
                        const percent = Math.round((loaded / total) * 100);

                        const elapsedTime = (Date.now() - startTime) / 1000;
                        const speed = elapsedTime > 0 ? loaded / elapsedTime : 0;
                        const remainingBytes = total - loaded;
                        const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;

                        onProgress({ percent, speed: (speed / 1024).toFixed(1), eta, xhr });
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            reject(new Error('Failed to parse response'));
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
                xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

                xhr.open('POST', `${DISCORD_API}/api/v9/channels/${channelId}/messages`);
                xhr.setRequestHeader('Authorization', token);
                xhr.send(payloadOrFormData);
            });
        } else {
            // Standard JSON fetch for text-only messages
            const res = await fetch(`${DISCORD_API}/api/v9/channels/${channelId}/messages`, {
                method: 'POST',
                headers: getHeaders(token, true),
                body: JSON.stringify(payloadOrFormData)
            });
            if (!res.ok) throw new Error('Failed to send message');
            newMsg = await res.json();
        }

        const cached = messagesCache.get(channelId) || [];
        if (!cached.some(m => m.id === newMsg.id)) {
            messagesCache.set(channelId, [...cached, newMsg]);
        }

        return newMsg;
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function fetchGames(token, gameIds) {
    await ensureConnected();
    if (!gameIds || gameIds.length === 0) return [];

    const uncachedIds = gameIds.filter(id => !gamesCache.has(id));
    if (uncachedIds.length === 0) {
        return gameIds.map(id => gamesCache.get(id));
    }

    const queryParams = uncachedIds.map(id => `game_ids=${id}`).join('&');
    try {
        const res = await fetch(`${DISCORD_API}/api/v9/games?${queryParams}`, {
            headers: getHeaders(token)
        });
        if (!res.ok) throw new Error('Failed to fetch games');
        const data = await res.json();

        const gamesArray = Array.isArray(data) ? data : (data.games || []);
        gamesArray.forEach(game => {
            if (game && game.id) {
                gamesCache.set(game.id, game);
            }
        });

        return gameIds.map(id => gamesCache.get(id)).filter(Boolean);
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function fetchUserProfileApi(token, userId) {
    await ensureConnected();
    try {
        const res = await fetch(`${DISCORD_API}/api/v9/users/${userId}/profile?type=popout&with_mutual_guilds=false&with_mutual_friends=false&with_mutual_friends_count=false`, {
            headers: getHeaders(token)
        });
        if (res.ok) {
            return await res.json();
        } else if (res.status === 404) {
            const userRes = await fetch(`${DISCORD_API}/api/v9/users/${userId}`, {
                headers: getHeaders(token)
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                return { user: userData, isLimited: true };
            }
        }
        return null;
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function editMessageApi(token, channelId, messageId, content) {
    await ensureConnected();
    try {
        const res = await fetch(`${DISCORD_API}/api/v9/channels/${channelId}/messages/${messageId}`, {
            method: 'PATCH',
            headers: getHeaders(token, true),
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed to edit message');
        const updatedMsg = await res.json();
        const cached = messagesCache.get(channelId) || [];
        const index = cached.findIndex(m => m.id === updatedMsg.id);
        if (index !== -1) {
            cached[index] = updatedMsg;
            messagesCache.set(channelId, [...cached]);
        }
        return updatedMsg;
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function deleteMessageApi(token, channelId, messageId) {
    await ensureConnected();
    try {
        const res = await fetch(`${DISCORD_API}/api/v9/channels/${channelId}/messages/${messageId}`, {
            method: 'DELETE',
            headers: getHeaders(token)
        });
        if (!res.ok) throw new Error('Failed to delete message');
        AppDispatcher.dispatch({ type: 'DELETE_MESSAGE', messageId, channelId });
        return true;
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}

export async function fetchGifsApi(token, query) {
    await ensureConnected();
    try {
        const res = await fetch(`${DISCORD_API}/api/v9/gifs/search?q=${encodeURIComponent(query)}&media_format=webm&locale=en-US`, {
            headers: getHeaders(token),
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch GIFs');
        return await res.json();
    } catch (err) {
        if (!navigator.onLine || err.message === 'Failed to fetch') {
            AppDispatcher.dispatch({ type: 'NETWORK_OFFLINE' });
        }
        throw err;
    }
}