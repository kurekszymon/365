const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,

    ping: () => ipcRenderer.invoke('ping') // never directly expose ipcRenderer
});

contextBridge.exposeInMainWorld('electronAPI', {
    sendMessage: (data) => ipcRenderer.send('message-from-renderer', data),
    onMessage: (callback) => ipcRenderer.on('message-from-main', (event, data) => callback(data))
});