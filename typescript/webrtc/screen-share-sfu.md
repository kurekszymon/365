# Screen Sharing with WebRTC SFU (mediasoup)

## Overview

Screen sharing in an SFU (Selective Forwarding Unit) architecture differs from P2P WebRTC in key ways:
- The screen share track is **produced** to the SFU server as a separate producer
- Other participants **consume** the screen share from the SFU, not directly from the sharer
- The SFU forwards the stream to all consumers without transcoding (efficient)
- Uses `appData` to distinguish screen share producers from camera producers

## Architecture Flow

```
┌──────────────┐                    ┌─────────────┐                    ┌──────────────┐
│   Sharer     │                    │  mediasoup  │                    │  Viewer(s)   │
│              │                    │    SFU      │                    │              │
│ getDisplay   │                    │             │                    │              │
│   Media()   ─┼──▶ produce() ──▶   │  Router     │  ──▶ consume() ──▶ │  Display     │
│              │    (screen)        │             │      (screen)      │  Screen      │
└──────────────┘                    └─────────────┘                    └──────────────┘
```

## Implementation Guide

### 1. Capture Screen (Client)

```ts
// Request screen capture with optional audio (tab audio in Chrome)
const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 },
    },
    audio: true,
});
```

### 2. Produce to SFU (Client)

Use `appData` to identify the producer as a screen share:

```ts
const videoTrack = screenStream.getVideoTracks()[0];

const screenProducer = await sendTransport.produce({
    track: videoTrack,
    encodings: [
        { maxBitrate: 500000 },
        { maxBitrate: 1000000 },
        { maxBitrate: 5000000 },
    ],
    codecOptions: {
        videoGoogleStartBitrate: 1000,
    },
    appData: { type: 'screen' }, // mark as screen share
});

// Handle user stopping share via browser UI
videoTrack.onended = () => {
    stopScreenShare();
};
```

### 3. Handle on Server (mediasoup)

The server stores `appData` with the producer and broadcasts it:

```ts
case 'produce': {
    const producer = await transport.produce({
        kind: data.kind,
        rtpParameters: data.rtpParameters,
        appData: data.appData || {}, // Preserve appData
    });

    // Broadcast to other peers with appData
    broadcastToRoom(room, {
        type: 'newProducer',
        peerId: peer.id,
        producerId: producer.id,
        kind: producer.kind,
        appData: producer.appData, // Include appData
    }, ws);
}
```

### 4. Consume Screen Share (Client)

When receiving a new producer, check `appData` to determine if it's a screen share:

```ts
case 'newProducer': {
    const isScreen = data.appData?.type === 'screen';
    await consumeProducer(data.peerId, data.producerId, data.kind, data.appData);

    // Display in separate video element if screen share
    const video = getOrCreateRemoteVideo(data.peerId, isScreen);
}
```

### 5. Stop Screen Share

```ts
async function stopScreenShare(): Promise<void> {
    if (screenProducer) {
        // Notify server to close producer
        send({ type: 'closeProducer', producerId: screenProducer.id });
        screenProducer.close();
        screenProducer = null;
    }

    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }
}
```

## Key Differences from P2P

| Aspect         | P2P WebRTC                          | SFU (mediasoup)              |
| -------------- | ----------------------------------- | ---------------------------- |
| Track handling | `pc.addTrack()` or `replaceTrack()` | `transport.produce()`        |
| Signaling      | ICE + SDP renegotiation             | mediasoup signaling protocol |
| Distribution   | Direct to each peer                 | Server forwards to all       |
| Scalability    | Limited (mesh)                      | Good (single upload)         |
| Track ID       | Via SDP                             | Via `appData` metadata       |

## Codec Considerations

Screen content (text, UI) benefits from different codec settings than camera video:

```ts
// For screen shares, consider:
encodings: [
    {
        maxBitrate: 5000000,  // Higher bitrate for detail
        maxFramerate: 30,
    },
],
codecOptions: {
    videoGoogleStartBitrate: 2000,
},
```

For text-heavy content, VP9 or AV1 (if supported) provides better quality at lower bitrates than VP8.

## Simulcast for Screen Share

mediasoup supports simulcast, allowing viewers to receive different quality layers:

```ts
const screenProducer = await sendTransport.produce({
    track: videoTrack,
    encodings: [
        { rid: 'r0', maxBitrate: 500000, scaleResolutionDownBy: 4 },
        { rid: 'r1', maxBitrate: 1000000, scaleResolutionDownBy: 2 },
        { rid: 'r2', maxBitrate: 5000000, scaleResolutionDownBy: 1 },
    ],
    codecOptions: { videoGoogleStartBitrate: 1000 },
    appData: { type: 'screen' },
});
```

Consumers can then request specific layers based on their bandwidth/display size.

## Audio Capture

```ts
const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
});

const audioTrack = screenStream.getAudioTracks()[0];
if (audioTrack) {
    const screenAudioProducer = await sendTransport.produce({
        track: audioTrack,
        appData: { type: 'screen-audio' },
    });
}
```

**Note:** System audio capture is not supported via `getDisplayMedia`. Tab audio only works in Chromium browsers.

## UI/UX Best Practices

1. **Visual indicator**: Show when screen share is active
2. **Separate display**: Render screen shares larger than camera feeds
3. **Labels**: Clearly mark screen shares vs camera videos
4. **Stop button**: Make it easy to stop sharing
5. **Handle `track.onended`**: Browser UI can stop sharing

## Bandwidth Considerations

Screen sharing at high resolution consumes significant bandwidth:
- 1080p @ 30fps: ~3-5 Mbps
- 720p @ 30fps: ~1.5-2.5 Mbps

things to consider:
- Reducing frame rate for static content (15fps for presentations)
- Using simulcast to adapt to viewer bandwidth
- Implementing bandwidth estimation and layer switching

## Example: Complete Screen Share Flow

```ts
let screenStream: MediaStream | null = null;
let screenProducer: Producer | null = null;

async function startScreenShare() {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
    });

    const videoTrack = screenStream.getVideoTracks()[0];

    screenProducer = await sendTransport.produce({
        track: videoTrack,
        appData: { type: 'screen' },
    });

    videoTrack.onended = stopScreenShare;
}

async function stopScreenShare() {
    if (screenProducer) {
        send({ type: 'closeProducer', producerId: screenProducer.id });
        screenProducer.close();
        screenProducer = null;
    }

    screenStream?.getTracks().forEach(t => t.stop());
    screenStream = null;
}
```
