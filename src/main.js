const { BrowserWindow, app, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;

let win;
const createWindow = () => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    win.loadFile("src/editor/renderer/index.html");
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        }
    })
})

let maximizeToggle = false;
ipcMain.on("manualMinimize", () => {
    win.minimize();
});

ipcMain.on("manualMaximize", () => {
    if (maximizeToggle) {
        win.unmaximize();
    } else {
        win.maximize();
    }
    maximizeToggle = !maximizeToggle;
});

ipcMain.on("manualClose", () => {
    app.quit();
});

ipcMain.handle('openFile', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Python', extensions: ['py'] },
            { name: 'Text', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return null; 
    }
    const filePath = result.filePaths[0];
    try {
        const content = await fs.readFile(filePath, 'utf-8'); 
        return { filePath, content }; 
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
});

ipcMain.handle('saveFile', async () => {
    const result = await dialog.showSaveDialog({
        title: 'Сохранить файл',
        defaultPath: 'example.txt',
        filters: [
            { name: 'Python', extensions: ['py'] },
            { name: 'Text', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (result.canceled) {
        return null; 
    }
    return result.filePath;
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})