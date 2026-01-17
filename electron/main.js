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

    win.loadFile('../19/dist/index.html', {
        query: {
            id: '123', name: 'test'
        }
    });

    mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
    ipcMain.handle('ping', () => 'pong');


    ipcMain.on('message-from-renderer', (_, data) => {
        console.log('Main received:', data);

        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('message-from-main', data);
        });
    });


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
