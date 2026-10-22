import { AppDispatcher } from '../dispatcher/Dispatcher.js';
import { decodeUserSettingsProto } from './decoder.js';

let globalSendPayload = null;

AppDispatcher.register((action) => {
    if (action.type === 'CHANNEL_SELECT' || action.type === 'SELECT_CHANNEL' || action.type === 'SWITCH_CHANNEL' || action.type === 'CHANNEL_SWITCH') {
        if (globalSendPayload) {
            globalSendPayload({
                op: 13,
                d: {
                    channel_id: action.channelId || action.channel_id || "1437302172802093096"
                }
            });
        }
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
    let clientLaunchId = crypto.randomUUID();
    let initialUserSettings = null;

    function sendPayload(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    globalSendPayload = sendPayload;

    function createConnection() {
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
            const packet = JSON.parse(event.data);
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

                initializationTimestamp = Date.now();
                clientHeartbeatSessionId = crypto.randomUUID();

                if (sessionId) {
                    sendPayload({
                        op: 6,
                        d: {
                            token: token,
                            session_id: sessionId,
                            seq: sequenceNum
                        }
                    });
                } else {
                    sendPayload({
                        op: 2,
                        d: {
                            token: token,
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

            if (t === 'READY') {
                sessionId = d.session_id;
                resumeGatewayUrl = d.resume_gateway_url;
                clientHeartbeatSessionId = sessionId;

                // Decode user_settings_proto synchronously and store the result
                if (d?.user_settings_proto) {
                    const protoStr = d.user_settings_proto.proto || d.user_settings_proto;
                    const decodedSettings = decodeUserSettingsProto(protoStr);
                    if (decodedSettings) {
                        console.log("Decoded userSettingsProto:", decodedSettings);
                        initialUserSettings = decodedSettings;
                    }
                }

                if (d?.user_settings) {
                    initialUserSettings = d.user_settings;
                }

                const statusVal = initialUserSettings?.status?.status?.value || initialUserSettings?.status || "online";
                const activitiesArr = [];
                const customStatusText = initialUserSettings?.status?.custom_status?.text;
                if (customStatusText) {
                    activitiesArr.push({
                        name: 'Custom Status',
                        type: 4,
                        state: customStatusText,
                        emoji: null,
                        metadata: {}
                    });
                }

                sendPayload({
                    op: 3,
                    d: {
                        status: statusVal,
                        since: 0,
                        activities: activitiesArr,
                        afk: false
                    }
                });

                AppDispatcher.dispatch({ type: 'READY', data: d });
            }

            if (t === 'RESUMED') {
                AppDispatcher.dispatch({ type: 'GATEWAY_RESUMED' });
            }

            if (t === 'MESSAGE_CREATE') {
                AppDispatcher.dispatch({ type: 'ADD_MESSAGE', message: d });
            }

            if (t === 'MESSAGE_UPDATE') {
                AppDispatcher.dispatch({ type: 'UPDATE_MESSAGE', message: d });
            }

            if (t === 'MESSAGE_DELETE') {
                AppDispatcher.dispatch({ type: 'DELETE_MESSAGE', id: d.id, channelId: d.channel_id });
            }

            if (t === 'TYPING_START') {
                AppDispatcher.dispatch({ type: 'TYPING_START', userId: d.user_id, channelId: d.channel_id });
            }

            if (t === 'PRESENCE_UPDATE') {
                AppDispatcher.dispatch({ type: 'PRESENCE_UPDATE', presence: d });
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

            const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            if (reconnecttimer) clearTimeout(reconnecttimer);
            reconnecttimer = setTimeout(() => createConnection(), timeout);
        };
    }

    createConnection();
}