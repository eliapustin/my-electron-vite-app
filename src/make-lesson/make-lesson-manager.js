export class MakeLessonManager {
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

    // Загрузка главы
    async loadChapters() {
        try {
            this.chapters = await window.electronAPI.getAllChapters();
        } catch (error) {
            console.error('Error loading chapters:', error);
        }
    }

    //Загрузка структуры курса
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

    // Рендеринг селектора структуры
    renderStructureSelector() {
        const container = document.getElementById('structure-selector');
        if (!container) return;

        container.innerHTML = `

            <h4>Редактирование курса</h4>

            <div class="row">
                <div class="col-4">
                    <div class="mb-3">
                        <button class="btn btn-sm btn-outline-primary me-2" id="add-chapter-btn">+ Добавить главу</button>
                        <button class="btn btn-sm btn-outline-primary me-2" id="add-topic-btn">+ Добавить тему</button>
                        <button class="btn btn-sm btn-outline-primary me-2" id="add-lesson-btn">+ Добавить урок</button>                        
                        <button class="btn btn-sm btn-outline-warning edit-chapter" data-chapter="1">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-chapter" data-chapter="1">
                            <i class="bi bi-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning edit-topic" 
                                data-chapter="1" data-topic="1">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-topic" 
                                data-chapter="1" data-topic="1">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div>
                        ${this.coursesStructure.map(course => this.renderChapter(course)).join('')}
                        ${this.coursesStructure.length === 0 ? '<p class="text-muted">Нет созданных глав</p>' : ''}
                    </div>
                </div>
                <div class = "col-8">
                    <label for="new-chapter-name" class="form-label">Глава</label>
                    <input type="text" class="form-control" id="new-chapter-name" placeholder="Введите название главы">
                    <label for="new-topic-name" class="form-label">Тема</label>
                    <input type="text" class="form-control" id="new-topic-name" placeholder="Введите название темы">
                    <label for="new-lesson-name" class="form-label">Урок</label>
                    <input type="text" class="form-control" id="new-lesson-name" placeholder="Введите название урока">
                    <label for="lesson-content-input" class="form-label">Содержание урока</label>
                    <textarea class="form-control" id="lesson-content-input" rows="12" placeholder="Введите содержание урока"></textarea>
                </div>
            </div>
        `;

        this.setupStructureEventListeners();
        this.setupActionButtons();
    }

    // Рендеринг главы
    renderChapter(chapter) {
        return `
            <div class="chapter-item mb-3 p-3 border rounded">
                <div class="chapter-header d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong class="h5">${chapter.chapter}. ${chapter.chapterName}</strong>
                    </div>
                </div>
                <div class="topics-list">
                    ${chapter.topics.map(topic => this.renderTopic(chapter.chapter, topic)).join('')}
                    ${chapter.topics.length === 0 ? '<p class="text-muted small">Нет тем</p>' : ''}
                </div>
            </div>
        `;
    }

    // Рендеринг темы
    renderTopic(chapterNumber, topic) {
        return `
            <div class="topic-item mb-2 p-2 border rounded bg-light">
                <div class="topic-header d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${topic.topic}. ${topic.topicName}</strong>
                        <span class="badge bg-secondary ms-2">${topic.lessons.length} уроков</span>
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

    // Настройка кнопок активности
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

    // Показать модальное окно "Добавить главу" 
    async showAddChapterModal() {
        // const number = prompt('Введите номер главы:');
        const number = document.getElementById('new-chapter-number').value;
        if (!number) return;
        
        // const name = prompt('Введите название главы:');        
        const name = document.getElementById('new-chapter-name').value;
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

    // Редактирование главы
    async editChapter(chapterNumber) {
        const chapter = this.chapters.find(c => c.number == chapterNumber);
        if (!chapter) return;

        // const newName = prompt('Введите новое название главы:', chapter.name);        
        const newName = document.getElementById('new-chapter-name').value;
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

    // Удаление главы 
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

    // Показать модальное окно "Добавить тему"
    async showAddTopicModal() {
        if (this.chapters.length === 0) {
            alert('Сначала создайте хотя бы одну главу');
            return;
        }

        // const chapterNumber = prompt('Введите номер главы для новой темы:');
        const chapterNumber = document.getElementById('chapter-select').value;
        if (!chapterNumber) return;

        const chapter = this.chapters.find(c => c.number == chapterNumber);
        if (!chapter) {
            alert('Глава с таким номером не существует');
            return;
        }

        // const number = prompt('Введите номер темы:');
        const number = document.getElementById('new-topic-number').value;
        if (!number) return;

        // const name = prompt('Введите название темы:');
        const name = document.getElementById('new-topic-name').value;
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

    // Редактировать тему 
    async editTopic(chapterNumber, topicNumber) {
        try {
            const topics = await window.electronAPI.getTopicsByChapter(chapterNumber);
            const topic = topics.find(t => t.number == topicNumber);
            if (!topic) return;

            // const newName = prompt('Введите новое название темы:', topic.name);
            const newName = document.getElementById('new-topic-name').value;
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

    // Удалить тему
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

    // 
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

    // Редактировать выделенную главу
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

    // Сохранить урок
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