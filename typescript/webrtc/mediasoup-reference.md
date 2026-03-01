# mediasoup SFU Reference

Notes on my mediasoup implementation. See [P2P vs SFU](p2p-vs-sfu.md) for why I switched from mesh.

## my implementation

### server (`server/server.ts`)

single mediasoup worker, creates router per room. each peer gets:
- 2 transports (send + recv)
- producers for their audio/video
- consumers for each remote producer

state management:
```typescript
const rooms = new Map<string, Room>();      // roomId → { router, peers }
const peers = new Map<WebSocket, Peer>();   // ws → { id, transports, producers, consumers }
```

supported codecs: opus (audio), VP8, VP9, H264 (video)

ports: UDP 40000-49999 for RTP

### client (`client/index.ts`)

uses mediasoup-client Device. flow:
1. join room → get `routerRtpCapabilities`
2. `device.load()` with capabilities
3. create send transport → connect → produce audio/video
4. create recv transport → consume each remote producer

video uses simulcast with 3 layers: 100kbps, 300kbps, 900kbps

chat/files go through websocket (relayed by server) since mediasoup doesn't handle DataChannels

## actual message flow

```
Client                          Server
  │                               │
  ├─ join { room } ──────────────►│
  │◄─ joined { peerId,            │
  │     routerRtpCapabilities } ──┤
  │                               │
  ├─ createWebRtcTransport ──────►│  (send transport)
  │◄─ webRtcTransportCreated ─────┤
  ├─ connectWebRtcTransport ─────►│
  │◄─ webRtcTransportConnected ───┤
  │                               │
  ├─ produce { kind, rtpParams } ►│
  │◄─ produced { id } ────────────┤──► newProducer to others
  │                               │
  ├─ createWebRtcTransport ──────►│  (recv transport)
  │◄─ webRtcTransportCreated ─────┤
  ├─ connectWebRtcTransport ─────►│
  │                               │
  ├─ getProducers ───────────────►│
  │◄─ producers [ ] ──────────────┤
  │                               │
  ├─ consume { producerId } ─────►│
  │◄─ consumed { consumerId,      │
  │     rtpParameters } ──────────┤
  ├─ resumeConsumer ─────────────►│
  │◄─ (media flows) ──────────────┤
```

## running it
prerequisite:
`curl -fsSL https://bun.com/install | bash`

```bash
cd server && npm install && npm start

# client
cd client && npm run dev
```

for LAN: change `announcedIp` in server config from `127.0.0.1` to your local IP

## what's different from P2P

| P2P mesh                         | My SFU                              |
| -------------------------------- | ----------------------------------- |
| `RTCPeerConnection` directly     | Device + Transport abstraction      |
| offer/answer/candidate signaling | transport/produce/consume signaling |
| `pc.addTrack()`                  | `sendTransport.produce({ track })`  |
| `pc.ontrack`                     | `recvTransport.consume()`           |
| uploads N-1 streams              | uploads 1 stream                    |
| ~200 lines                       | ~500 lines                          |

## things to note

- peer IDs are `${Date.now()}-${random}` so tabs on same machine get different IDs
- consumers start paused, client must send `resumeConsumer`
- each peer tracks their own transports/producers/consumers in Maps
- empty rooms get cleaned up when last peer leaves
- `dataChannelMessage` type relays chat/files through websocket since mediasoup is media-only
