const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onMavkinkData: (callback) => {
        ipcRenderer.on('mavlink-data', (event, data) => callback(data));
    },
    getUDPPort: () => ipcRenderer.invoke('get-udp-port'),

    //education:
    getAllLessons: () => ipcRenderer.invoke('get-all-lessons'),
    getLesson: (id) => ipcRenderer.invoke('get-lesson', id),
    saveLesson: (id, title, content) => ipcRenderer.invoke('save-lesson', id, title, content),
    updateLesson: (id, title, content) => ipcRenderer.invoke('update-lesson', id, title, content),
    deleteLesson: (id) => ipcRenderer.invoke('delete-lesson', id),
    saveAnnotation: (lessonId, selectedText, annotationText) => ipcRenderer.invoke('save-annotation', lessonId, selectedText, annotationText),
    getAnnotations: (lessonId) => ipcRenderer.invoke('get-annotations', lessonId),
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: (jsonData) => ipcRenderer.invoke('import-data', jsonData),

    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

    openMakeLessonWindow: () => ipcRenderer.invoke('open-make-lesson-window'),
    getCoursesStructure: () => ipcRenderer.invoke('get-courses-structure'),

    updateChapterName: (chapter, newName) => ipcRenderer.invoke('update-chapter-name', chapter, newName),
    updateTopicName: (chapter, topic, newName) => ipcRenderer.invoke('update-topic-name', chapter, topic, newName),
    moveLesson: (oldId, newChapter, newTopic, newLessonNum) => ipcRenderer.invoke('move-lesson', oldId, newChapter, newTopic, newLessonNum),

    // Новые методы для глав
    getAllChapters: () => ipcRenderer.invoke('get-all-chapters'),
    createChapter: (number, name, description) => ipcRenderer.invoke('create-chapter', number, name, description),
    updateChapter: (number, name, description) => ipcRenderer.invoke('update-chapter', number, name, description),
    deleteChapter: (number) => ipcRenderer.invoke('delete-chapter', number),
    
    // Новые методы для тем
    getTopicsByChapter: (chapterNumber) => ipcRenderer.invoke('get-topics-by-chapter', chapterNumber),
    getAllTopics: () => ipcRenderer.invoke('get-all-topics'),
    createTopic: (chapterNumber, number, name, description) => ipcRenderer.invoke('create-topic', chapterNumber, number, name, description),
    updateTopic: (chapterNumber, topicNumber, name, description) => ipcRenderer.invoke('update-topic', chapterNumber, topicNumber, name, description),
    deleteTopic: (chapterNumber, number) => ipcRenderer.invoke('delete-topic', chapterNumber, number),
});