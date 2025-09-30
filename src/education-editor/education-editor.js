export class EducationEditor {
    constructor() {
        this.currentLessonId = null;
        this.annotations = [];
        this.init();
    }

    init() {
        console.log('init education editor')
        this.setupEventListeners();
        this.loadLessons();
    }

    setupEventListeners() {
        // Кнопка добавления нового урока
        document.getElementById('add-lesson-btn').addEventListener('click', () => {
            this.showEditorModal();
        });

        // Кнопка сохранения нового урока
        document.getElementById('save-lesson-btn').addEventListener('click', () => {
            this.saveLesson();
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