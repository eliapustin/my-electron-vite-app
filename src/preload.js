const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onMavkinkData: (callback) => {
        ipcRenderer.on('mavlink-data', (event, data) => callback(data));
    },
    getUDPPort: () => ipcRenderer.invoke('get-udp-port')
});