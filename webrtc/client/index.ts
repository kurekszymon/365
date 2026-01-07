import * as mediasoupClient from 'mediasoup-client';
import type { Device, Transport, Producer, Consumer } from 'mediasoup-client/types';

// ─── State ───────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let device: Device | null = null;
let sendTransport: Transport | null = null;
let recvTransport: Transport | null = null;
let localStream: MediaStream | null = null;
let screenStream: MediaStream | null = null;
let peerId: string | null = null;

const producers = new Map<string, Producer>();
let screenProducer: Producer | null = null;
const consumers = new Map<string, Consumer>();
const remoteStreams = new Map<string, MediaStream>();

// Track consumer to peer/type mapping for cleanup
const consumerInfo = new Map<string, { peerId: string; isScreen: boolean; }>();

// ─── DOM Elements ────────────────────────────────────────────────────────────

const roomInput = document.getElementById('roomInput') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

const joinButton = document.getElementById('joinButton') as HTMLButtonElement;
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const hangupButton = document.getElementById('hangupButton') as HTMLButtonElement;
const screenShareButton = document.getElementById('screenShareButton') as HTMLButtonElement;

const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
const remoteVideosContainer = document.getElementById('remoteVideos') as HTMLDivElement;
const localVideoContainer = document.querySelector('.local-video-container') as HTMLDivElement;
const mainStage = document.getElementById('mainStage') as HTMLDivElement;
const screenShareContainer = document.getElementById('screenShareContainer') as HTMLDivElement;

const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
const sendChatButton = document.getElementById('sendChatButton') as HTMLButtonElement | null;
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
const sendFileButton = document.getElementById('sendFileButton') as HTMLButtonElement | null;
const dcStatus = document.getElementById('dcStatus') as HTMLDivElement | null;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement | null;


startButton.addEventListener('click', () => {
    localVideoContainer.classList.add('active');
    remoteVideosContainer.classList.add('active');
});

hangupButton.addEventListener('click', () => {
    localVideoContainer.classList.remove('active');
    remoteVideosContainer.classList.remove('active');
});


startButton.disabled = true;
hangupButton.disabled = true;
screenShareButton.disabled = true;

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

function getOrCreateRemoteVideo(peerId: string, isScreen: boolean = false): HTMLVideoElement {
    const elementId = isScreen ? `screen-${peerId}` : `video-${peerId}`;
    let video = document.getElementById(elementId) as HTMLVideoElement | null;

    if (!video) {
        video = document.createElement('video');
        video.id = elementId;
        video.autoplay = true;
        video.playsInline = true;

        const label = document.createElement('div');
        label.className = 'video-label';

        if (isScreen) {
            // Screen share goes to main stage
            video.className = 'screen-share-video';
            label.textContent = `${peerId.slice(-8)}... is sharing`;

            // Clear previous screen share if any
            screenShareContainer.innerHTML = '';
            screenShareContainer.appendChild(video);
            screenShareContainer.appendChild(label);

            // Show the main stage
            mainStage.classList.remove('hidden');
        } else {
            // Camera video goes to sidebar
            video.className = 'remote-video';
            label.textContent = `Peer: ${peerId.slice(-8)}...`;

            const container = document.createElement('div');
            container.id = `container-${elementId}`;
            container.className = 'video-container';
            container.appendChild(video);
            container.appendChild(label);
            remoteVideosContainer.appendChild(container);
        }
    }
    return video;
}

