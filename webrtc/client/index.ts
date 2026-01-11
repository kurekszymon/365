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

// Peer color palette for annotations
const PEER_COLORS = [
    '#FF4444', // Red
    '#44FF44', // Green
    '#4444FF', // Blue
    '#FFAA00', // Orange
    '#AA44FF', // Purple
    '#44FFFF', // Cyan
    '#FF44AA', // Pink
    '#AAFF44', // Lime
];
const peerColorMap = new Map<string, string>();
let nextColorIndex = 0;

// Get or assign a color for a peer
function getPeerColor(peerId: string): string {
    if (!peerColorMap.has(peerId)) {
        peerColorMap.set(peerId, PEER_COLORS[nextColorIndex % PEER_COLORS.length]);
        nextColorIndex++;
    }
    return peerColorMap.get(peerId)!;
}

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

// Annotation elements
const annotationCanvas = document.getElementById('annotationCanvas') as HTMLCanvasElement;
const labelsCanvas = document.getElementById('labelsCanvas') as HTMLCanvasElement;
const annotationToolbar = document.getElementById('annotationToolbar') as HTMLDivElement;
const drawTool = document.getElementById('drawTool') as HTMLButtonElement;
const eraserTool = document.getElementById('eraserTool') as HTMLButtonElement;
const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
const brushSize = document.getElementById('brushSize') as HTMLInputElement;
const clearCanvasBtn = document.getElementById('clearCanvas') as HTMLButtonElement;
const toggleAnnotationsBtn = document.getElementById('toggleAnnotations') as HTMLButtonElement;

const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
const sendButton = document.getElementById('sendButton') as HTMLButtonElement | null;
const attachFileButton = document.getElementById('attachFileButton') as HTMLButtonElement | null;
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
const selectedFileName = document.getElementById('selectedFileName') as HTMLDivElement | null;
const dcStatus = document.getElementById('dcStatus') as HTMLDivElement | null;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement | null;

// Chat sidebar elements
const chatSidebar = document.getElementById('chatSidebar') as HTMLDivElement;
const toggleChatButton = document.getElementById('toggleChatButton') as HTMLButtonElement;
const closeChatButton = document.getElementById('closeChatButton') as HTMLButtonElement;

// Toggle chat sidebar
toggleChatButton.addEventListener('click', () => {
    chatSidebar.classList.toggle('open');
});

closeChatButton.addEventListener('click', () => {
    chatSidebar.classList.remove('open');
});


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

            // Show the main stage and enable annotations
            mainStage.classList.remove('hidden');
            enableAnnotations();
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
        // Disable annotations and clear canvas
        disableAnnotations();
        clearAnnotationCanvas(false);
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

                // Assign and display user's color
                const myColor = getPeerColor(peerId!);
                colorPicker.value = myColor;
                colorPicker.title = `Your color: ${myColor}`;

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
    } else if (payload.msgType === 'annotation-draw') {
        // Receive and draw annotation from remote peer
        drawRemoteAnnotation(payload, from);
    } else if (payload.msgType === 'annotation-stroke-end') {
        // Remote peer stopped drawing - start fade timer
        handleRemoteStrokeEnd(from);
    } else if (payload.msgType === 'annotation-clear') {
        // Clear canvas when remote peer clears
        clearAnnotationCanvas(false);
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

// Unified Chat & File UI handlers
let selectedFile: File | null = null;

// Attach file button - opens file picker
if (attachFileButton && fileInput) {
    attachFileButton.onclick = () => {
        fileInput.click();
    };

    fileInput.onchange = () => {
        const files = fileInput.files;
        if (files && files.length > 0) {
            selectedFile = files[0];
            if (selectedFileName) {
                selectedFileName.textContent = `📎 ${selectedFile.name}`;
                selectedFileName.style.display = 'block';
            }
        }
    };
}

const sendMessageInChat = async () => {
    if (!chatInput) {
        return;
    }

    if (selectedFile) {
        await sendFileMessage(selectedFile);
        selectedFile = null;
        if (fileInput) fileInput.value = '';
        if (selectedFileName) {
            selectedFileName.textContent = '';
            selectedFileName.style.display = 'none';
        }
    }
    // Send text message if there's text
    const text = chatInput.value.trim();
    if (text) {
        sendChatMessage(text);
        chatInput.value = '';
    }
};
if (sendButton && chatInput) {
    sendButton.onclick = sendMessageInChat;
    chatInput.onkeypress = async (e) => {
        if (e.key === 'Enter') {
            sendMessageInChat();
        }
    };
}

// ─── Annotation System ───────────────────────────────────────────────────────

const annotationCtx = annotationCanvas.getContext('2d')!;
const labelsCtx = labelsCanvas.getContext('2d')!;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentTool: 'draw' | 'eraser' = 'draw';
let annotationsVisible = true;

// Cursor-following labels that fade after stroke ends
interface CursorLabel {
    peerId: string;
    displayName: string;
    x: number;
    y: number;
    color: string;
    opacity: number;
    isDrawing: boolean;
    fadeStartTime: number | null;
}
const cursorLabels = new Map<string, CursorLabel>();
const LABEL_FADE_DELAY = 1500; // ms after mouseup before fade starts
const LABEL_FADE_DURATION = 500; // ms to fade out
let labelAnimationId: number | null = null;

// Resize canvas to match main stage
function resizeAnnotationCanvas(): void {
    const rect = mainStage.getBoundingClientRect();
    annotationCanvas.width = rect.width;
    annotationCanvas.height = rect.height;
    labelsCanvas.width = rect.width;
    labelsCanvas.height = rect.height;
}

// Initialize canvas on window resize
window.addEventListener('resize', resizeAnnotationCanvas);

// Get normalized coordinates (0-1 range) for syncing across different screen sizes
function getNormalizedCoords(e: MouseEvent | Touch): { x: number; y: number; } {
    const rect = annotationCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
    };
}

