# electron

notes from docs

Many of Electron's core modules are Node.js event emitters that adhere to Node's asynchronous event-driven architecture. The app module is one of these emitters.

The executable runs the JavaScript entry point found in the main property of your package.json. This file controls Electron's main process, which runs an instance of Node.js and is responsible for your app's lifecycle, displaying native interfaces, performing privileged operations, and managing renderer processes.

Renderer processes (or renderers for short) are responsible for displaying graphical content. You can load a web page into a renderer by pointing it to either a web address or a local HTML file. Renderers behave very similarly to regular web pages and have access to the same web APIs.

Preload scripts are injected before a web page loads in the renderer, similar to a Chrome extension's content scripts. To add features to your renderer that require privileged access, you can define global objects through the contextBridge API.