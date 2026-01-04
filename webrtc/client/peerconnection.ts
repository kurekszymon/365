import { createDataChannel, setupIncomingDataChannel, closeDataChannel } from './datachannel.ts';

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'candidate' | 'ready' | 'bye';
    sdp?: string;
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
}

let pc: RTCPeerConnection | null = null;

function createPeerConnection(localStream: MediaStream | null, ws: WebSocket | null, onTrack: (s: MediaStream) => void): RTCPeerConnection {
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

    pc.ontrack = (e: RTCTrackEvent) => onTrack(e.streams[0]);
    pc.ondatachannel = (e: RTCDataChannelEvent) => {
        setupIncomingDataChannel(e.channel);
    };

    if (localStream) localStream.getTracks().forEach(t => pc!.addTrack(t, localStream!));

    return pc;
}

export async function makeCall(ws: WebSocket | null, localStream: MediaStream | null, onTrack: (s: MediaStream) => void): Promise<void> {
    createPeerConnection(localStream, ws, onTrack);
    if (pc) {
        // caller creates DC
        createDataChannel(pc, 'chat');
    }

    const offer = await pc!.createOffer();
    if (ws && ws.readyState === WebSocket.OPEN) {
        const offerMessage: SignalingMessage = { type: 'offer', sdp: offer.sdp };
        ws.send(JSON.stringify(offerMessage));
    }
    await pc!.setLocalDescription(offer);
}

export async function handleOffer(offer: SignalingMessage, ws: WebSocket | null, localStream: MediaStream | null, onTrack: (s: MediaStream) => void): Promise<void> {
    if (pc) {
        console.error('existing peerconnection');
        return;
    }
    createPeerConnection(localStream, ws, onTrack);
    await pc!.setRemoteDescription({ type: 'offer', sdp: offer.sdp! });

    const answer = await pc!.createAnswer();
    if (ws && ws.readyState === WebSocket.OPEN) {
        const answerMessage: SignalingMessage = { type: 'answer', sdp: answer.sdp };
        ws.send(JSON.stringify(answerMessage));
    }
    await pc!.setLocalDescription(answer);
}

export async function handleAnswer(answer: SignalingMessage): Promise<void> {
    if (!pc) {
        console.error('no peerconnection');
        return;
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp! });
}

export async function handleCandidate(message: SignalingMessage): Promise<void> {
    if (!pc) {
        console.error('no peerconnection');
        return;
    }
    if (!message.candidate) {
        await pc.addIceCandidate(null as any);
        return;
    }
    await pc.addIceCandidate(new RTCIceCandidate({
        candidate: message.candidate,
        sdpMid: message.sdpMid ?? undefined,
        sdpMLineIndex: message.sdpMLineIndex ?? undefined,
    }));
}

export function hangup(): void {
    if (pc) {
        try { pc.close(); } catch (e) { /* ignore */ }
        pc = null;
    }
    closeDataChannel();
}

export function getPeerConnection(): RTCPeerConnection | null { return pc; }
