const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('node:path');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(path.resolve(), "preload.js")
        }
    });

    win.loadFile('index.html');
};

app.whenReady().then(() => {
    ipcMain.handle('ping', () => 'pong');

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
