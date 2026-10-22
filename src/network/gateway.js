import { AppDispatcher } from '../dispatcher/Dispatcher.js';
import { decodeUserSettingsProto } from './decoder.js';
import { initIdleManager } from './idleManager.js';
let globalSendPayload = null;
AppDispatcher.register((action) => {
    const channelId = action.channelId || action.channel_id;
    if (['CHANNEL_SELECT', 'SELECT_CHANNEL', 'SWITCH_CHANNEL', 'CHANNEL_SWITCH'].includes(action.type) && globalSendPayload) {
        globalSendPayload({
            op: 13,
            d: {
                channel_id: channelId || "1437302172802093096"
            }
        });
    }
});
export function connectGateway(token) {
    let sessionId = null;
    let resumeGatewayUrl = null;
    let sequenceNum = null;
    let ws = null;
    let heartbeatInterval = null;
    let reconnecttimer = null;
    let reconnectAttempts = 0;
    const clientLaunchId = crypto.randomUUID();
    let initialUserSettings = null;
    let idleManagerInitialized = false;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowNetwork = connection && ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
    function sendPayload(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }
    globalSendPayload = sendPayload;
    function cleanupWebSocket() {
        if (ws) {
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            ws = null;
        }
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        if (reconnecttimer) {
            clearTimeout(reconnecttimer);
            reconnecttimer = null;
        }
    }
    function createConnection() {
        cleanupWebSocket();
        AppDispatcher.dispatch({
            type: 'GATEWAY_STATUS',
            status: reconnectAttempts > 0 ? 'reconnecting' : 'connecting',
            attempt: reconnectAttempts
        });
        const gatewayUrl = resumeGatewayUrl || 'wss://gateway.discord.gg/?v=10&encoding=json';
        ws = new WebSocket(gatewayUrl);
        ws.onopen = () => {
            reconnectAttempts = 0;
            AppDispatcher.dispatch({ type: 'GATEWAY_STATUS', status: 'connected' });
        };
        ws.onmessage = (event) => {
            let packet;
            try {
                packet = JSON.parse(event.data);
            } catch (err) {
                console.error('[Gateway] Failed to parse incoming packet:', err);
                return;
            }
            const { op, d, t, s } = packet;
            if (s !== null && s !== undefined) {
                sequenceNum = s;
            }
            if (op === 10) {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                heartbeatInterval = setInterval(() => {
                    sendPayload({
                        op: 40,
                        d: {
                            seq: sequenceNum,
                            qos: {
                                active: true,
                                ver: 31,
                                reasons: ["foregrounded"]
                            }
                        }
                    });
                }, d.heartbeat_interval);
                if (sessionId) {
                    sendPayload({
                        op: 6,
                        d: {
                            token,
                            session_id: sessionId,
                            seq: sequenceNum
                        }
                    });
                } else {
                    sendPayload({
                        op: 2,
                        d: {
                            token,
                            capabilities: 1767421,
                            properties: {
                                os: "iOS",
                                browser: "Discord iOS",
                                device: "iPhone17,3",
                                device_model_name: "iPhone17,3",
                                system_locale: "en-US",
                                has_client_mods: false,
                                browser_user_agent: "Discord-iOS/350.0 (com.hammerandchisel.discord; build:114851; iOS 18.6.0)",
                                browser_version: "350.0",
                                os_version: "18.6",
                                release_channel: "ptb",
                                client_build_number: 114851,
                                client_launch_id: clientLaunchId,
                                installation_id: Math.floor(Math.random() * 1e19).toString(),
                                is_fast_connect: false
                            },
                            client_state: {
                                guild_versions: {}
                            }
                        }
                    });
                }
            }
            if (op === 7) {
                ws.close(4000, "Gateway requested reconnect");
                return;
            }
            if (op === 9) {
                if (!d) {
                    sessionId = null;
                    resumeGatewayUrl = null;
                    sequenceNum = null;
                }
                if (ws) {
                    ws.close(4000, "Invalid session");
                }
                return;
            }
            switch (t) {
                case 'READY':
                    sessionId = d.session_id;
                    resumeGatewayUrl = d.resume_gateway_url;
                    if (d?.user_settings_proto) {
                        const protoStr = d.user_settings_proto.proto || d.user_settings_proto;
                        const decodedSettings = decodeUserSettingsProto(protoStr);
                        if (decodedSettings) {
                            initialUserSettings = decodedSettings;
                        }
                    }
                    if (d?.user_settings) {
                        initialUserSettings = d.user_settings;
                    }
                    const statusVal = initialUserSettings?.status?.status?.value || initialUserSettings?.status || "online";
                    const customStatusText = initialUserSettings?.status?.custom_status?.text;
                    const activitiesArr = customStatusText ? [{
                        name: 'Custom Status',
                        type: 4,
                        state: customStatusText,
                        emoji: null,
                        metadata: {}
                    }] : [];
                    sendPayload({
                        op: 3,
                        d: {
                            status: statusVal,
                            since: 0,
                            activities: activitiesArr,
                            afk: false
                        }
                    });
                    if (!idleManagerInitialized) {
                        initIdleManager(sendPayload, () => initialUserSettings);
                        idleManagerInitialized = true;
                    }
                    AppDispatcher.dispatch({ type: 'READY', data: d });
                    break;
                case 'RESUMED':
                    AppDispatcher.dispatch({ type: 'GATEWAY_RESUMED' });
                    break;
                case 'MESSAGE_CREATE':
                    AppDispatcher.dispatch({ type: 'ADD_MESSAGE', message: d });
                    break;
                case 'MESSAGE_UPDATE':
                    AppDispatcher.dispatch({ type: 'UPDATE_MESSAGE', message: d });
                    break;
                case 'MESSAGE_DELETE':
                    AppDispatcher.dispatch({ type: 'DELETE_MESSAGE', id: d.id, channelId: d.channel_id });
                    break;
                case 'TYPING_START':
                    AppDispatcher.dispatch({ type: 'TYPING_START', userId: d.user_id, channelId: d.channel_id });
                    break;
                case 'PRESENCE_UPDATE':
                    AppDispatcher.dispatch({ type: 'PRESENCE_UPDATE', presence: d });
                    break;
                case 'GUILD_CREATE':
                    AppDispatcher.dispatch({ type: 'GUILD_CREATE', guild: d });
                    break;
                case 'GUILD_DELETE':
                    AppDispatcher.dispatch({ type: 'GUILD_DELETE', guild: d });
                    break;
                case 'VOICE_STATE_UPDATE':
                    AppDispatcher.dispatch({ type: 'VOICE_STATE_UPDATE', voiceState: d });
                    break;
                case 'MESSAGE_REACTION_ADD':
                    AppDispatcher.dispatch({ type: 'MESSAGE_REACTION_ADD', reaction: d });
                    break;
                case 'MESSAGE_REACTION_REMOVE':
                    AppDispatcher.dispatch({ type: 'MESSAGE_REACTION_REMOVE', reaction: d });
                    break;
                case 'USER_UPDATE':
                    AppDispatcher.dispatch({ type: 'USER_UPDATE', user: d });
                    break;
            }
        };
        ws.onclose = (event) => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            if (event.code === 4004) {
                AppDispatcher.dispatch({ type: 'AUTH_FAILED' });
                return;
            }
            reconnectAttempts++;
            AppDispatcher.dispatch({
                type: 'GATEWAY_STATUS',
                status: 'disconnected',
                code: event.code,
                attempt: reconnectAttempts
            });
            const baseMultiplier = isSlowNetwork ? 2000 : 1000;
            const exponentialDelay = baseMultiplier * Math.pow(2, reconnectAttempts);
            const jitter = Math.random() * 1000;
            const timeout = Math.min(exponentialDelay + jitter, 30000);
            if (reconnecttimer) clearTimeout(reconnecttimer);
            reconnecttimer = setTimeout(() => createConnection(), timeout);
        };
    }
    createConnection();
}