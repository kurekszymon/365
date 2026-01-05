import { WebSocketServer, WebSocket } from 'ws';
import * as mediasoup from 'mediasoup';
import type {
    Worker,
    Router,
    WebRtcTransport,
    Producer,
    Consumer,
    MediaKind,
    RtpParameters,
    DtlsParameters,
} from 'mediasoup/types';

// ─── Configuration ───────────────────────────────────────────────────────────

const config = {
    listenIp: '0.0.0.0',
    announcedIp: '127.0.0.1', // public ip in prod
    webRtcPort: { min: 40000, max: 49999 },
    workerSettings: {
        logLevel: 'warn' as const,
        rtcMinPort: 40000,
        rtcMaxPort: 49999,
    },
    routerMediaCodecs: [
        {
            kind: 'audio' as MediaKind,
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
        },
        {
            kind: 'video' as MediaKind,
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters: {
                'x-google-start-bitrate': 1000,
            },
        },
        {
            kind: 'video' as MediaKind,
            mimeType: 'video/VP9',
            clockRate: 90000,
            parameters: {
                'profile-id': 2,
                'x-google-start-bitrate': 1000,
            },
        },
        {
            kind: 'video' as MediaKind,
            mimeType: 'video/H264',
            clockRate: 90000,
            parameters: {
                'packetization-mode': 1,
                'profile-level-id': '42e01f',
                'level-asymmetry-allowed': 1,
                'x-google-start-bitrate': 1000,
            },
        },
    ],
    webRtcTransportOptions: {
        listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
    },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Peer {
    id: string;
    ws: WebSocket;
    room: string;
    transports: Map<string, WebRtcTransport>;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
}

interface Room {
    router: Router;
    peers: Map<string, Peer>;
}

// ─── State ───────────────────────────────────────────────────────────────────

let worker: Worker;
const rooms = new Map<string, Room>();
const peers = new Map<WebSocket, Peer>();

// ─── Mediasoup Worker ────────────────────────────────────────────────────────

async function createWorker(): Promise<Worker> {
    const w = await mediasoup.createWorker(config.workerSettings);

    w.on('died', () => {
        console.error('mediasoup worker died, exiting...');
        process.exit(1);
    });

    console.log(`mediasoup worker created [pid:${w.pid}]`);
    return w;
}

async function getOrCreateRoom(roomId: string): Promise<Room> {
    if (rooms.has(roomId)) {
        return rooms.get(roomId)!;
    }

    const router = await worker.createRouter({ mediaCodecs: config.routerMediaCodecs });
    const room: Room = { router, peers: new Map() };
    rooms.set(roomId, room);
    console.log(`Room created: ${roomId}`);
    return room;
}

// ─── Transport Helpers ───────────────────────────────────────────────────────

async function createWebRtcTransport(router: Router): Promise<WebRtcTransport> {
    const transport = await router.createWebRtcTransport(config.webRtcTransportOptions);

    transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
            transport.close();
        }
    });

    return transport;
}

// ─── Message Handlers ────────────────────────────────────────────────────────

function send(ws: WebSocket, msg: object): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

function broadcastToRoom(room: Room, msg: object, excludeWs?: WebSocket): void {
    const msgStr = JSON.stringify(msg);
    room.peers.forEach((peer) => {
        if (peer.ws !== excludeWs && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(msgStr);
        }
    });
}

