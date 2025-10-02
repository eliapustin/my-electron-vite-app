const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onMavkinkData: (callback) => {
        ipcRenderer.on('mavlink-data', (event, data) => callback(data));
    },
    getUDPPort: () => ipcRenderer.invoke('get-udp-port'),

    //education:
    getAllLessons: () => ipcRenderer.invoke('get-all-lessons'),
    getLesson: (id) => ipcRenderer.invoke('get-lesson', id),
    saveLesson: (title, content) => ipcRenderer.invoke('save-lesson', title, content),
    updateLesson: (id, title, content) => ipcRenderer.invoke('update-lesson', id, title, content),
    deleteLesson: (id) => ipcRenderer.invoke('delete-lesson', id),
    saveAnnotation: (lessonId, selectedText, annotationText) => ipcRenderer.invoke('save-annotation', lessonId, selectedText, annotationText),
    getAnnotations: (lessonId) => ipcRenderer.invoke('get-annotations', lessonId),
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: (jsonData) => ipcRenderer.invoke('import-data', jsonData)
});