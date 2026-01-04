# 365

Created this repo so i can explore some programming concepts I wanted and learn document my progress over time. Aiming for a concept per month, unless something gets super interesting.

- [365](#365)
  - [webrtc](#webrtc)

## webrtc

webrtc is a great tool for media conferencing, wanted to dig into that to understand underlying mechanisms and what benefits/downsides it has.

**Project goal**: Create an "offline/local RTC connection", so that end user wouldn't require connecting to the public internet at any times (if possible).

some notes:
- besides rtc connection you require a seperate layer of communication, like sockets, to coordinate signaling between peers.
- because of that it's good to have it dockerized, so you don't need to remember what and how to build at all times.
- iceServers required for RTCPeerConnection can be empty if devices can be found in same subnet. local STUN server is required if NAT traversal is needed within local network. if direct connection is needed - TURN server would be required.
- chat support and file transfer is relatively easy, since webrtc exposes RTC data channel, useful for sending data between peers.
