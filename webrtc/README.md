webrtc is a ~~great~~ tool for media conferencing, wanted to dig into that to understand underlying mechanisms and what benefits/downsides it has.

some notes:
- besides rtc connection you require a seperate layer of communication, like sockets, to coordinate signaling between peers.
- because of that it's good to have it dockerized, so you don't need to remember what and how to build at all times.
- iceServers required for RTCPeerConnection can be empty if devices can be found in same subnet. local STUN server is required if NAT traversal is needed within local network. if direct connection is needed - TURN server would be required.
- chat support and file transfer is relatively easy, since webrtc exposes RTC data channel, useful for sending data between peers.
<!-- topology  -->
- started with P2P mesh topology, but switched to SFU (mediasoup) - mesh doesn't scale past 4-5 peers, upload bandwidth and CPU usage explodes. SFU means single upload to server which forwards to others. tradeoff is server now handles media forwarding instead of just signaling. see [p2p-vs-sfu.md](./p2p-vs-sfu.md) and [reddit post](https://www.reddit.com/r/WebRTC/comments/15jlf7x/thoughts_of_webrtc_or_any_other_alternatives_for/) for more details.
<!-- screensharing -->
- screen sharing with SFU works differently than P2P - you can produce a separate track so the consumers can identify it.
- gotcha: when a peer stops/restarts camera, the `producerClosed` message comes in two forms (with `consumerId (consumer's event)` vs `peerId+producerId (explicit closeProducer call)`). need to handle both or old dead tracks stick around and new ones don't display properly.
<!-- recording -->
- session recording uses MediaRecorder API with canvas compositing
- can't record HTMLVideoElement directly - need to draw to canvas and use `canvas.captureStream(fps)` to get a recordable stream.
- if you want to composite multiple sources (screen share + participant thumbnails + annotations), draw them all to a single canvas each frame via `requestAnimationFrame`.
- use `mediaRecorder.start(timeslice)` with a timeslice (e.g., 1000ms) to get data chunks periodically via `ondataavailable`, rather than one huge blob at the end.
- audio can be added to canvas stream: `canvasStream.addTrack(audioTrack.clone())` - clone the track to avoid affecting the original.