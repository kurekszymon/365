interface SignalingMessage {
    type: 'offer' | 'answer' | 'candidate' | 'ready' | 'bye';
    sdp?: string;
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
}

const startButton = document.getElementById('startButton') as HTMLButtonElement;
const hangupButton = document.getElementById('hangupButton') as HTMLButtonElement;
hangupButton.disabled = true;

const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;

const signaling = new BroadcastChannel('webrtc');
signaling.onmessage = (e: MessageEvent<SignalingMessage>) => {
    if (!localStream) {
        console.log('not ready yet');
        return;
    }
    switch (e.data.type) {
        case 'offer':
            handleOffer(e.data);
            break;
        case 'answer':
            handleAnswer(e.data);
            break;
        case 'candidate':
            handleCandidate(e.data);
            break;
        case 'ready':
            // A second tab joined. This tab will initiate a call unless in a call already.
            if (pc) {
                console.log('already in call, ignoring');
                return;
            }
            makeCall();
            break;
        case 'bye':
            if (pc) {
                hangup();
            }
            break;
        default:
            console.log('unhandled', e);
            break;
    }
};

startButton.onclick = async (): Promise<void> => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localVideo.srcObject = localStream;

    startButton.disabled = true;
    hangupButton.disabled = false;

    signaling.postMessage({ type: 'ready' });
};

hangupButton.onclick = async (): Promise<void> => {
    hangup();
    signaling.postMessage({ type: 'bye' });
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
    pc = new RTCPeerConnection();
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
        signaling.postMessage(message);
    };
    pc.ontrack = (e: RTCTrackEvent) => remoteVideo.srcObject = e.streams[0];
    if (localStream) {
        localStream.getTracks().forEach(track => pc!.addTrack(track, localStream!));
    }
}

async function makeCall(): Promise<void> {
    await createPeerConnection();

    const offer = await pc!.createOffer();
    signaling.postMessage({ type: 'offer', sdp: offer.sdp });
    await pc!.setLocalDescription(offer);
}

async function handleOffer(offer: SignalingMessage): Promise<void> {
    if (pc) {
        console.error('existing peerconnection');
        return;
    }
    await createPeerConnection();
    await pc!.setRemoteDescription({ type: 'offer', sdp: offer.sdp! });

    const answer = await pc!.createAnswer();
    signaling.postMessage({ type: 'answer', sdp: answer.sdp });
    await pc!.setLocalDescription(answer);
}

async function handleAnswer(answer: SignalingMessage): Promise<void> {
    if (!pc) {
        console.error('no peerconnection');
        return;
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp! });
}

async function handleCandidate(candidate: SignalingMessage): Promise<void> {
    if (!pc) {
        console.error('no peerconnection');
        return;
    }
    if (!candidate.candidate) {
        await pc.addIceCandidate(null);
    } else {
        await pc.addIceCandidate(new RTCIceCandidate({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid ?? undefined,
            sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
        }));
    }
}
