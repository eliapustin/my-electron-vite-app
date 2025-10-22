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