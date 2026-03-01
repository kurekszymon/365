# electron

## idea

~~idea is to have a running webapp and run it inside electron, check how to use broadcast channel in connection with ipc / renderers and main processes, how to pass values from outside to inside.~~
basically the idea for the app was to get familiar with electron, and see how to setup such app and open it from browser (custom protocol -> [link](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)).
see what's behind ipcs, get familiar with processes and how electron apps are running. the goal for this was to run existing wasm application inside a desktop process.

## communication
<!-- feels like im trying to add broadcast channel everywhere. -->

broadcast channel feels not needed, seems like renderer is a frontend app that gets rendered by the node process (main).
you can communicate with renderer, using IPC, or you can also pass url params when using `loadFile(file, opts)`.
~~im yet to discover how to pass it to loadURL, as it seems to be ignored (it's valid for vite dev server, and not applied in electron.)~~
with `loadURL` it as straight forward as it gets (don't know why it wouldn't work initially but it seems fine now.)
```
const url = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
url.searchParams.append('name', '123');
url.searchParams.append('id', '456');

mainWindow.loadURL(url.toString()) // works
mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?name=123&id=456`); // works too
```

to open electron app from web you'd need to setup custom protocol - define it in `main` and register in `forge.config`

## notes from docs

Many of Electron's core modules are Node.js event emitters that adhere to Node's asynchronous event-driven architecture. The app module is one of these emitters.

The executable runs the JavaScript entry point found in the main property of your package.json. This file controls Electron's main process, which runs an instance of Node.js and is responsible for your app's lifecycle, displaying native interfaces, performing privileged operations, and managing renderer processes.

Renderer processes (or renderers for short) are responsible for displaying graphical content. You can load a web page into a renderer by pointing it to either a web address or a local HTML file. Renderers behave very similarly to regular web pages and have access to the same web APIs.

Preload scripts are injected before a web page loads in the renderer, similar to a Chrome extension's content scripts. To add features to your renderer that require privileged access, you can define global objects through the contextBridge API.


A preload script contains code that runs before your web page is loaded into the browser window. It has access to both DOM APIs and Node.js environment, and is often used to expose privileged APIs to the renderer via the contextBridge API.

Because the main and renderer processes have very different responsibilities, Electron apps often use the preload script to set up inter-process communication (IPC) interfaces to pass arbitrary messages between the two kinds of processes.

read more on process model
https://www.electronjs.org/docs/latest/tutorial/process-model
read more on IPC
https://www.electronjs.org/docs/latest/tutorial/ipc


# electron-forge
use forge to package and distribute your app
apps need to be packaged to use deep linking