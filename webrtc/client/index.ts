import { sendMessage, sendFile } from './datachannel.ts';
import * as PC from './peerconnection.ts';

interface RoomMessage {
    type: 'join' | 'joined';
    room: string;
}

const roomInput = document.getElementById('roomInput') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

const joinButton = document.getElementById('joinButton') as HTMLButtonElement;
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const hangupButton = document.getElementById('hangupButton') as HTMLButtonElement;

const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;

startButton.disabled = true;
hangupButton.disabled = true;

let localStream: MediaStream | null = null;
let ws: WebSocket | null = null;
let currentRoom: string | null = null;

// DataChannel UI elements used by index only
const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
const sendChatButton = document.getElementById('sendChatButton') as HTMLButtonElement | null;
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
const sendFileButton = document.getElementById('sendFileButton') as HTMLButtonElement | null;

function connectWebSocket(): void {
    ws = new WebSocket('ws://localhost:8080'); // should upgrade ideally?

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

    ws.onmessage = (e: MessageEvent) => {
        const data = JSON.parse(e.data);

        switch (data.type) {
            case 'joined':
                statusDiv.textContent = `Joined room: ${data.room}`;
                startButton.disabled = false;
                break;
            case 'offer':
                if (localStream) PC.handleOffer(data, ws, localStream, (s) => { remoteVideo.srcObject = s; });
                break;
            case 'answer':
                PC.handleAnswer(data);
                break;
            case 'candidate':
                PC.handleCandidate(data);
                break;
            case 'ready':
                // A peer joined. Initiate call unless already in call.
                if (PC.getPeerConnection()) {
                    console.log('already in call, ignoring');
                    return;
                }
                if (localStream) PC.makeCall(ws, localStream, (s) => { remoteVideo.srcObject = s; });
                break;
            case 'bye':
                PC.hangup();
                stopLocalMedia();
                break;
            default:
                console.log('unhandled', data);
                break;
        }
    };
}

joinButton.onclick = (): void => {
    const room = roomInput.value.trim();
    if (!room) {
        alert('Please enter a room name');
        return;
    }

    currentRoom = room;
    connectWebSocket();

    // Wait for connection then join room
    const checkConnection = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const joinMessage: RoomMessage = { type: 'join', room: currentRoom! };
            ws.send(JSON.stringify(joinMessage));
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

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ready' }));
    }
};

hangupButton.onclick = async (): Promise<void> => {
    PC.hangup();
    stopLocalMedia();
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'bye' }));
    }
};

// UI handlers for DataChannel
if (sendChatButton) {
    sendChatButton.onclick = () => {
        const text = chatInput?.value?.trim();
        if (text) {
            sendMessage(text);
            if (chatInput) chatInput.value = '';
        }
    };
}
if (sendFileButton && fileInput) {
    sendFileButton.onclick = async () => {
        const files = fileInput.files;
        if (files && files.length > 0) {
            await sendFile(files[0]);
            fileInput.value = '';
        }
    };
}


async function stopLocalMedia(): Promise<void> {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    startButton.disabled = false;
    hangupButton.disabled = true;
}
