Отличная задача! Для реализации системы управления учебными материалами с сохранением в SQLite3 в вашем Electron-приложении предлагаю следующий план:

## 1. Установка зависимостей

```bash
npm install sqlite3
```

## 2. Создание базы данных и модуля работы с SQLite

**database.js**:
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const dbPath = path.join(dbDir, 'education.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        const lessonsTable = `
            CREATE TABLE IF NOT EXISTS lessons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const annotationsTable = `
            CREATE TABLE IF NOT EXISTS annotations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lesson_id INTEGER,
                selected_text TEXT,
                annotation_text TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
            )
        `;

        this.db.run(lessonsTable);
        this.db.run(annotationsTable);
    }

    // Методы для работы с уроками
    getAllLessons(callback) {
        this.db.all("SELECT * FROM lessons ORDER BY created_at DESC", callback);
    }

    getLesson(id, callback) {
        this.db.get("SELECT * FROM lessons WHERE id = ?", [id], callback);
    }

    saveLesson(title, content, callback) {
        this.db.run(
            "INSERT INTO lessons (title, content) VALUES (?, ?)",
            [title, content],
            function(err) {
                callback(err, this.lastID);
            }
        );
    }

    updateLesson(id, title, content, callback) {
        this.db.run(
            "UPDATE lessons SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [title, content, id],
            callback
        );
    }

    deleteLesson(id, callback) {
        this.db.run("DELETE FROM lessons WHERE id = ?", [id], callback);
    }

    // Методы для аннотаций
    getAnnotations(lessonId, callback) {
        this.db.all("SELECT * FROM annotations WHERE lesson_id = ?", [lessonId], callback);
    }

    saveAnnotation(lessonId, selectedText, annotationText, callback) {
        this.db.run(
            "INSERT INTO annotations (lesson_id, selected_text, annotation_text) VALUES (?, ?, ?)",
            [lessonId, selectedText, annotationText],
            callback
        );
    }

    // Экспорт/импорт
    exportData(callback) {
        this.db.serialize(() => {
            const data = {};
            
            this.db.all("SELECT * FROM lessons", (err, lessons) => {
                if (err) return callback(err);
                data.lessons = lessons;
                
                this.db.all("SELECT * FROM annotations", (err, annotations) => {
                    if (err) return callback(err);
                    data.annotations = annotations;
                    callback(null, JSON.stringify(data, null, 2));
                });
            });
        });
    }

    importData(jsonData, callback) {
        const data = JSON.parse(jsonData);
        
        this.db.serialize(() => {
            this.db.run("BEGIN TRANSACTION");
            
            // Очищаем существующие данные
            this.db.run("DELETE FROM annotations");
            this.db.run("DELETE FROM lessons");
            
            // Вставляем новые данные
            data.lessons.forEach(lesson => {
                this.db.run(
                    "INSERT INTO lessons (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                    [lesson.id, lesson.title, lesson.content, lesson.created_at, lesson.updated_at]
                );
            });
            
            data.annotations.forEach(annotation => {
                this.db.run(
                    "INSERT INTO annotations (id, lesson_id, selected_text, annotation_text, created_at) VALUES (?, ?, ?, ?, ?)",
                    [annotation.id, annotation.lesson_id, annotation.selected_text, annotation.annotation_text, annotation.created_at]
                );
            });
            
            this.db.run("COMMIT", callback);
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = Database;
```

## 3. Обновление preload.js для добавления новых API

**preload.js** (дополненный):
```javascript
const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onMavkinkData: (callback) => {
        ipcRenderer.on('mavlink-data', (event, data) => callback(data));
    },
    getUDPPort: () => ipcRenderer.invoke('get-udp-port'),
    
    // Новые API для работы с учебными материалами
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
```

## 4. Обновление main.js для обработки новых IPC-событий

**main.js** (дополненный):
```javascript
import { app, BrowserWindow, Menu, nativeTheme, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {UDPServer} from './udp-server/udp-server';
import Database from './database'; // Добавляем импорт базы данных

// ... существующий код ...

let db; // Добавляем переменную для базы данных

function createMainWindow() {
  // ... существующий код ...

  // Инициализируем базу данных после загрузки окна
  mainWindow.webContents.on('did-finish-load', () => {
    udpServer = new UDPServer(mainWindow);
    udpServer.start();
    
    // Инициализируем базу данных
    db = new Database();
  })
};

// ... существующий код ...

// Добавляем обработчики IPC для работы с базой данных
ipcMain.handle('get-all-lessons', async () => {
  return new Promise((resolve, reject) => {
    db.getAllLessons((err, lessons) => {
      if (err) reject(err);
      else resolve(lessons);
    });
  });
});

ipcMain.handle('get-lesson', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.getLesson(id, (err, lesson) => {
      if (err) reject(err);
      else resolve(lesson);
    });
  });
});

ipcMain.handle('save-lesson', async (event, title, content) => {
  return new Promise((resolve, reject) => {
    db.saveLesson(title, content, (err, id) => {
      if (err) reject(err);
      else resolve(id);
    });
  });
});

ipcMain.handle('update-lesson', async (event, id, title, content) => {
  return new Promise((resolve, reject) => {
    db.updateLesson(id, title, content, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

ipcMain.handle('delete-lesson', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.deleteLesson(id, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

ipcMain.handle('save-annotation', async (event, lessonId, selectedText, annotationText) => {
  return new Promise((resolve, reject) => {
    db.saveAnnotation(lessonId, selectedText, annotationText, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

ipcMain.handle('get-annotations', async (event, lessonId) => {
  return new Promise((resolve, reject) => {
    db.getAnnotations(lessonId, (err, annotations) => {
      if (err) reject(err);
      else resolve(annotations);
    });
  });
});

ipcMain.handle('export-data', async () => {
  return new Promise((resolve, reject) => {
    db.exportData((err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
});

ipcMain.handle('import-data', async (event, jsonData) => {
  return new Promise((resolve, reject) => {
    db.importData(jsonData, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

// Обработчик для выбора файла импорта/экспорта
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// ... существующий код ...

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
  if (udpServer) {
    udpServer.stop();
  }
  if (db) {
    db.close();
  }
});
```

## 5. Создание интерфейса редактора уроков

**education-editor.js**:
```javascript
class EducationEditor {
    constructor() {
        this.currentLessonId = null;
        this.annotations = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadLessons();
    }

    setupEventListeners() {
        // Кнопка добавления нового урока
        document.getElementById('add-lesson-btn').addEventListener('click', () => {
            this.showEditorModal();
        });

        // Кнопки экспорта/импорта
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            this.importData();
        });

        // Обработчик выделения текста
        document.addEventListener('selectionchange', this.handleTextSelection.bind(this));
    }

    async loadLessons() {
        try {
            const lessons = await window.electronAPI.getAllLessons();
            this.renderLessonsList(lessons);
        } catch (error) {
            console.error('Error loading lessons:', error);
        }
    }

    renderLessonsList(lessons) {
        const lessonsContainer = document.getElementById('lessons-list');
        lessonsContainer.innerHTML = '';

        lessons.forEach(lesson => {
            const lessonElement = document.createElement('div');
            lessonElement.className = 'lesson-item';
            lessonElement.innerHTML = `
                <h4>${lesson.title}</h4>
                <div class="lesson-actions">
                    <button class="btn btn-sm btn-primary view-lesson" data-id="${lesson.id}">Просмотр</button>
                    <button class="btn btn-sm btn-secondary edit-lesson" data-id="${lesson.id}">Редактировать</button>
                    <button class="btn btn-sm btn-danger delete-lesson" data-id="${lesson.id}">Удалить</button>
                </div>
            `;
            lessonsContainer.appendChild(lessonElement);
        });

        // Добавляем обработчики событий
        lessonsContainer.querySelectorAll('.view-lesson').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewLesson(parseInt(e.target.dataset.id));
            });
        });

        lessonsContainer.querySelectorAll('.edit-lesson').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editLesson(parseInt(e.target.dataset.id));
            });
        });

        lessonsContainer.querySelectorAll('.delete-lesson').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteLesson(parseInt(e.target.dataset.id));
            });
        });
    }

    async viewLesson(lessonId) {
        try {
            const lesson = await window.electronAPI.getLesson(lessonId);
            this.currentLessonId = lessonId;
            
            // Показываем урок в main-content
            document.getElementById('drone-container').style.display = 'none';
            document.getElementById('education-content').style.display = 'block';
            
            document.getElementById('lesson-title').textContent = lesson.title;
            document.getElementById('lesson-content').innerHTML = lesson.content;
            
            // Загружаем аннотации
            this.annotations = await window.electronAPI.getAnnotations(lessonId);
            
        } catch (error) {
            console.error('Error viewing lesson:', error);
        }
    }

    showEditorModal(lesson = null) {
        // Реализация модального окна редактора
        const modal = document.getElementById('editor-modal');
        const titleInput = document.getElementById('lesson-title-input');
        const contentTextarea = document.getElementById('lesson-content-input');

        if (lesson) {
            titleInput.value = lesson.title;
            contentTextarea.value = lesson.content;
            this.currentLessonId = lesson.id;
        } else {
            titleInput.value = '';
            contentTextarea.value = '';
            this.currentLessonId = null;
        }

        modal.style.display = 'block';
    }

    async saveLesson() {
        const title = document.getElementById('lesson-title-input').value;
        const content = document.getElementById('lesson-content-input').value;

        try {
            if (this.currentLessonId) {
                await window.electronAPI.updateLesson(this.currentLessonId, title, content);
            } else {
                await window.electronAPI.saveLesson(title, content);
            }
            
            this.hideEditorModal();
            this.loadLessons();
        } catch (error) {
            console.error('Error saving lesson:', error);
        }
    }

    handleTextSelection() {
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) {
            this.showAnnotationToolbar(selection);
        }
    }

    showAnnotationToolbar(selection) {
        // Создаем панель инструментов для добавления аннотации
        const toolbar = document.createElement('div');
        toolbar.className = 'annotation-toolbar';
        toolbar.innerHTML = `
            <button id="add-annotation-btn">Добавить аннотацию</button>
            <button id="cancel-annotation-btn">Отмена</button>
        `;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        toolbar.style.position = 'absolute';
        toolbar.style.top = `${rect.bottom + window.scrollY}px`;
        toolbar.style.left = `${rect.left + window.scrollX}px`;
        
        document.body.appendChild(toolbar);

        document.getElementById('add-annotation-btn').addEventListener('click', () => {
            this.addAnnotation(selection.toString());
            toolbar.remove();
        });

        document.getElementById('cancel-annotation-btn').addEventListener('click', () => {
            toolbar.remove();
            selection.removeAllRanges();
        });
    }

    async addAnnotation(selectedText) {
        const annotationText = prompt('Введите аннотацию для выделенного текста:');
        if (annotationText && this.currentLessonId) {
            try {
                await window.electronAPI.saveAnnotation(this.currentLessonId, selectedText, annotationText);
                this.annotations.push({ selected_text: selectedText, annotation_text: annotationText });
            } catch (error) {
                console.error('Error saving annotation:', error);
            }
        }
    }

    async exportData() {
        try {
            const data = await window.electronAPI.exportData();
            const result = await window.electronAPI.showSaveDialog({
                defaultPath: 'education-backup.json',
                filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });

            if (!result.canceled) {
                const fs = require('fs');
                fs.writeFileSync(result.filePath, data);
                alert('Данные успешно экспортированы!');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    }

    async importData() {
        try {
            const result = await window.electronAPI.showOpenDialog({
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
                properties: ['openFile']
            });

            if (!result.canceled) {
                const fs = require('fs');
                const data = fs.readFileSync(result.filePaths[0], 'utf8');
                await window.electronAPI.importData(data);
                this.loadLessons();
                alert('Данные успешно импортированы!');
            }
        } catch (error) {
            console.error('Error importing data:', error);
        }
    }
}
```

## 6. Обновление HTML для нового функционала

Добавьте в **index.html**:

```html
<!-- Модальное окно редактора -->
<div id="editor-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <h3>Редактор урока</h3>
        <input type="text" id="lesson-title-input" placeholder="Название урока">
        <textarea id="lesson-content-input" placeholder="Содержание урока"></textarea>
        <button id="save-lesson-btn">Сохранить</button>
        <button id="cancel-editor-btn">Отмена</button>
    </div>
</div>

<!-- Контент для обучения -->
<div id="education-content" style="display: none;">
    <h2 id="lesson-title"></h2>
    <div id="lesson-content"></div>
</div>

<!-- Кнопка добавления урока в sidebar-left -->
<button id="add-lesson-btn" class="btn btn-primary">Добавить урок</button>
<button id="export-btn" class="btn btn-secondary">Экспорт</button>
<button id="import-btn" class="btn btn-secondary">Импорт</button>
```

## 7. Интеграция с ActivityManager

Обновите **renderer.js**:

```javascript
// В методе setupEducationHandlers класса ActivityManager
setupEducationHandlers() {
    this.educationEditor = new EducationEditor();
}

// В методе switchActivity добавьте переключение контента
switchActivity(contentKey, button) {
    // ... существующий код ...
    
    // Переключаем отображение контента
    if (contentKey === 'education') {
        document.getElementById('drone-container').style.display = 'none';
        document.getElementById('education-content').style.display = 'block';
    } else {
        document.getElementById('drone-container').style.display = 'block';
        document.getElementById('education-content').style.display = 'none';
    }
}
```

Это комплексное решение предоставит:

1. **Локальную базу данных** SQLite для хранения уроков и аннотаций
2. **Rich-text редактор** для создания контента
3. **Систему аннотаций** с выделением текста
4. **Экспорт/импорт** данных в JSON
5. **Интеграцию** с существующей архитектурой приложения

Реализация модульная и может быть легко расширена дополнительным функционалом!