async function handleMessage(ws: WebSocket, message: string): Promise<void> {
    let data: any;
    try {
        data = JSON.parse(message);
    } catch {
        console.error('Invalid JSON');
        return;
    }

    const peer = peers.get(ws);

    switch (data.type) {
        case 'join': {
            const roomId = data.room as string;
            if (!roomId) return;

            const room = await getOrCreateRoom(roomId);
            const peerId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            const newPeer: Peer = {
                id: peerId,
                ws,
                room: roomId,
                transports: new Map(),
                producers: new Map(),
                consumers: new Map(),
            };

            peers.set(ws, newPeer);
            room.peers.set(peerId, newPeer);

            console.log(`Peer ${peerId} joined room ${roomId}`);

            send(ws, {
                type: 'joined',
                room: roomId,
                peerId,
                routerRtpCapabilities: room.router.rtpCapabilities,
            });

            // Notify others about new peer
            broadcastToRoom(room, { type: 'newPeer', peerId }, ws);
            break;
        }

        case 'getRouterRtpCapabilities': {
            if (!peer) return;
            const room = rooms.get(peer.room);
            if (!room) return;

            send(ws, {
                type: 'routerRtpCapabilities',
                rtpCapabilities: room.router.rtpCapabilities,
            });
            break;
        }

        case 'createWebRtcTransport': {
            if (!peer) return;
            const room = rooms.get(peer.room);
            if (!room) return;

            const transport = await createWebRtcTransport(room.router);
            peer.transports.set(transport.id, transport);

            send(ws, {
                type: 'webRtcTransportCreated',
                transportOptions: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                },
                producing: data.producing,
                consuming: data.consuming,
            });
            break;
        }

        case 'connectWebRtcTransport': {
            if (!peer) return;
            const transport = peer.transports.get(data.transportId);
            if (!transport) return;

            await transport.connect({ dtlsParameters: data.dtlsParameters as DtlsParameters });

            send(ws, { type: 'webRtcTransportConnected', transportId: data.transportId });
            break;
        }

        case 'produce': {
            if (!peer) return;
            const room = rooms.get(peer.room);
            if (!room) return;

            const transport = peer.transports.get(data.transportId);
            if (!transport) return;

            const producer = await transport.produce({
                kind: data.kind as MediaKind,
                rtpParameters: data.rtpParameters as RtpParameters,
                appData: data.appData || {},
            });

            peer.producers.set(producer.id, producer);

            producer.on('transportclose', () => {
                producer.close();
                peer.producers.delete(producer.id);
            });

            send(ws, { type: 'produced', id: producer.id, kind: data.kind });

            // Notify others about new producer
            broadcastToRoom(room, {
                type: 'newProducer',
                peerId: peer.id,
                producerId: producer.id,
                kind: producer.kind,
            }, ws);
            break;
        }

        case 'consume': {
            if (!peer) return;
            const room = rooms.get(peer.room);
            if (!room) return;

            const { producerId, rtpCapabilities, transportId } = data;

            // Check if can consume
            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                send(ws, { type: 'cannotConsume', producerId });
                return;
            }

            const transport = peer.transports.get(transportId);
            if (!transport) return;

            const consumer = await transport.consume({
                producerId,
                rtpCapabilities,
                paused: true, // Start paused, client will resume
            });

            peer.consumers.set(consumer.id, consumer);

            consumer.on('transportclose', () => {
                consumer.close();
                peer.consumers.delete(consumer.id);
            });

            consumer.on('producerclose', () => {
                send(ws, { type: 'producerClosed', consumerId: consumer.id });
                consumer.close();
                peer.consumers.delete(consumer.id);
            });

            send(ws, {
                type: 'consumed',
                consumerId: consumer.id,
                producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
            });
            break;
        }

        case 'resumeConsumer': {
            if (!peer) return;
            const consumer = peer.consumers.get(data.consumerId);
            if (consumer) {
                await consumer.resume();
                send(ws, { type: 'consumerResumed', consumerId: data.consumerId });
            }
            break;
        }

        case 'closeProducer': {
            if (!peer) return;
            const room = rooms.get(peer.room);
            const producer = peer.producers.get(data.producerId);
            if (producer) {
                producer.close();
                peer.producers.delete(data.producerId);

                // Notify others
                if (room) {
                    broadcastToRoom(room, {
                        type: 'producerClosed',
                        peerId: peer.id,
                        producerId: data.producerId,
                    }, ws);
                }
            }
            break;
        }

        case 'getProducers': {
            if (!peer) return;
            const room = rooms.get(peer.room);
            if (!room) return;

            const producers: { peerId: string; producerId: string; kind: MediaKind; }[] = [];

            room.peers.forEach((p) => {
                if (p.id !== peer.id) {
                    p.producers.forEach((producer) => {
                        producers.push({
                            peerId: p.id,
                            producerId: producer.id,
                            kind: producer.kind,
                        });
                    });
                }
            });

            send(ws, { type: 'producers', producers });
            break;
        }

        // DataChannel signaling (relayed through server for simplicity)
        case 'dataChannelMessage': {
            if (!peer) return;
            const room = rooms.get(peer.room);
            if (!room) return;

            broadcastToRoom(room, {
                type: 'dataChannelMessage',
                from: peer.id,
                payload: data.payload,
            }, ws);
            break;
        }

        default:
            console.log('Unknown message type:', data.type);
    }
}

function handleDisconnect(ws: WebSocket): void {
    const peer = peers.get(ws);
    if (!peer) return;

    const room = rooms.get(peer.room);
    if (room) {
        // Notify others about peer leaving
        broadcastToRoom(room, { type: 'peerLeft', peerId: peer.id }, ws);

        // Close all transports (this closes producers/consumers too)
        peer.transports.forEach((transport) => transport.close());
        room.peers.delete(peer.id);

        // Remove empty rooms
        if (room.peers.size === 0) {
            room.router.close();
            rooms.delete(peer.room);
            console.log(`Room ${peer.room} closed (empty)`);
        }
    }

    peers.delete(ws);
    console.log(`Peer ${peer.id} disconnected`);
}

// ─── WebSocket Server ────────────────────────────────────────────────────────

async function main(): Promise<void> {
    worker = await createWorker();

    const wss = new WebSocketServer({ port: 8080 });

    wss.on('connection', (ws: WebSocket) => {
        console.log('Client connected');

        ws.on('message', (message: string) => {
            handleMessage(ws, message.toString()).catch((err) => {
                console.error('Error handling message:', err);
            });
        });

        ws.on('close', () => {
            handleDisconnect(ws);
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
        });
    });

    console.log('mediasoup SFU server running on ws://localhost:8080');
}

main().catch(console.error);
