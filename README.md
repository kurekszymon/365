# 365

Created this repo so i can explore some programming concepts I wanted and learn document my progress over time. Aiming for a concept per month, unless something gets super interesting.

- [365](#365)
  - [webrtc](#webrtc)
  - [electron](#electron)
  - [react 19](#react-19)

## webrtc

**Project goal**: Create an "offline/local RTC connection", so that end user wouldn't require connecting to the public internet at any times (if possible).

what i ended up doing was indeed create a offline/local RTC connection while using mesh / peer to peer connection.
after adding mediasoup, all the complexity made it not worth it for me to dig into NAT/STUN specific things to make it local, although it _can_ be done.
instead of this I went on a journey with claude opus to add some features to see how RTC handles some parts of it and how it goes with native browsers apis like MediaRecorder.
this allowed me to understand initial overhead sfu conferencing brings, and what pros/cons are behind it.

[link](./webrtc/README.md)

## electron

[link](./electron/README.md)

## react 19