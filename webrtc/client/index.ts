import * as mediasoupClient from 'mediasoup-client';
import type { Device, Transport, Producer, Consumer } from 'mediasoup-client/types';

// ─── State ───────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let device: Device | null = null;
let sendTransport: Transport | null = null;
let recvTransport: Transport | null = null;
let localStream: MediaStream | null = null;
let peerId: string | null = null;

const producers = new Map<string, Producer>();
const consumers = new Map<string, Consumer>();
const remoteStreams = new Map<string, MediaStream>();

// ─── DOM Elements ────────────────────────────────────────────────────────────

const roomInput = document.getElementById('roomInput') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

const joinButton = document.getElementById('joinButton') as HTMLButtonElement;
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const hangupButton = document.getElementById('hangupButton') as HTMLButtonElement;

const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
const remoteVideosContainer = document.getElementById('remoteVideos') as HTMLDivElement;

const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
const sendChatButton = document.getElementById('sendChatButton') as HTMLButtonElement | null;
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
const sendFileButton = document.getElementById('sendFileButton') as HTMLButtonElement | null;
const dcStatus = document.getElementById('dcStatus') as HTMLDivElement | null;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement | null;

startButton.disabled = true;
hangupButton.disabled = true;

// ─── Utility ─────────────────────────────────────────────────────────────────

function send(msg: object): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

function waitForResponse<T>(type: string): Promise<T> {
    return new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            if (data.type === type) {
                ws?.removeEventListener('message', handler);
                resolve(data as T);
            }
        };
        ws?.addEventListener('message', handler);
    });
}

function appendMessage(text: string): void {
    if (!chatMessages) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = text;
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── Video Element Management ────────────────────────────────────────────────

function getOrCreateRemoteVideo(peerId: string): HTMLVideoElement {
    let video = document.getElementById(`video-${peerId}`) as HTMLVideoElement | null;
    if (!video) {
        video = document.createElement('video');
        video.id = `video-${peerId}`;
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'remote-video';

        const container = document.createElement('div');
        container.id = `container-${peerId}`;
        container.className = 'video-container';

        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = `Peer: ${peerId.slice(-12)}...`;

        container.appendChild(video);
        container.appendChild(label);
        remoteVideosContainer.appendChild(container);
    }
    return video;
}

function removeRemoteVideo(peerId: string): void {
    const container = document.getElementById(`container-${peerId}`);
    if (container) {
        container.remove();
    }
    remoteStreams.delete(peerId);
}

// ─── Transport Creation ──────────────────────────────────────────────────────

async function createSendTransport(): Promise<void> {
    send({ type: 'createWebRtcTransport', producing: true, consuming: false });

    const response = await waitForResponse<{
        transportOptions: {
            id: string;
            iceParameters: any;
            iceCandidates: any;
            dtlsParameters: any;
        };
    }>('webRtcTransportCreated');

    sendTransport = device!.createSendTransport(response.transportOptions);

    sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
            send({
                type: 'connectWebRtcTransport',
                transportId: sendTransport!.id,
                dtlsParameters,
            });
            await waitForResponse('webRtcTransportConnected');
            callback();
        } catch (err) {
            errback(err as Error);
        }
    });

    sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
            send({
                type: 'produce',
                transportId: sendTransport!.id,
                kind,
                rtpParameters,
                appData,
            });
            const { id } = await waitForResponse<{ id: string; }>('produced');
            callback({ id });
        } catch (err) {
            errback(err as Error);
        }
    });

    sendTransport.on('connectionstatechange', (state) => {
        console.log('Send transport connection state:', state);
    });
}

async function createRecvTransport(): Promise<void> {
    send({ type: 'createWebRtcTransport', producing: false, consuming: true });

    const response = await waitForResponse<{
        transportOptions: {
            id: string;
            iceParameters: any;
            iceCandidates: any;
            dtlsParameters: any;
        };
    }>('webRtcTransportCreated');

    recvTransport = device!.createRecvTransport(response.transportOptions);

    recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
            send({
                type: 'connectWebRtcTransport',
                transportId: recvTransport!.id,
                dtlsParameters,
            });
            await waitForResponse('webRtcTransportConnected');
            callback();
        } catch (err) {
            errback(err as Error);
        }
    });

    recvTransport.on('connectionstatechange', (state) => {
        console.log('Recv transport connection state:', state);
    });
}

