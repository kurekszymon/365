// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,

  ping: () => ipcRenderer.invoke('ping') // never directly expose ipcRenderer
});

type Message = { id: string, name: string; };

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (data: Message) => ipcRenderer.send('message-from-renderer', data),
  onMessage: (callback: (data: Message) => void) => ipcRenderer.on('message-from-main', (_, data: Message) => callback(data))
});