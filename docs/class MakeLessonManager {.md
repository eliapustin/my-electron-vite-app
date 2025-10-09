class MakeLessonManager {
    constructor() {
        this.currentLessonId = null;
        this.coursesStructure = [];
        this.chapters = [];
        this.topics = [];
        this.init();
    }

    Самый простой подход - создать отдельные таблицы для глав и тем. Вот полное решение:
    
    ## 1. Обновите `database.js` - добавьте таблицы для структуры
    
    ```javascript
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const fs = require('fs');
    
    export class Database {
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
            // Таблица для глав
            const chaptersTable = `
                CREATE TABLE IF NOT EXISTS chapters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    number INTEGER UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;
    
            // Таблица для тем
            const topicsTable = `
                CREATE TABLE IF NOT EXISTS topics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chapter_number INTEGER NOT NULL,
                    number INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (chapter_number) REFERENCES chapters (number) ON DELETE CASCADE,
                    UNIQUE(chapter_number, number)
                )
            `;
    
            // Таблица для уроков (оставляем как есть)
            const lessonsTable = `
                CREATE TABLE IF NOT EXISTS lessons (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;
    
            const annotationsTable = `
                CREATE TABLE IF NOT EXISTS annotations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lesson_id TEXT,
                    selected_text TEXT,
                    annotation_text TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
                )
            `;
    
            this.db.run(chaptersTable);
            this.db.run(topicsTable);
            this.db.run(lessonsTable);
            this.db.run(annotationsTable);
        }
    
        // === МЕТОДЫ ДЛЯ ГЛАВ ===
        getAllChapters(callback) {
            this.db.all("SELECT * FROM chapters ORDER BY number", callback);
        }
    
        getChapter(number, callback) {
            this.db.get("SELECT * FROM chapters WHERE number = ?", [number], callback);
        }
    
        createChapter(number, name, description, callback) {
            this.db.run(
                "INSERT INTO chapters (number, name, description) VALUES (?, ?, ?)",
                [number, name, description],
                function(err) {
                    callback(err, this.lastID);
                }
            );
        }
    
        updateChapter(number, name, description, callback) {
            this.db.run(
                "UPDATE chapters SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE number = ?",
                [name, description, number],
                callback
            );
        }
    
        deleteChapter(number, callback) {
            this.db.run("DELETE FROM chapters WHERE number = ?", [number], callback);
        }
    
        // === МЕТОДЫ ДЛЯ ТЕМ ===
        getTopicsByChapter(chapterNumber, callback) {
            this.db.all("SELECT * FROM topics WHERE chapter_number = ? ORDER BY number", [chapterNumber], callback);
        }
    
        getAllTopics(callback) {
            this.db.all(`
                SELECT t.*, c.name as chapter_name 
                FROM topics t 
                LEFT JOIN chapters c ON t.chapter_number = c.number 
                ORDER BY t.chapter_number, t.number
            `, callback);
        }
    
        createTopic(chapterNumber, number, name, description, callback) {
            this.db.run(
                "INSERT INTO topics (chapter_number, number, name, description) VALUES (?, ?, ?, ?)",
                [chapterNumber, number, name, description],
                function(err) {
                    callback(err, this.lastID);
                }
            );
        }
    
        updateTopic(chapterNumber, topicNumber, name, description, callback) {
            this.db.run(
                "UPDATE topics SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE chapter_number = ? AND number = ?",
                [name, description, chapterNumber, topicNumber],
                callback
            );
        }
    
        deleteTopic(chapterNumber, number, callback) {
            this.db.run("DELETE FROM topics WHERE chapter_number = ? AND number = ?", [chapterNumber, number], callback);
        }
    
        // === МЕТОДЫ ДЛЯ УРОКОВ (оставляем без изменений) ===
        getAllLessons(callback) {
            this.db.all("SELECT * FROM lessons ORDER BY created_at DESC", callback);
        }
    
        getLesson(id, callback) {
            this.db.get("SELECT * FROM lessons WHERE id = ?", [id], callback);
        }
    
        saveLesson(id, title, content, callback) {
            this.db.run(
                "INSERT INTO lessons (id, title, content) VALUES (?, ?, ?)",
                [id, title, content],
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
    
        // ... остальные методы (аннотации, экспорт/импорт) без изменений
    
        // === НОВЫЙ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ПОЛНОЙ СТРУКТУРЫ ===
        getCoursesStructure(callback) {
            this.db.serialize(() => {
                // Получаем все главы
                this.db.all("SELECT * FROM chapters ORDER BY number", (err, chapters) => {
                    if (err) return callback(err);
                    
                    const structure = [];
                    let processed = 0;
                    
                    if (chapters.length === 0) {
                        return callback(null, []);
                    }
                    
                    // Для каждой главы получаем темы и уроки
                    chapters.forEach(chapter => {
                        // Получаем темы для этой главы
                        this.db.all(
                            "SELECT * FROM topics WHERE chapter_number = ? ORDER BY number", 
                            [chapter.number], 
                            (err, topics) => {
                                if (err) return callback(err);
                                
                                const chapterWithTopics = {
                                    chapter: chapter.number,
                                    chapterName: chapter.name,
                                    topics: []
                                };
                                
                                let topicsProcessed = 0;
                                
                                if (topics.length === 0) {
                                    structure.push(chapterWithTopics);
                                    processed++;
                                    if (processed === chapters.length) {
                                        callback(null, structure);
                                    }
                                    return;
                                }
                                
                                // Для каждой темы получаем уроки
                                topics.forEach(topic => {
                                    // Получаем уроки для этой темы
                                    const topicPattern = `${chapter.number}.${topic.number}.%`;
                                    this.db.all(
                                        "SELECT * FROM lessons WHERE id LIKE ? ORDER BY id",
                                        [topicPattern],
                                        (err, lessons) => {
                                            if (err) return callback(err);
                                            
                                            const topicWithLessons = {
                                                topic: topic.number,
                                                topicName: topic.name,
                                                lessons: lessons.map(lesson => {
                                                    const parts = lesson.id.split('.');
                                                    return {
                                                        id: lesson.id,
                                                        number: parseInt(parts[2]),
                                                        title: lesson.title
                                                    };
                                                })
                                            };
                                            
                                            chapterWithTopics.topics.push(topicWithLessons);
                                            topicsProcessed++;
                                            
                                            if (topicsProcessed === topics.length) {
                                                structure.push(chapterWithTopics);
                                                processed++;
                                                if (processed === chapters.length) {
                                                    callback(null, structure);
                                                }
                                            }
                                        }
                                    );
                                });
                            }
                        );
                    });
                });
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
    
    ## 2. Обновите `main.js` - добавьте обработчики для глав и тем
    
    ```javascript
    // Добавьте эти обработчики в main.js после существующих IPC обработчиков:
    
    // === ОБРАБОТЧИКИ ДЛЯ ГЛАВ ===
    ipcMain.handle('get-all-chapters', async () => {
      return new Promise((resolve, reject) => {
        db.getAllChapters((err, chapters) => {
          if (err) reject(err);
          else resolve(chapters);
        });
      });
    });
    
    ipcMain.handle('create-chapter', async (event, number, name, description) => {
      return new Promise((resolve, reject) => {
        db.createChapter(number, name, description, (err, chapterId) => {
          if (err) reject(err);
          else resolve(chapterId);
        });
      });
    });
    
    ipcMain.handle('update-chapter', async (event, number, name, description) => {
      return new Promise((resolve, reject) => {
        db.updateChapter(number, name, description, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    
    ipcMain.handle('delete-chapter', async (event, number) => {
      return new Promise((resolve, reject) => {
        db.deleteChapter(number, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    
    // === ОБРАБОТЧИКИ ДЛЯ ТЕМ ===
    ipcMain.handle('get-topics-by-chapter', async (event, chapterNumber) => {
      return new Promise((resolve, reject) => {
        db.getTopicsByChapter(chapterNumber, (err, topics) => {
          if (err) reject(err);
          else resolve(topics);
        });
      });
    });
    
    ipcMain.handle('get-all-topics', async () => {
      return new Promise((resolve, reject) => {
        db.getAllTopics((err, topics) => {
          if (err) reject(err);
          else resolve(topics);
        });
      });
    });
    
    ipcMain.handle('create-topic', async (event, chapterNumber, number, name, description) => {
      return new Promise((resolve, reject) => {
        db.createTopic(chapterNumber, number, name, description, (err, topicId) => {
          if (err) reject(err);
          else resolve(topicId);
        });
      });
    });
    
    ipcMain.handle('update-topic', async (event, chapterNumber, topicNumber, name, description) => {
      return new Promise((resolve, reject) => {
        db.updateTopic(chapterNumber, topicNumber, name, description, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    
    ipcMain.handle('delete-topic', async (event, chapterNumber, number) => {
      return new Promise((resolve, reject) => {
        db.deleteTopic(chapterNumber, number, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    
    // Обновите обработчик получения структуры курсов
    ipcMain.handle('get-courses-structure', async () => {
      return new Promise((resolve, reject) => {
        db.getCoursesStructure((err, structure) => {
          if (err) reject(err);
          else resolve(structure);
        });
      });
    });
    ```
    
    ## 3. Обновите `preload.js` - добавьте новые API
    
    ```javascript
    contextBridge.exposeInMainWorld('electronAPI', {
        // существующие методы...
        
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
        
        // Обновленный метод для структуры
        getCoursesStructure: () => ipcRenderer.invoke('get-courses-structure')
    });
    ```
    
    ## 4. Упрощенный `make-lesson-manager.js`
    
    ```javascript
    class MakeLessonManager {
        constructor() {
            this.currentLessonId = null;
            this.coursesStructure = [];
            this.chapters = [];
            this.topics = [];
            this.init();
        }
    
        async init() {
            await this.loadChapters();
            await this.loadCoursesStructure();
            this.setupEventListeners();
            this.renderStructureSelector();
        }
    
        async loadChapters() {
            try {
                this.chapters = await window.electronAPI.getAllChapters();
            } catch (error) {
                console.error('Error loading chapters:', error);
            }
        }
    
        async loadCoursesStructure() {
            try {
                this.coursesStructure = await window.electronAPI.getCoursesStructure();
            } catch (error) {
                console.error('Error loading courses structure:', error);
            }
        }
    
        setupEventListeners() {
            document.getElementById('save-lesson-btn').addEventListener('click', () => {
                this.saveLesson();
            });
    
            document.getElementById('cancel-editor-btn').addEventListener('click', () => {
                window.close();
            });
        }
    
        renderStructureSelector() {
            const container = document.getElementById('structure-selector');
            if (!container) return;
    
            container.innerHTML = `
                <div class="structure-section mb-4">
                    <h4>Структура курса</h4>
                    <div class="mb-3">
                        <button class="btn btn-sm btn-outline-primary me-2" id="add-chapter-btn">+ Добавить главу</button>
                        <button class="btn btn-sm btn-outline-secondary" id="add-topic-btn">+ Добавить тему</button>
                    </div>
                    <div class="structure-tree">
                        ${this.coursesStructure.map(course => this.renderChapter(course)).join('')}
                        ${this.coursesStructure.length === 0 ? '<p class="text-muted">Нет созданных глав</p>' : ''}
                    </div>
                </div>
                <div class="lesson-placement mb-4">
                    <h5>Размещение урока</h5>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Глава</label>
                            <select class="form-select" id="chapter-select">
                                <option value="">Выберите главу</option>
                                ${this.chapters.map(chapter => 
                                    `<option value="${chapter.number}">${chapter.number}. ${chapter.name}</option>`
                                ).join('')}
                                <option value="new">+ Новая глава</option>
                            </select>
                            <div id="new-chapter-fields" style="display: none;" class="mt-2">
                                <input type="number" class="form-control mb-2" id="new-chapter-number" placeholder="Номер главы">
                                <input type="text" class="form-control" id="new-chapter-name" placeholder="Название главы">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Тема</label>
                            <select class="form-select" id="topic-select" disabled>
                                <option value="">Сначала выберите главу</option>
                            </select>
                            <div id="new-topic-fields" style="display: none;" class="mt-2">
                                <input type="number" class="form-control mb-2" id="new-topic-number" placeholder="Номер темы">
                                <input type="text" class="form-control" id="new-topic-name" placeholder="Название темы">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Урок</label>
                            <input type="number" class="form-control" id="lesson-number" placeholder="Номер урока" value="1">
                        </div>
                    </div>
                </div>
            `;
    
            this.setupStructureEventListeners();
            this.setupActionButtons();
        }
    
        renderChapter(chapter) {
            return `
                <div class="chapter-item mb-3 p-3 border rounded">
                    <div class="chapter-header d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong class="h5">${chapter.chapter}. ${chapter.chapterName}</strong>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-warning edit-chapter" data-chapter="${chapter.chapter}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-chapter" data-chapter="${chapter.chapter}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="topics-list">
                        ${chapter.topics.map(topic => this.renderTopic(chapter.chapter, topic)).join('')}
                        ${chapter.topics.length === 0 ? '<p class="text-muted small">Нет тем</p>' : ''}
                    </div>
                </div>
            `;
        }
    
        renderTopic(chapterNumber, topic) {
            return `
                <div class="topic-item mb-2 p-2 border rounded bg-light">
                    <div class="topic-header d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${topic.topic}. ${topic.topicName}</strong>
                            <span class="badge bg-secondary ms-2">${topic.lessons.length} уроков</span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-warning edit-topic" 
                                    data-chapter="${chapterNumber}" data-topic="${topic.topic}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-topic" 
                                    data-chapter="${chapterNumber}" data-topic="${topic.topic}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="lessons-list mt-2">
                        ${topic.lessons.map(lesson => 
                            `<div class="lesson-item small text-muted">${lesson.number}. ${lesson.title}</div>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
    
        setupActionButtons() {
            // Обработчики для кнопок добавления
            document.getElementById('add-chapter-btn').addEventListener('click', () => {
                this.showAddChapterModal();
            });
    
            document.getElementById('add-topic-btn').addEventListener('click', () => {
                this.showAddTopicModal();
            });
    
            // Обработчики для редактирования и удаления
            document.addEventListener('click', (e) => {
                if (e.target.closest('.edit-chapter')) {
                    const chapterNumber = e.target.closest('.edit-chapter').dataset.chapter;
                    this.editChapter(chapterNumber);
                } else if (e.target.closest('.delete-chapter')) {
                    const chapterNumber = e.target.closest('.delete-chapter').dataset.chapter;
                    this.deleteChapter(chapterNumber);
                } else if (e.target.closest('.edit-topic')) {
                    const btn = e.target.closest('.edit-topic');
                    const chapterNumber = btn.dataset.chapter;
                    const topicNumber = btn.dataset.topic;
                    this.editTopic(chapterNumber, topicNumber);
                } else if (e.target.closest('.delete-topic')) {
                    const btn = e.target.closest('.delete-topic');
                    const chapterNumber = btn.dataset.chapter;
                    const topicNumber = btn.dataset.topic;
                    this.deleteTopic(chapterNumber, topicNumber);
                }
            });
        }
    
        async showAddChapterModal() {
            const number = prompt('Введите номер главы:');
            if (!number) return;
            
            const name = prompt('Введите название главы:');
            if (!name) return;
    
            try {
                await window.electronAPI.createChapter(parseInt(number), name, '');
                await this.loadChapters();
                await this.loadCoursesStructure();
                this.renderStructureSelector();
                alert('Глава успешно создана!');
            } catch (error) {
                console.error('Error creating chapter:', error);
                alert('Ошибка при создании главы: ' + error.message);
            }
        }
    
        async editChapter(chapterNumber) {
            const chapter = this.chapters.find(c => c.number == chapterNumber);
            if (!chapter) return;
    
            const newName = prompt('Введите новое название главы:', chapter.name);
            if (!newName || newName === chapter.name) return;
    
            try {
                await window.electronAPI.updateChapter(chapterNumber, newName, chapter.description);
                await this.loadChapters();
                await this.loadCoursesStructure();
                this.renderStructureSelector();
                alert('Глава успешно обновлена!');
            } catch (error) {
                console.error('Error updating chapter:', error);
                alert('Ошибка при обновлении главы: ' + error.message);
            }
        }
    
        async deleteChapter(chapterNumber) {
            if (!confirm('Вы уверены, что хотите удалить эту главу? Все темы и уроки также будут удалены.')) {
                return;
            }
    
            try {
                await window.electronAPI.deleteChapter(chapterNumber);
                await this.loadChapters();
                await this.loadCoursesStructure();
                this.renderStructureSelector();
                alert('Глава успешно удалена!');
            } catch (error) {
                console.error('Error deleting chapter:', error);
                alert('Ошибка при удалении главы: ' + error.message);
            }
        }
    
        async showAddTopicModal() {
            if (this.chapters.length === 0) {
                alert('Сначала создайте хотя бы одну главу');
                return;
            }
    
            const chapterNumber = prompt('Введите номер главы для новой темы:');
            if (!chapterNumber) return;
    
            const chapter = this.chapters.find(c => c.number == chapterNumber);
            if (!chapter) {
                alert('Глава с таким номером не существует');
                return;
            }
    
            const number = prompt('Введите номер темы:');
            if (!number) return;
    
            const name = prompt('Введите название темы:');
            if (!name) return;
    
            try {
                await window.electronAPI.createTopic(parseInt(chapterNumber), parseInt(number), name, '');
                await this.loadCoursesStructure();
                this.renderStructureSelector();
                alert('Тема успешно создана!');
            } catch (error) {
                console.error('Error creating topic:', error);
                alert('Ошибка при создании темы: ' + error.message);
            }
        }
    
        async editTopic(chapterNumber, topicNumber) {
            try {
                const topics = await window.electronAPI.getTopicsByChapter(chapterNumber);
                const topic = topics.find(t => t.number == topicNumber);
                if (!topic) return;
    
                const newName = prompt('Введите новое название темы:', topic.name);
                if (!newName || newName === topic.name) return;
    
                await window.electronAPI.updateTopic(chapterNumber, topicNumber, newName, topic.description);
                await this.loadCoursesStructure();
                this.renderStructureSelector();
                alert('Тема успешно обновлена!');
            } catch (error) {
                console.error('Error updating topic:', error);
                alert('Ошибка при обновлении темы: ' + error.message);
            }
        }
    
        async deleteTopic(chapterNumber, topicNumber) {
            if (!confirm('Вы уверены, что хотите удалить эту тему? Все уроки в теме также будут удалены.')) {
                return;
            }
    
            try {
                await window.electronAPI.deleteTopic(chapterNumber, topicNumber);
                await this.loadCoursesStructure();
                this.renderStructureSelector();
                alert('Тема успешно удалена!');
            } catch (error) {
                console.error('Error deleting topic:', error);
                alert('Ошибка при удалении темы: ' + error.message);
            }
        }
    
        setupStructureEventListeners() {
            const chapterSelect = document.getElementById('chapter-select');
            const topicSelect = document.getElementById('topic-select');
    
            chapterSelect.addEventListener('change', () => {
                if (chapterSelect.value === 'new') {
                    document.getElementById('new-chapter-fields').style.display = 'block';
                    topicSelect.disabled = true;
                    topicSelect.innerHTML = '<option value="">Сначала создайте главу</option>';
                } else {
                    document.getElementById('new-chapter-fields').style.display = 'none';
                    this.updateTopicSelect(chapterSelect.value);
                }
            });
        }
    
        async updateTopicSelect(chapterNumber) {
            const topicSelect = document.getElementById('topic-select');
            
            try {
                const topics = await window.electronAPI.getTopicsByChapter(chapterNumber);
                topicSelect.innerHTML = `
                    <option value="">Выберите тему</option>
                    ${topics.map(topic => 
                        `<option value="${topic.number}">${topic.number}. ${topic.name}</option>`
                    ).join('')}
                `;
                topicSelect.disabled = false;
            } catch (error) {
                console.error('Error loading topics:', error);
                topicSelect.innerHTML = '<option value="">Ошибка загрузки тем</option>';
            }
        }
    
        async saveLesson() {
            const title = document.getElementById('lesson-title-input').value;
            const content = document.getElementById('lesson-content-input').value;
            const lessonNumber = document.getElementById('lesson-number').value;
            
            const chapterSelect = document.getElementById('chapter-select');
            const topicSelect = document.getElementById('topic-select');
            
            let chapter, topic;
    
            if (chapterSelect.value === 'new') {
                const newChapterNumber = document.getElementById('new-chapter-number').value;
                const newChapterName = document.getElementById('new-chapter-name').value;
                
                if (!newChapterNumber || !newChapterName) {
                    alert('Пожалуйста, заполните поля для новой главы');
                    return;
                }
                
                try {
                    await window.electronAPI.createChapter(parseInt(newChapterNumber), newChapterName, '');
                    chapter = newChapterNumber;
                } catch (error) {
                    alert('Ошибка при создании главы: ' + error.message);
                    return;
                }
            } else {
                chapter = chapterSelect.value;
            }
    
            if (!topicSelect.value) {
                alert('Пожалуйста, выберите тему');
                return;
            } else {
                topic = topicSelect.value;
            }
    
            if (!chapter || !topic || !lessonNumber) {
                alert('Пожалуйста, заполните все поля структуры');
                return;
            }
    
            if (!title.trim()) {
                alert('Пожалуйста, введите название урока');
                return;
            }
    
            const lessonId = `${chapter}.${topic}.${lessonNumber}`;
    
            try {
                await window.electronAPI.saveLesson(lessonId, title, content);
                alert('Урок успешно сохранен!');
                window.close();
            } catch (error) {
                console.error('Error saving lesson:', error);
                alert('Ошибка при сохранении урока: ' + error.message);
            }
        }
    }
    
    // Делаем класс доступным глобально
    window.MakeLessonManager = MakeLessonManager;
    ```
    
    ## Преимущества этого подхода:
    
    1. **Простая структура** - отдельные таблицы для глав и тем
    2. **Легкое редактирование** - можно менять названия независимо
    3. **Целостность данных** - внешние ключи обеспечивают согласованность
    4. **Гибкость** - можно легко добавлять новые поля (описания, порядок и т.д.)
    5. **Простота использования** - интуитивно понятный интерфейс
    
    Теперь вы можете создавать, редактировать и удалять главы и темы независимо от уроков!
}

// Делаем класс доступным глобально
window.MakeLessonManager = MakeLessonManager;