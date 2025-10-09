export class EducationEditor {
    constructor() {
        this.currentLessonId = null;
        this.annotations = [];
        this.courses = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCourses();
        console.log('init education editor')
    }

    setupEventListeners() {
        // Кнопка добавления нового курса
        document.getElementById('add-lesson-btn').addEventListener('click', async () => {
            await window.electronAPI.openMakeLessonWindow();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            this.importData();
        });

        // document.addEventListener('selectionchange', this.handleTextSelection.bind(this));
    }

    setupLessonEventListeners() {
        // Добавляем обработчики для кнопок уроков после рендеринга
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-lesson')) {
                const lessonId = e.target.closest('.view-lesson').dataset.id;
                this.viewLesson(lessonId);
            } else if (e.target.closest('.edit-lesson')) {
                const lessonId = e.target.closest('.edit-lesson').dataset.id;
                this.editLesson(lessonId);
            } else if (e.target.closest('.delete-lesson')) {
                const lessonId = e.target.closest('.delete-lesson').dataset.id;
                this.deleteLesson(lessonId);
            }
        });
    }

    async loadCourses() {
        try {
            const lessons = await window.electronAPI.getAllLessons();
            this.organizeLessonsByStructure(lessons);
            this.renderCoursesList();
            this.setupLessonEventListeners();
        } catch (error) {
            console.error('Error loading lessons:', error);
        }
    }

    organizeLessonsByStructure(lessons) {
        this.courses = [];
        
        lessons.forEach(lesson => {
            // Проверяем, что ID соответствует формату A.B.C (Глава.Тема.Урок)
            const idParts = lesson.id.split('.');
            if (idParts.length !== 3) {
                console.warn(`Invalid lesson ID format: ${lesson.id}`);
                return;
            }
            
            const [chapter, topic, lessonNum] = idParts.map(Number);
            
            // Находим или создаем курс
            let course = this.courses.find(c => c.name === `Курс ${chapter}`);
            if (!course) {
                course = { name: `Курс ${chapter}`, chapters: [] };
                this.courses.push(course);
            }
            
            // Находим или создаем главу
            let chapterObj = course.chapters.find(ch => ch.number === chapter);
            if (!chapterObj) {
                chapterObj = { number: chapter, name: `Глава ${chapter}`, topics: [] };
                course.chapters.push(chapterObj);
            }
            
            // Находим или создаем тему
            let topicObj = chapterObj.topics.find(t => t.number === topic);
            if (!topicObj) {
                topicObj = { 
                    number: topic, 
                    name: `Тема ${topic}`, 
                    lessons: []
                };
                chapterObj.topics.push(topicObj);
            }          

            
            // Добавляем урок
            topicObj.lessons.push({
                id: lesson.id,
                number: lessonNum,
                title: lesson.title,
                content: lesson.content
            });
        });
        
        // Сортируем структуру
        this.courses.forEach(course => {
            course.chapters.sort((a, b) => a.number - b.number);
            course.chapters.forEach(chapter => {
                chapter.topics.sort((a, b) => a.number - b.number);
                chapter.topics.forEach(topic => {
                    topic.lessons.sort((a, b) => a.number - b.number);
                });
            });
        });
    }

    renderCoursesList() {
        const lessonsContainer = document.getElementById('lessons-list');
        lessonsContainer.innerHTML = '';

        // if (this.courses.length === 0) {
        //     lessonsContainer.innerHTML = '<p class="text-muted">Нет созданных уроков</p>';
        //     return;
        // }

        this.courses.forEach(course => {
            const courseElement = this.createCourseElement(course);
            lessonsContainer.appendChild(courseElement);
        });
    }

    createCourseElement(course) {
        const courseDiv = document.createElement('div');
        courseDiv.className = 'course-item mb-3';
        
        courseDiv.innerHTML = `
            <div class="course-header">
                <h5 class="course-title mb-0">${course.name}</h5>
            </div>
            <div class="course-content">
                ${course.chapters.map(chapter => this.createChapterElement(chapter)).join('')}
            </div>
        `;

        return courseDiv;
    }

    createChapterElement(chapter) {
        return `
            <div class="accordion" id="chapter-${chapter.number}">
                <div class="accordion-item chapter">
                    <h2 class="accordion-header chapter">
                        <button class="accordion-button collapsed chapter" type="button" 
                                data-bs-toggle="collapse" 
                                data-bs-target="#collapseChapter${chapter.number}"
                                aria-expanded="false" 
                                aria-controls="collapseChapter${chapter.number}">
                            ${chapter.name}
                        </button>
                    </h2>
                    <div id="collapseChapter${chapter.number}" 
                         class="accordion-collapse collapse" 
                         data-bs-parent="#chapter-${chapter.number}">

                            ${chapter.topics.map(topic => this.createTopicElement(topic, chapter.number)).join('')}

                    </div>
                </div>
            </div>
        `;
    }

    createTopicElement(topic, chapterNumber) {
        return `
            <div class="accordion" id="topic-${chapterNumber}-${topic.number}">
                <div class="accordion-item topic">
                    <h2 class="accordion-header topic">
                        <button class="accordion-button collapsed topic" type="button" 
                                data-bs-toggle="collapse" 
                                data-bs-target="#collapseTopic${chapterNumber}-${topic.number}"
                                aria-expanded="false" 
                                aria-controls="collapseTopic${chapterNumber}-${topic.number}">
                            ${topic.name}
                        </button>
                    </h2>
                    <div id="collapseTopic${chapterNumber}-${topic.number}" 
                         class="accordion-collapse collapse" 
                         data-bs-parent="#topic-${chapterNumber}-${topic.number}">

                            ${topic.lessons.map(lesson => this.createLessonElement(lesson)).join('')}

                    </div>
                </div>
            </div>
        `;
    }

    createLessonElement(lesson) {
        return `
            <div class="lesson-item d-flex justify-content-between align-items-center" id="lesson-${lesson.id}">
                <div class="lesson-info flex-grow-1 view-lesson" data-id="${lesson.id}">
                    
                    <span class="lesson-title" >${lesson.title}</span>
                </div>
                <div class="lesson-actions ms-2">
                    <button class="btn btn-sm btn-outline-secondary edit-lesson" data-id="${lesson.id}" title="Редактировать">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-lesson" data-id="${lesson.id}" title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
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

    async editLesson(lessonId) {
        try {
            const lesson = await window.electronAPI.getLesson(lessonId);
            this.currentLessonId = lessonId;
            this.showLessonModal(lesson);
        } catch (error) {
            console.error('Error edit lesson:', error);
        }
    }

    async deleteLesson(lessonId) {
        if (confirm('Вы уверены, что хотите удалить этот урок?')) {
            try {
                await window.electronAPI.deleteLesson(lessonId);
                this.loadCourses();
            } catch (error) {
                console.error('Error delete lesson:', error);
            }
        }
    }

    showCourseModal() {
        const modal = document.getElementById('editor-modal');
        const titleInput = document.getElementById('lesson-title-input');
        const contentTextarea = document.getElementById('lesson-content-input');
        
        titleInput.value = '';
        contentTextarea.value = '';
        this.currentLessonId = null;
        
        // Добавляем поля для структуры
        const existingStructureFields = modal.querySelector('.structure-fields');
        if (existingStructureFields) {
            existingStructureFields.remove();
        }
        
        const structureFields = document.createElement('div');
        structureFields.className = 'structure-fields mb-3';
        structureFields.innerHTML = `
            <div class="row g-2">
                <div class="col-3">
                    <label class="form-label small">Глава:</label>
                    <input type="number" id="chapter-number" class="form-control form-control-sm" min="1" value="1">
                </div>
                <div class="col-3">
                    <label class="form-label small">Тема:</label>
                    <input type="number" id="topic-number" class="form-control form-control-sm" min="1" value="1">
                </div>
                <div class="col-3">
                    <label class="form-label small">Урок:</label>
                    <input type="number" id="lesson-number" class="form-control form-control-sm" min="1" value="1">
                </div>
            </div>
        `;
        
        const titleLabel = modal.querySelector('h3');
        titleLabel.parentNode.insertBefore(structureFields, titleLabel.nextSibling);
        modal.style.display = 'block';
    }

    showLessonModal(lesson = null) {
        const modal = document.getElementById('editor-modal');
        const titleInput = document.getElementById('lesson-title-input');
        const contentTextarea = document.getElementById('lesson-content-input');

        if (lesson) {
            titleInput.value = lesson.title;
            contentTextarea.value = lesson.content;
            this.currentLessonId = lesson.id;
            
            // Разбираем ID для заполнения полей структуры
            const [chapter, topic, lessonNum] = lesson.id.split('.').map(Number);
            
            const existingStructureFields = modal.querySelector('.structure-fields');
            if (existingStructureFields) {
                existingStructureFields.remove();
            }
            
            const structureFields = document.createElement('div');
            structureFields.className = 'structure-fields mb-3';
            structureFields.innerHTML = `
                <div class="row g-2">
                    <div class="col-3">
                        <label class="form-label small">Глава:</label>
                        <input type="number" id="chapter-number" class="form-control form-control-sm" min="1" value="${chapter}" readonly>
                    </div>
                    <div class="col-3">
                        <label class="form-label small">Тема:</label>
                        <input type="number" id="topic-number" class="form-control form-control-sm" min="1" value="${topic}" readonly>
                    </div>
                    <div class="col-3">
                        <label class="form-label small">Урок:</label>
                        <input type="number" id="lesson-number" class="form-control form-control-sm" min="1" value="${lessonNum}" readonly>
                    </div>
                </div>
            `;
            
            const titleLabel = modal.querySelector('h3');
            titleLabel.parentNode.insertBefore(structureFields, titleLabel.nextSibling);
        }

        modal.style.display = 'block';
    }

    hideEditorModal() {
        const modal = document.getElementById('editor-modal');
        modal.style.display = 'none';
    }

    async saveCourse() {
        const title = document.getElementById('lesson-title-input').value;
        const content = document.getElementById('lesson-content-input').value;
        
        const chapter = document.getElementById('chapter-number').value;
        const topic = document.getElementById('topic-number').value;
        const lessonNum = document.getElementById('lesson-number').value;
        
        const lessonId = `${chapter}.${topic}.${lessonNum}`;

        if (!title.trim()) {
            alert('Пожалуйста, введите название урока');
            return;
        }

        try {
            if (this.currentLessonId) {
                await window.electronAPI.updateLesson(this.currentLessonId, title, content);
            } else {
                await window.electronAPI.saveLesson(lessonId, title, content);
            }
            
            this.hideEditorModal();
            this.loadCourses();
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Ошибка при сохранении урока: ' + error.message);
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
                this.loadCourses();
                alert('Данные успешно импортированы!');
            }
        } catch (error) {
            console.error('Error importing data:', error);
        }
    }
}