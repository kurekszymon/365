interface RoomMessage {
    type: 'join' | 'joined';
    room: string;
}

interface SignalingMessage {
    type: 'offer' | 'answer' | 'candidate' | 'ready' | 'bye';
    sdp?: string;
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
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

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let ws: WebSocket | null = null;
let currentRoom: string | null = null;

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
        const data: RoomMessage | SignalingMessage = JSON.parse(e.data);

        switch (data.type) {
            // WSS
            case 'joined':
                statusDiv.textContent = `Joined room: ${data.room}`;
                startButton.disabled = false;
                break;

            // RTC
            case 'offer':
                if (localStream) handleOffer(data);
                break;
            case 'answer':
                handleAnswer(data);
                break;
            case 'candidate':
                handleCandidate(data);
                break;
            case 'ready':
                if (pc) {
                    console.log('already in call, ignoring');
                    return;
                }
                if (localStream) {
                    makeCall();
                }
                break;
            case 'bye':
                if (pc) {
                    hangup();
                }
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
        const readyMessage: SignalingMessage = { type: 'ready' };
        ws.send(JSON.stringify(readyMessage));
    }
};

hangupButton.onclick = async (): Promise<void> => {
    hangup();
    if (ws && ws.readyState === WebSocket.OPEN) {
        const byeMessage: SignalingMessage = { type: 'bye' };
        ws.send(JSON.stringify(byeMessage));
    }
};

async function hangup(): Promise<void> {
    if (pc) {
        pc.close();
        pc = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    startButton.disabled = false;
    hangupButton.disabled = true;
}

function createPeerConnection(): void {
    pc = new RTCPeerConnection({ iceServers: [] });

    pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
        const message: SignalingMessage = {
            type: 'candidate',
            candidate: undefined,
            sdpMid: undefined,
            sdpMLineIndex: undefined,
        };
        if (e.candidate) {
            message.candidate = e.candidate.candidate;
            message.sdpMid = e.candidate.sdpMid;
            message.sdpMLineIndex = e.candidate.sdpMLineIndex;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    };
    pc.ontrack = (e: RTCTrackEvent) => remoteVideo.srcObject = e.streams[0];
    if (localStream) {
        localStream.getTracks().forEach(track => pc!.addTrack(track, localStream!));
    }
}

async function makeCall(): Promise<void> {
    createPeerConnection();

    const offer = await pc!.createOffer();
    if (ws && ws.readyState === WebSocket.OPEN) {
        const offerMessage: SignalingMessage = { type: 'offer', sdp: offer.sdp };
        ws.send(JSON.stringify(offerMessage));
    }
    await pc!.setLocalDescription(offer);
}

async function handleOffer(offer: SignalingMessage): Promise<void> {
    if (pc) {
        console.error('existing peerconnection');
        return;
    }

    createPeerConnection();

    await pc!.setRemoteDescription({ type: 'offer', sdp: offer.sdp! });

    const answer = await pc!.createAnswer();
    if (ws && ws.readyState === WebSocket.OPEN) {
        const answerMessage: SignalingMessage = { type: 'answer', sdp: answer.sdp };
        ws.send(JSON.stringify(answerMessage));
    }
    await pc!.setLocalDescription(answer);
}

async function handleAnswer(answer: SignalingMessage): Promise<void> {
    if (!pc) {
        console.error('no peerconnection');
        return;
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp! });
}

async function handleCandidate(message: SignalingMessage): Promise<void> {
    if (!pc) {
        console.error('no peerconnection');
        return;
    }
    if (!message.candidate) {
        await pc.addIceCandidate(null); // is this needed?
        return;
    }

    await pc.addIceCandidate(new RTCIceCandidate({
        candidate: message.candidate,
        sdpMid: message.sdpMid ?? undefined,
        sdpMLineIndex: message.sdpMLineIndex ?? undefined,
    }));
}