// ─── Produce / Consume ───────────────────────────────────────────────────────

async function produceMedia(): Promise<void> {
    if (!sendTransport || !localStream) return;

    // Produce audio
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        const audioProducer = await sendTransport.produce({ track: audioTrack });
        producers.set(audioProducer.id, audioProducer);
        console.log('Audio producer created:', audioProducer.id);
    }

    // Produce video
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        const videoProducer = await sendTransport.produce({
            track: videoTrack,
            encodings: [
                { maxBitrate: 100000 },
                { maxBitrate: 300000 },
                { maxBitrate: 900000 },
            ],
            codecOptions: {
                videoGoogleStartBitrate: 1000,
            },
        });
        producers.set(videoProducer.id, videoProducer);
        console.log('Video producer created:', videoProducer.id);
    }
}

async function consumeProducer(producerPeerId: string, producerId: string, kind: string): Promise<void> {
    if (!recvTransport || !device) return;

    send({
        type: 'consume',
        producerId,
        rtpCapabilities: device.rtpCapabilities,
        transportId: recvTransport.id,
    });

    const response = await waitForResponse<{
        consumerId: string;
        producerId: string;
        kind: string;
        rtpParameters: any;
    }>('consumed');

    const consumer = await recvTransport.consume({
        id: response.consumerId,
        producerId: response.producerId,
        kind: response.kind as 'audio' | 'video',
        rtpParameters: response.rtpParameters,
    });

    consumers.set(consumer.id, consumer);

    // Resume the consumer
    send({ type: 'resumeConsumer', consumerId: consumer.id });

    // Add track to remote stream
    let remoteStream = remoteStreams.get(producerPeerId);
    if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteStreams.set(producerPeerId, remoteStream);
    }
    remoteStream.addTrack(consumer.track);

    // Update video element
    const video = getOrCreateRemoteVideo(producerPeerId);
    video.srcObject = remoteStream;

    console.log(`Consuming ${kind} from peer ${producerPeerId}`);
}

// ─── WebSocket Handlers ──────────────────────────────────────────────────────

function connectWebSocket(): void {
    ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
        statusDiv.textContent = 'Connected to server';
    };

    ws.onclose = () => {
        statusDiv.textContent = 'Disconnected from server';
        ws = null;
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        statusDiv.textContent = 'Connection error';
    };

    ws.onmessage = async (e: MessageEvent) => {
        const data = JSON.parse(e.data);

        switch (data.type) {
            case 'joined': {
                peerId = data.peerId;
                statusDiv.textContent = `Joined room: ${data.room} (ID: ${peerId?.slice(-12)}...)`;

                // Initialize mediasoup device
                device = new mediasoupClient.Device();
                await device.load({ routerRtpCapabilities: data.routerRtpCapabilities });

                // Create transports
                await createSendTransport();
                await createRecvTransport();

                startButton.disabled = false;

                // Get existing producers
                send({ type: 'getProducers' });
                break;
            }

            case 'producers': {
                // Consume existing producers from other peers
                for (const { peerId: prodPeerId, producerId, kind } of data.producers) {
                    await consumeProducer(prodPeerId, producerId, kind);
                }
                break;
            }

            case 'newPeer': {
                console.log('New peer joined:', data.peerId);
                break;
            }

            case 'newProducer': {
                // New producer from another peer - consume it
                await consumeProducer(data.peerId, data.producerId, data.kind);
                break;
            }

            case 'producerClosed': {
                // Handle producer closed (peer stopped sharing or left)
                if (data.consumerId) {
                    const consumer = consumers.get(data.consumerId);
                    if (consumer) {
                        consumer.close();
                        consumers.delete(data.consumerId);
                    }
                }
                break;
            }

            case 'peerLeft': {
                console.log('Peer left:', data.peerId);
                removeRemoteVideo(data.peerId);

                // Close all consumers from this peer
                consumers.forEach((consumer, id) => {
                    // Consumer doesn't have producerPeerId, so we remove the video anyway
                    // In a production app, you'd track which consumers belong to which peer
                });
                break;
            }

            case 'dataChannelMessage': {
                handleDataChannelMessage(data.from, data.payload);
                break;
            }

            // Response handlers are handled by waitForResponse
            default:
                break;
        }
    };
}