// Convert normalized coords back to canvas coords
function toCanvasCoords(normalized: { x: number; y: number; }): { x: number; y: number; } {
    return {
        x: normalized.x * annotationCanvas.width,
        y: normalized.y * annotationCanvas.height,
    };
}

function startDrawing(e: MouseEvent | TouchEvent): void {
    isDrawing = true;
    const point = 'touches' in e ? e.touches[0] : e;
    const coords = getNormalizedCoords(point);
    const canvasCoords = toCanvasCoords(coords);
    lastX = canvasCoords.x;
    lastY = canvasCoords.y;

    // Show local cursor label
    if (currentTool !== 'eraser' && peerId) {
        const myColor = getPeerColor(peerId);
        updateCursorLabel('local', 'You', canvasCoords.x, canvasCoords.y, myColor, true);
    }
}

function draw(e: MouseEvent | TouchEvent): void {
    if (!isDrawing) return;
    e.preventDefault();

    const point = 'touches' in e ? e.touches[0] : e;
    const coords = getNormalizedCoords(point);
    const canvasCoords = toCanvasCoords(coords);

    // Use peer's assigned color (local user gets their color too)
    const myColor = peerId ? getPeerColor(peerId) : colorPicker.value;
    const color = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : myColor;
    const size = parseInt(brushSize.value);
    const compositeOp = currentTool === 'eraser' ? 'destination-out' : 'source-over';

    // Draw locally
    drawLine(lastX, lastY, canvasCoords.x, canvasCoords.y, color, size, compositeOp);

    // Update local cursor label position
    if (currentTool !== 'eraser' && peerId) {
        updateCursorLabel('local', 'You', canvasCoords.x, canvasCoords.y, myColor, true);
    }

    // Send to peers (normalized coordinates)
    send({
        type: 'dataChannelMessage',
        payload: {
            msgType: 'annotation-draw',
            fromX: lastX / annotationCanvas.width,
            fromY: lastY / annotationCanvas.height,
            toX: coords.x,
            toY: coords.y,
            color,
            size,
            compositeOp,
        },
    });

    lastX = canvasCoords.x;
    lastY = canvasCoords.y;
}

function stopDrawing(): void {
    if (isDrawing && currentTool !== 'eraser') {
        // Start fade timer for local label
        const label = cursorLabels.get('local');
        if (label) {
            label.isDrawing = false;
            label.fadeStartTime = Date.now() + LABEL_FADE_DELAY;
        }
        // Broadcast stroke end to peers
        send({
            type: 'dataChannelMessage',
            payload: { msgType: 'annotation-stroke-end' },
        });
    }
    isDrawing = false;
}

function drawLine(
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: string, size: number,
    compositeOp: GlobalCompositeOperation
): void {
    annotationCtx.globalCompositeOperation = compositeOp;
    annotationCtx.strokeStyle = annotationsVisible ? color : 'transparent';
    annotationCtx.lineWidth = size;
    annotationCtx.lineCap = 'round';
    annotationCtx.lineJoin = 'round';

    annotationCtx.beginPath();
    annotationCtx.moveTo(fromX, fromY);
    annotationCtx.lineTo(toX, toY);
    annotationCtx.stroke();
}

function drawRemoteAnnotation(payload: any, fromPeerId: string): void {
    const fromCoords = toCanvasCoords({ x: payload.fromX, y: payload.fromY });
    const toCoords = toCanvasCoords({ x: payload.toX, y: payload.toY });

    // Use peer's assigned color (override their color choice for visual distinction)
    const peerColor = getPeerColor(fromPeerId);
    const color = payload.compositeOp === 'destination-out' ? 'rgba(0,0,0,1)' : peerColor;

    drawLine(
        fromCoords.x, fromCoords.y,
        toCoords.x, toCoords.y,
        color,
        payload.size,
        payload.compositeOp
    );

    // Update remote peer's cursor label (follows their cursor)
    if (payload.compositeOp !== 'destination-out') {
        updateCursorLabel(fromPeerId, fromPeerId.slice(-6), toCoords.x, toCoords.y, peerColor, true);
    }
}

function handleRemoteStrokeEnd(fromPeerId: string): void {
    const label = cursorLabels.get(fromPeerId);
    if (label) {
        label.isDrawing = false;
        label.fadeStartTime = Date.now() + LABEL_FADE_DELAY;
    }
}

