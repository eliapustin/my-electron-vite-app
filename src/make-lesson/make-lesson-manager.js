export class MakeLessonManager {
    constructor() {
        this.currentLessonId = null;
        this.coursesStructure = [];
        this.init();
    }

    async init() {
        await this.loadCoursesStructure();
        this.setupEventListeners();
        this.renderStructureSelector();
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
            window.close(); // Закрываем окно
        });

        // Обработчики для редактирования названий глав и тем
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-chapter-name')) {
                this.editChapterName(e.target.dataset.chapter);
            } else if (e.target.classList.contains('edit-topic-name')) {
                this.editTopicName(e.target.dataset.chapter, e.target.dataset.topic);
            }
        });
    }

    renderStructureSelector() {
        const container = document.getElementById('structure-selector');
        if (!container) return;

        container.innerHTML = `
            <div class="structure-section mb-4">
                <h4>Структура курса</h4>
                <div class="structure-tree">
                    ${this.coursesStructure.map(course => this.renderChapter(course)).join('')}
                </div>
            </div>
            <div class="lesson-placement mb-4">
                <h5>Размещение урока</h5>
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">Глава</label>
                        <select class="form-select" id="chapter-select">
                            <option value="">Выберите главу</option>
                            ${this.coursesStructure.map(chapter => 
                                `<option value="${chapter.chapter}">${chapter.chapter}. ${chapter.chapterName}</option>`
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
                        <select class="form-select" id="lesson-select" disabled>
                            <option value="">Сначала выберите тему</option>
                        </select>
                        <div class="mt-2">
                            <input type="number" class="form-control" id="new-lesson-number" placeholder="Номер урока" style="display: none;">
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupStructureEventListeners();
    }

    renderChapter(chapter) {
        return `
            <div class="chapter-item mb-2">
                <div class="chapter-header d-flex align-items-center">
                    <strong>${chapter.chapter}. ${chapter.chapterName}</strong>
                    <button class="btn btn-sm btn-outline-secondary ms-2 edit-chapter-name" 
                            data-chapter="${chapter.chapter}" title="Редактировать название">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="topics-list ms-3">
                    ${chapter.topics.map(topic => this.renderTopic(chapter.chapter, topic)).join('')}
                </div>
            </div>
        `;
    }

    renderTopic(chapterNumber, topic) {
        return `
            <div class="topic-item mb-1">
                <div class="topic-header d-flex align-items-center">
                    <span>${topic.topic}. ${topic.topicName}</span>
                    <button class="btn btn-sm btn-outline-secondary ms-2 edit-topic-name" 
                            data-chapter="${chapterNumber}" data-topic="${topic.topic}" 
                            title="Редактировать название">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                <div class="lessons-list ms-3">
                    ${topic.lessons.map(lesson => 
                        `<div class="lesson-item small">${lesson.number}. ${lesson.title}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    setupStructureEventListeners() {
        const chapterSelect = document.getElementById('chapter-select');
        const topicSelect = document.getElementById('topic-select');
        const lessonSelect = document.getElementById('lesson-select');
        const newChapterFields = document.getElementById('new-chapter-fields');
        const newTopicFields = document.getElementById('new-topic-fields');
        const newLessonNumber = document.getElementById('new-lesson-number');

        chapterSelect.addEventListener('change', () => {
            if (chapterSelect.value === 'new') {
                newChapterFields.style.display = 'block';
                topicSelect.disabled = true;
                topicSelect.innerHTML = '<option value="">Сначала создайте главу</option>';
            } else {
                newChapterFields.style.display = 'none';
                this.updateTopicSelect(chapterSelect.value);
            }
        });

        topicSelect.addEventListener('change', () => {
            if (topicSelect.value === 'new') {
                newTopicFields.style.display = 'block';
                this.updateLessonSelect(chapterSelect.value, null);
            } else {
                newTopicFields.style.display = 'none';
                this.updateLessonSelect(chapterSelect.value, topicSelect.value);
            }
        });
    }

    updateTopicSelect(chapterNumber) {
        const topicSelect = document.getElementById('topic-select');
        const chapter = this.coursesStructure.find(c => c.chapter == chapterNumber);
        
        if (chapter) {
            topicSelect.innerHTML = `
                <option value="">Выберите тему</option>
                ${chapter.topics.map(topic => 
                    `<option value="${topic.topic}">${topic.topic}. ${topic.topicName}</option>`
                ).join('')}
                <option value="new">+ Новая тема</option>
            `;
            topicSelect.disabled = false;
        }
    }

    updateLessonSelect(chapterNumber, topicNumber) {
        const lessonSelect = document.getElementById('lesson-select');
        const newLessonNumber = document.getElementById('new-lesson-number');
        
        if (topicNumber && topicNumber !== 'new') {
            const chapter = this.coursesStructure.find(c => c.chapter == chapterNumber);
            const topic = chapter.topics.find(t => t.topic == topicNumber);
            
            lessonSelect.innerHTML = `
                <option value="">Выберите урок</option>
                ${topic.lessons.map(lesson => 
                    `<option value="${lesson.number}">${lesson.number}. ${lesson.title}</option>`
                ).join('')}
                <option value="new">+ Новый урок</option>
            `;
            lessonSelect.disabled = false;
            newLessonNumber.style.display = 'none';
        } else {
            lessonSelect.innerHTML = '<option value="">Сначала выберите тему</option>';
            lessonSelect.disabled = true;
            newLessonNumber.style.display = 'block';
        }

        lessonSelect.addEventListener('change', () => {
            if (lessonSelect.value === 'new') {
                newLessonNumber.style.display = 'block';
            } else {
                newLessonNumber.style.display = 'none';
            }
        });
    }

    async editChapterName(chapterNumber) {
        const chapter = this.coursesStructure.find(c => c.chapter == chapterNumber);
        const newName = prompt('Введите новое название главы:', chapter.chapterName);
        
        if (newName && newName !== chapter.chapterName) {
            try {
                await window.electronAPI.updateChapterName(chapterNumber, newName);
                chapter.chapterName = newName;
                this.renderStructureSelector();
            } catch (error) {
                console.error('Error updating chapter name:', error);
                alert('Ошибка при обновлении названия главы');
            }
        }
    }

    async editTopicName(chapterNumber, topicNumber) {
        const chapter = this.coursesStructure.find(c => c.chapter == chapterNumber);
        const topic = chapter.topics.find(t => t.topic == topicNumber);
        const newName = prompt('Введите новое название темы:', topic.topicName);
        
        if (newName && newName !== topic.topicName) {
            try {
                await window.electronAPI.updateTopicName(chapterNumber, topicNumber, newName);
                topic.topicName = newName;
                this.renderStructureSelector();
            } catch (error) {
                console.error('Error updating topic name:', error);
                alert('Ошибка при обновлении названия темы');
            }
        }
    }

    async saveLesson() {
        const title = document.getElementById('lesson-title-input').value;
        const content = document.getElementById('lesson-content-input').value;
        
        const chapterSelect = document.getElementById('chapter-select');
        const topicSelect = document.getElementById('topic-select');
        const lessonSelect = document.getElementById('lesson-select');
        
        let chapter, topic, lessonNum;

        if (chapterSelect.value === 'new') {
            chapter = document.getElementById('new-chapter-number').value;
            const chapterName = document.getElementById('new-chapter-name').value;
            // Здесь нужно добавить логику создания новой главы
        } else {
            chapter = chapterSelect.value;
        }

        if (topicSelect.value === 'new') {
            topic = document.getElementById('new-topic-number').value;
            const topicName = document.getElementById('new-topic-name').value;
            // Здесь нужно добавить логику создания новой темы
        } else {
            topic = topicSelect.value;
        }

        if (lessonSelect.value === 'new') {
            lessonNum = document.getElementById('new-lesson-number').value;
        } else {
            lessonNum = lessonSelect.value;
        }

        if (!chapter || !topic || !lessonNum) {
            alert('Пожалуйста, заполните все поля структуры');
            return;
        }

        if (!title.trim()) {
            alert('Пожалуйста, введите название урока');
            return;
        }

        const lessonId = `${chapter}.${topic}.${lessonNum}`;

        try {
            await window.electronAPI.saveLesson(lessonId, title, content);
            alert('Урок успешно сохранен!');
            window.close(); // Закрываем окно после сохранения
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Ошибка при сохранении урока: ' + error.message);
        }
    }
}