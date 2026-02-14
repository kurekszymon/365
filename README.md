# 365

Created this repo so i can explore some programming concepts I wanted and learn document my progress over time. Aiming for a concept per month, unless something gets super interesting.

- [365](#365)
  - [webrtc](#webrtc)
  - [electron](#electron)
  - [react 19](#react-19)
  - [webgpu](#webgpu)
  - [rust](#rust)

## articles

### mine

[git got gut](./posts/git-got-gut.md)

### found during some researching

- researching about js memory usage for numbers vs rust/cpp:
  https://angular.love/here-is-what-you-need-to-know-about-javascripts-number-type

## webrtc

**Project goal**: Create an "offline/local RTC connection", so that end user wouldn't require connecting to the public internet at any times (if possible).

what i ended up doing was indeed create a offline/local RTC connection while using mesh / peer to peer connection.
after adding mediasoup, all the complexity made it not worth it for me to dig into NAT/STUN specific things to make it local, although it _can_ be done.
instead of this I went on a journey with claude opus to add some features to see how RTC handles some parts of it and how it goes with native browsers apis like MediaRecorder.
this allowed me to understand initial overhead sfu conferencing brings, and what pros/cons are behind it.

[link](./webrtc/README.md)

## electron

**project goal**: run existing wasm application inside electron; add a possibility to open desktop application from within the app (open in desktop).

I was fairly successful in doing this, electron setup was not complicated at all, i just spent too much time debugging an issue after running `create-electron-app@latest electron`, since it's a limitation on macos and it was not possible to open packaged app with such name.
key takeways:

- use `preload` scripts to setup [communication](https://www.electronjs.org/docs/latest/tutorial/ipc) between `main` and `renderer` process
- `renderer` is a process responsible for well, rendering web content, it MAY have access to node.js environment
- `main` process is an entry point for electron app.
- [processes](https://www.electronjs.org/docs/latest/tutorial/process-model) share the same global object, but due to [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) you cannot set and retrieve properties on global object.
- opening desktop app from web is as simple as registering protocol in config (if using electron forge)

[link](./electron/README.md)

## react 19

playground for everything react, trying to build _consciously_ with AI, trying out some concepts and tech like

- tanstack router
- zustand
- broadcast channel
- local storage
- canvas drawing
- vite

ultimatelly I will try to circle back around this code to be able to run it from `electron` folder and combine it with `cpp` webassembly.

## webgpu

**project goal** I did not set any specific project goal here, maybe that's the issue. I tried to go over basic tutorial to get some understanding of what webgpu is and how to work with that, but it's _extremely_ hard, at least for me to understand the math behind it.

I want to come back to it when I will have bit more time a day to be able to draw and understand what's what there.

- got to know what's the process of using WebGPU
- was able to render some squares based on shaders
- future reference listed in #docs section in [read more](./webgpu/readme.md)

## rust

I wanted to try some functional-style language for some time now, I decided to give rust a try.
I don't have a proper idea on what to build with C++ and from some digging it really seems easier to build and distribute apps with rust than it is to do with c++ (cpack is so hard for me for whatever reason?).

**project goal** i want to first familiarize myself with concepts from the book and then build a code editor for my needs.
[read more](./rust/README.md)