function updateCursorLabel(id: string, displayName: string, x: number, y: number, color: string, isDrawing: boolean): void {
    let label = cursorLabels.get(id);
    if (!label) {
        label = {
            peerId: id,
            displayName,
            x,
            y,
            color,
            opacity: 1,
            isDrawing,
            fadeStartTime: null,
        };
        cursorLabels.set(id, label);
    } else {
        label.x = x;
        label.y = y;
        label.color = color;
        label.isDrawing = isDrawing;
        label.opacity = 1;
        label.fadeStartTime = null; // Reset fade when drawing resumes
    }

    // Start animation loop if not running
    if (!labelAnimationId) {
        labelAnimationId = requestAnimationFrame(animateLabels);
    }
}

function animateLabels(): void {
    const now = Date.now();

    // Clear labels canvas
    labelsCtx.clearRect(0, 0, labelsCanvas.width, labelsCanvas.height);

    let hasActiveLabels = false;

    // Update and draw each cursor label
    cursorLabels.forEach((label, id) => {
        // Calculate opacity based on fade state
        if (label.fadeStartTime !== null) {
            const fadeElapsed = now - label.fadeStartTime;
            if (fadeElapsed >= LABEL_FADE_DURATION) {
                // Fully faded, remove label
                cursorLabels.delete(id);
                return;
            } else if (fadeElapsed > 0) {
                // Currently fading
                label.opacity = 1 - fadeElapsed / LABEL_FADE_DURATION;
            }
        }

        // Draw label
        renderLabel(label);
        hasActiveLabels = true;
    });

    // Continue animation if there are active labels
    if (hasActiveLabels) {
        labelAnimationId = requestAnimationFrame(animateLabels);
    } else {
        labelAnimationId = null;
    }
}

function renderLabel(label: CursorLabel): void {
    const padding = 4;
    const fontSize = 11;

    labelsCtx.save();
    labelsCtx.globalAlpha = label.opacity;
    labelsCtx.font = `bold ${fontSize}px sans-serif`;

    const textWidth = labelsCtx.measureText(label.displayName).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = fontSize + padding * 2;

    // Position label above and to the right of cursor
    const labelX = Math.min(label.x + 10, labelsCanvas.width - boxWidth - 5);
    const labelY = Math.max(label.y - 20, boxHeight + 5);

    // Draw background pill
    labelsCtx.fillStyle = label.color;
    labelsCtx.beginPath();
    labelsCtx.roundRect(labelX, labelY - boxHeight + padding, boxWidth, boxHeight, 4);
    labelsCtx.fill();

    // Draw text
    labelsCtx.fillStyle = '#FFFFFF';
    labelsCtx.fillText(label.displayName, labelX + padding, labelY);
    labelsCtx.restore();
}

function clearAnnotationCanvas(broadcast: boolean = true): void {
    annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    // Also clear temporary labels
    labelsCtx.clearRect(0, 0, labelsCanvas.width, labelsCanvas.height);
    cursorLabels.clear();

    if (broadcast) {
        send({
            type: 'dataChannelMessage',
            payload: { msgType: 'annotation-clear' },
        });
    }
}

function enableAnnotations(): void {
    annotationCanvas.classList.add('drawing');
    annotationCanvas.classList.remove('erasing');
    resizeAnnotationCanvas();
}

function disableAnnotations(): void {
    annotationCanvas.classList.remove('drawing', 'erasing');
}

// Tool button handlers
drawTool.onclick = () => {
    currentTool = 'draw';
    drawTool.classList.add('active');
    eraserTool.classList.remove('active');
    annotationCanvas.classList.remove('erasing');
    annotationCanvas.classList.add('drawing');
};

eraserTool.onclick = () => {
    currentTool = 'eraser';
    eraserTool.classList.add('active');
    drawTool.classList.remove('active');
    annotationCanvas.classList.remove('drawing');
    annotationCanvas.classList.add('erasing');
};

clearCanvasBtn.onclick = () => clearAnnotationCanvas(true);

toggleAnnotationsBtn.onclick = () => {
    annotationsVisible = !annotationsVisible;
    annotationCanvas.style.opacity = annotationsVisible ? '1' : '0';
    toggleAnnotationsBtn.textContent = annotationsVisible ? '👆' : '🚫';
};

// Canvas event listeners
annotationCanvas.addEventListener('mousedown', startDrawing);
annotationCanvas.addEventListener('mousemove', draw);
annotationCanvas.addEventListener('mouseup', stopDrawing);
annotationCanvas.addEventListener('mouseleave', stopDrawing);

// Touch support
annotationCanvas.addEventListener('touchstart', startDrawing, { passive: false });
annotationCanvas.addEventListener('touchmove', draw, { passive: false });
annotationCanvas.addEventListener('touchend', stopDrawing);

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

    // Enable annotations
    enableAnnotations();
}

function hideLocalScreenShare(): void {
    const preview = document.getElementById('local-screen-preview');
    if (preview) {
        screenShareContainer.innerHTML = '';
        mainStage.classList.add('hidden');
        // Disable annotations and clear canvas
        disableAnnotations();
        clearAnnotationCanvas(false);
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