// ─── DataChannel via Server ──────────────────────────────────────────────────

// Since mediasoup doesn't support DataChannels natively on the SFU,
// we relay chat/file messages through the WebSocket server

const incomingFiles = new Map<string, { name: string; mime: string; chunks: Uint8Array[]; }>();

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

function handleDataChannelMessage(from: string, payload: any): void {
    if (payload.msgType === 'chat') {
        appendMessage(`${from.slice(0, 8)}: ${payload.text}`);
    } else if (payload.msgType === 'file-meta') {
        incomingFiles.set(payload.id, { name: payload.name, mime: payload.mime, chunks: [] });
        appendMessage(`Receiving file from ${from.slice(0, 8)}: ${payload.name}`);
    } else if (payload.msgType === 'file-chunk') {
        const info = incomingFiles.get(payload.id);
        if (info) {
            // Decode each chunk individually to avoid base64 padding issues
            info.chunks.push(base64ToUint8Array(payload.data));
        }
    } else if (payload.msgType === 'file-done') {
        const info = incomingFiles.get(payload.id);
        if (info) {
            // Combine all decoded chunks
            const totalLength = info.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of info.chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }
            const blob = new Blob([combined], { type: info.mime });
            const url = URL.createObjectURL(blob);

            if (chatMessages) {
                const div = document.createElement('div');
                div.textContent = `File received: ${info.name} (`;
                const a = document.createElement('a');
                a.href = url;
                a.textContent = 'download';
                a.target = '_blank';
                a.download = info.name;
                div.appendChild(a);
                div.appendChild(document.createTextNode(')'));
                chatMessages.appendChild(div);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            incomingFiles.delete(payload.id);
        }
    }
}

function sendChatMessage(text: string): void {
    send({
        type: 'dataChannelMessage',
        payload: { msgType: 'chat', text },
    });
    appendMessage(`You: ${text}`);
}

async function sendFileMessage(file: File): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    send({
        type: 'dataChannelMessage',
        payload: { msgType: 'file-meta', id, name: file.name, mime: file.type || 'application/octet-stream' },
    });

    // Read and send in chunks (base64 encoded for JSON transport)
    const CHUNK_SIZE = 16 * 1024;
    const reader = new FileReader();

    for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]); // Remove data URL prefix
            };
            reader.readAsDataURL(slice);
        });

        send({
            type: 'dataChannelMessage',
            payload: { msgType: 'file-chunk', id, data: base64 },
        });
    }

    send({
        type: 'dataChannelMessage',
        payload: { msgType: 'file-done', id },
    });

    appendMessage(`📤 Sent file: ${file.name}`);
}

// ─── UI Event Handlers ───────────────────────────────────────────────────────

joinButton.onclick = (): void => {
    const room = roomInput.value.trim();
    if (!room) {
        alert('Please enter a room name');
        return;
    }

    connectWebSocket();

    const checkConnection = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            send({ type: 'join', room });
            joinButton.disabled = true;
            roomInput.disabled = true;
            clearInterval(checkConnection);
        }
    }, 100);
};

startButton.onclick = async (): Promise<void> => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localVideo.srcObject = localStream;

    startButton.disabled = true;
    hangupButton.disabled = false;

    // Start producing
    await produceMedia();

    if (dcStatus) dcStatus.textContent = 'Chat: connected';
};

hangupButton.onclick = async (): Promise<void> => {
    // Close all producers
    producers.forEach((producer) => {
        send({ type: 'closeProducer', producerId: producer.id });
        producer.close();
    });
    producers.clear();

    // Stop local media
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
        localVideo.srcObject = null;
    }

    startButton.disabled = false;
    hangupButton.disabled = true;

    if (dcStatus) dcStatus.textContent = 'Chat: disconnected';
};

// Chat UI handlers
if (sendChatButton && chatInput) {
    sendChatButton.onclick = () => {
        const text = chatInput.value.trim();
        if (text) {
            sendChatMessage(text);
            chatInput.value = '';
        }
    };

    chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            sendChatButton.click();
        }
    };
}

if (sendFileButton && fileInput) {
    sendFileButton.onclick = async () => {
        const files = fileInput.files;
        if (files && files.length > 0) {
            await sendFileMessage(files[0]);
            fileInput.value = '';
        }
    };
}
