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