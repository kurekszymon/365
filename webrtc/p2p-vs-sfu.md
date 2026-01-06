# P2P Mesh vs SFU Architecture

Switched from peer-to-peer mesh to SFU (Selective Forwarding Unit) using mediasoup.

## why the switch

### P2P mesh limitations
- each peer connects directly to every other peer
- with N peers, each client maintains N-1 connections
- upload bandwidth scales poorly: sending your stream N-1 times
- CPU usage explodes with more participants (encoding multiple times)
- practical limit ~4-5 participants before quality tanks

### SFU benefits
- single upload per client (to the server)
- server forwards streams to other participants
- scales much better for group calls
- simulcast support (multiple quality layers, server picks best for each receiver)
- easier to add features like recording, server-side processing

## tradeoffs

| aspect             | P2P mesh                 | SFU                          |
| ------------------ | ------------------------ | ---------------------------- |
| latency            | lower (direct)           | slightly higher (server hop) |
| server cost        | minimal (signaling only) | higher (media forwarding)    |
| bandwidth (client) | high upload              | low upload                   |
| scalability        | poor (4-5 max)           | good (dozens+)               |
| complexity         | simpler                  | more complex                 |
| privacy            | end-to-end possible      | server sees media            |

## implementation notes

- using mediasoup on server, mediasoup-client on browser
- each peer gets 2 transports: send (produce) and receive (consume)
- video uses simulcast with 3 quality layers (100k/300k/900k bitrate)
- chat/files go through websocket since mediasoup doesn't do DataChannels natively
- rooms are isolated with separate routers

## for local/offline use case

SFU still works for the "offline/local" goal:
- mediasoup server runs locally
- no external STUN/TURN needed on same subnet
- all traffic stays within local network
- just need the server accessible to all clients