function removeRemoteVideo(peerId: string): void {
    // Remove camera video container
    const container = document.getElementById(`container-video-${peerId}`);
    if (container) {
        container.remove();
    }
    // Remove screen share - hide main stage
    const screenVideo = document.getElementById(`screen-${peerId}`);
    if (screenVideo) {
        screenShareContainer.innerHTML = '';
        mainStage.classList.add('hidden');
    }
    remoteStreams.delete(peerId);
    remoteStreams.delete(`screen-${peerId}`);
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

async function consumeProducer(producerPeerId: string, producerId: string, kind: string, appData?: { type?: string; }): Promise<void> {
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
        appData?: { type?: string; };
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

    // Determine if this is a screen share based on appData
    const isScreen = appData?.type === 'screen' || response.appData?.type === 'screen';
    const streamKey = isScreen ? `screen-${producerPeerId}` : producerPeerId;

    // Track consumer info for cleanup
    consumerInfo.set(consumer.id, { peerId: producerPeerId, isScreen });

    // Add track to appropriate remote stream
    let remoteStream = remoteStreams.get(streamKey);
    if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteStreams.set(streamKey, remoteStream);
    }

    // Remove existing tracks of the same kind before adding new one
    // This handles the case when a peer restarts their camera
    const existingTracks = remoteStream.getTracks().filter(t => t.kind === consumer.track.kind);
    existingTracks.forEach(track => remoteStream!.removeTrack(track));

    remoteStream.addTrack(consumer.track);

    // Update video element
    const video = getOrCreateRemoteVideo(producerPeerId, isScreen);
    video.srcObject = remoteStream;

    console.log(`Consuming ${kind}${isScreen ? ' (screen)' : ''} from peer ${producerPeerId}`);
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
                for (const { peerId: prodPeerId, producerId, kind, appData } of data.producers) {
                    await consumeProducer(prodPeerId, producerId, kind, appData);
                }
                break;
            }

            case 'newPeer': {
                console.log('New peer joined:', data.peerId);
                break;
            }

            case 'newProducer': {
                // New producer from another peer - consume it
                await consumeProducer(data.peerId, data.producerId, data.kind, data.appData);
                break;
            }

            case 'producerClosed': {
                // Handle producer closed (peer stopped sharing or left)
                // Two cases:
                // 1. Server sends consumerId when consumer's producer closes
                // 2. Server broadcasts peerId + producerId when producer explicitly closed

                if (data.consumerId) {
                    // Case 1: Direct consumer notification
                    const consumer = consumers.get(data.consumerId);
                    const info = consumerInfo.get(data.consumerId);

                    if (consumer) {
                        consumer.close();
                        consumers.delete(data.consumerId);
                    }

                    // If this was a screen share, hide the main stage
                    if (info?.isScreen) {
                        const screenVideo = document.getElementById(`screen-${info.peerId}`);
                        if (screenVideo) {
                            screenShareContainer.innerHTML = '';
                            mainStage.classList.add('hidden');
                        }
                        remoteStreams.delete(`screen-${info.peerId}`);
                    }

                    consumerInfo.delete(data.consumerId);
                } else if (data.peerId && data.producerId) {
                    // Case 2: Broadcast notification - find and close matching consumers
                    consumerInfo.forEach((info, consumerId) => {
                        if (info.peerId === data.peerId) {
                            const consumer = consumers.get(consumerId);
                            if (consumer && consumer.producerId === data.producerId) {
                                consumer.close();
                                consumers.delete(consumerId);
                                consumerInfo.delete(consumerId);

                                // Clean up stream
                                const streamKey = info.isScreen ? `screen-${info.peerId}` : info.peerId;
                                const stream = remoteStreams.get(streamKey);
                                if (stream) {
                                    // Remove the track from the stream
                                    stream.getTracks().forEach(track => {
                                        if (track.id === consumer.track.id) {
                                            stream.removeTrack(track);
                                        }
                                    });
                                    // If stream is empty, clean up video element
                                    if (stream.getTracks().length === 0) {
                                        remoteStreams.delete(streamKey);
                                        if (info.isScreen) {
                                            screenShareContainer.innerHTML = '';
                                            mainStage.classList.add('hidden');
                                        }
                                    }
                                }
                            }
                        }
                    });
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
    screenShareButton.disabled = false;

    // Start producing
    await produceMedia();

    if (dcStatus) dcStatus.textContent = 'Chat: connected';
};

hangupButton.onclick = async (): Promise<void> => {
    // Stop screen sharing first if active
    await stopScreenShare();

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
    screenShareButton.disabled = true;

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

// ─── Screen Sharing ──────────────────────────────────────────────────────────

async function startScreenShare(): Promise<void> {
    if (!sendTransport) {
        console.error('Send transport not ready');
        return;
    }

    try {
        // Request screen capture with optional audio
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 30, max: 30 },
            },
            audio: true, // Request audio (works for tab audio in Chrome)
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
            // Produce screen video as a separate track with appData to identify it
            screenProducer = await sendTransport.produce({
                track: videoTrack,
                encodings: [
                    { maxBitrate: 500000 },
                    { maxBitrate: 1000000 },
                    { maxBitrate: 5000000 },
                ],
                codecOptions: {
                    videoGoogleStartBitrate: 1000,
                },
                appData: { type: 'screen' },
            });

            console.log('Screen producer created:', screenProducer.id);

            // Show local screen share preview in main stage
            showLocalScreenShare(screenStream);

            // Handle user stopping screen share via browser UI
            videoTrack.onended = () => {
                console.log('Screen share ended by user');
                stopScreenShare();
            };

            screenShareButton.textContent = 'Stop Sharing';
            screenShareButton.classList.add('sharing');
        }

        // If tab audio is captured, produce it as well
        const audioTrack = screenStream.getAudioTracks()[0];
        if (audioTrack) {
            const screenAudioProducer = await sendTransport.produce({
                track: audioTrack,
                appData: { type: 'screen-audio' },
            });
            producers.set(screenAudioProducer.id, screenAudioProducer);
            console.log('Screen audio producer created:', screenAudioProducer.id);
        }

    } catch (error) {
        if ((error as Error).name === 'NotAllowedError') {
            console.log('User cancelled screen share');
        } else {
            console.error('Error starting screen share:', error);
        }
    }
}

function showLocalScreenShare(stream: MediaStream): void {
    // Clear and show main stage with local preview
    screenShareContainer.innerHTML = '';

    const video = document.createElement('video');
    video.id = 'local-screen-preview';
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;

    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = 'You are sharing your screen';

    const indicator = document.createElement('div');
    indicator.className = 'sharing-indicator';
    indicator.textContent = '● LIVE';

    screenShareContainer.appendChild(video);
    screenShareContainer.appendChild(label);
    screenShareContainer.appendChild(indicator);

    mainStage.classList.remove('hidden');
}

function hideLocalScreenShare(): void {
    const preview = document.getElementById('local-screen-preview');
    if (preview) {
        screenShareContainer.innerHTML = '';
        mainStage.classList.add('hidden');
    }
}

async function stopScreenShare(): Promise<void> {
    if (screenProducer) {
        send({ type: 'closeProducer', producerId: screenProducer.id });
        screenProducer.close();
        screenProducer = null;
    }

    if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        screenStream = null;
    }

    // Hide the local screen preview
    hideLocalScreenShare();

    screenShareButton.textContent = 'Share Screen';
    screenShareButton.classList.remove('sharing');
}

screenShareButton.onclick = async (): Promise<void> => {
    if (screenProducer) {
        await stopScreenShare();
    } else {
        await startScreenShare();
    }
};
