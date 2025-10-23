import { CourseManager } from "../course-manager/course-manager";

export class MakeLessonManager extends CourseManager {
    constructor() {
        super();
        this.init();
    }

    async init() {
        await this.loadChapters();
        await this.loadCoursesStructure();
        this.setupEventListeners();
        this.renderStructureSelector();
    }

    setupEventListeners() {        
        super.setupStructureEventListeners();

        document.getElementById('save-course-btn').addEventListener('click', () => {
            this.saveCourse();
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

            <h4 style="color: black;">Редактирование курса</h4>

            <div class="row">
                <div class="col-6">
                    <div class="mb-3">
                        <button class="btn btn-sm btn-outline-primary me-2" id="add-chapter-btn">+ Добавить главу</button>
                        <button class="btn btn-sm btn-outline-primary me-2 d-none" id="add-topic-btn"">+ Добавить тему</button>
                        <button class="btn btn-sm btn-outline-primary me-2 d-none" id="add-lesson-btn"">+ Добавить урок</button>                        
                        <button class="btn btn-sm btn-outline-warning edit-selected" element-number="1" style="display: none;">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-selected" element-number="1" style="display: none;">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div>
                        ${this.coursesStructure.map(course => this.renderChapter(course)).join('')}
                        ${this.coursesStructure.length === 0 ? '<p class="text-muted">Нет созданных глав</p>' : ''}
                    </div>
                </div>
                <div class = "col-6">
                    <label for="new-chapter-name" class="form-label d-none mb-2" id="new-chapter-name-label">Глава</label>
                    <input type="text" class="form-control d-none mb-2" id="new-chapter-number-input" placeholder="Введите номер главы">
                    <input type="text" class="form-control d-none mb-2" id="new-chapter-name-input" placeholder="Введите название главы">
                    <input type="text" class="form-control d-none mb-2" id="new-topic-number-input" placeholder="Введите номер темы">
                    <input type="text" class="form-control d-none mb-2" id="new-topic-name-input" placeholder="Введите название темы">
                    <input type="text" class="form-control d-none mb-2" id="new-lesson-number-input" placeholder="Введите номер урока">
                    <input type="text" class="form-control d-none mb-2" id="new-lesson-name-input" placeholder="Введите название урока">
                    <textarea class="form-control d-none" id="lesson-content-input" rows="12" placeholder="Введите содержание урока"></textarea>
                    ${this.renderInputFields()}
                </div>
            </div>
        `;

        this.setupActionButtons();
    }

    renderInputFields() {
        return `
            <input type="text" class="form-control d-none mb-2" id="new-chapter-number-input" placeholder="Введите номер главы">
            <input type="text" class="form-control d-none mb-2" id="new-chapter-name-input" placeholder="Введите название главы">
            <input type="text" class="form-control d-none mb-2" id="new-topic-number-input" placeholder="Введите номер темы">
            <input type="text" class="form-control d-none mb-2" id="new-topic-name-input" placeholder="Введите название темы">
            <input type="text" class="form-control d-none mb-2" id="new-lesson-number-input" placeholder="Введите номер урока">
            <input type="text" class="form-control d-none mb-2" id="new-lesson-name-input" placeholder="Введите название урока">
            <textarea class="form-control d-none" id="lesson-content-input" rows="12" placeholder="Введите содержание урока"></textarea>
        `;
    }

    onChapterSelect(chapterId) {
        document.getElementById('add-topic-btn').classList.remove('d-none');
        document.getElementById('add-lesson-btn').classList.add('d-none');
    }

    onTopicSelect(chapterId, topicId) {
        document.getElementById('add-lesson-btn').classList.remove('d-none');
        document.getElementById('add-topic-btn').classList.add('d-none');
    }

    // Остальные специфичные для MakeLessonManager методы остаются без изменений
    setupActionButtons() {
        document.getElementById('add-chapter-btn').addEventListener('click', () => {
            this.showAddChapterModal();
        });

        document.getElementById('add-topic-btn').addEventListener('click', () => {
            this.showAddTopicModal();
        });

        document.getElementById('add-lesson-btn').addEventListener('click', () => {
            this.showAddLessonModal();
        });
    }

    // Рендеринг главы
    renderChapter(chapter) {

        return `<div class="accordion accordion-flush" id="accordion-chapter-${chapter.chapter}">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button 
                        id="accordion-button-chapter"
                        class="accordion-button chapter collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#flush-collapseChapter-${chapter.chapter}" 
                        aria-expanded="false" 
                        aria-controls="flush-collapseChapter-${chapter.chapter}"
                        chapter-num="${chapter.chapter}"
                        slyle="color: black;">
                        ${chapter.chapter}. ${chapter.chapterName}
                    </button>
                </h2>
                <div id="flush-collapseChapter-${chapter.chapter}" class="accordion-collapse collapse" data-bs-parent="#accordion-chapter-${chapter.chapter}">
                    <div class="accordion-body chapter-body">
                        <div class="topics-list">
                            ${chapter.topics.map(topic => this.renderTopic(chapter.chapter, topic)).join('')}
                            ${chapter.topics.length === 0 ? '<p class="text-muted small">Нет тем</p>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // Рендеринг темы
    renderTopic(chapterNumber, topic) {
        return `<div class="accordion accordion-flush" id="accordion-topic-${topic.topic}">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button 
                        id="accordion-button-topic"
                        class="accordion-button topic collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#flush-collapseTopic-${topic.topic}" 
                        aria-expanded="false" 
                        aria-controls="flush-collapseTopic-${topic.topic}"
                        chapter-num="${chapterNumber}"
                        topic-num="${topic.topic}"
                        slyle="color: black;">
                        ${chapterNumber}.${topic.topic} ${topic.topicName}
                    </button>
                </h2>
                <div id="flush-collapseTopic-${topic.topic}" class="accordion-collapse collapse" data-bs-parent="#accordion-topic-${topic.topic}">
                    <div class="accordion-body topic-body">
                        <div class="lessons-list mt-2">  
                            <div class="container">                   
                                ${topic.lessons.map(lesson => 
                                    `<div class="row">
                                        <button type="button" class="btn btn-light">
                                            <div class="lesson-item">${chapterNumber}.${topic.topic}.${lesson.number} ${lesson.title}</div>
                                        </button>
                                    <div>`
                                ).join('')} 
                            </div>                                  
                        </div>
                    </div>
                </div>
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

        document.getElementById('add-lesson-btn').addEventListener('click', () => {
            this.showAddLessonModal();
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
        document.getElementById('new-chapter-name-input').classList.remove("d-none");
        document.getElementById('new-chapter-number-input').classList.remove("d-none");
        
        document.getElementById('new-topic-name-input').classList.add("d-none");
        document.getElementById('new-topic-number-input').classList.add("d-none");
        
        document.getElementById('new-lesson-name-input').classList.add("d-none");
        document.getElementById('new-lesson-number-input').classList.add("d-none");
        document.getElementById('lesson-content-input').classList.add("d-none");

        document.getElementById('save-course-btn').classList.remove("d-none");

        this.typeOfNewElement = 'chapter';        
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
        document.getElementById('new-chapter-name-input').classList.add("d-none");
        document.getElementById('new-chapter-number-input').classList.add("d-none");

        document.getElementById('new-topic-name-input').classList.remove("d-none");
        document.getElementById('new-topic-number-input').classList.remove("d-none");        
        
        document.getElementById('new-lesson-name-input').classList.add("d-none");
        document.getElementById('new-lesson-number-input').classList.add("d-none");
        document.getElementById('lesson-content-input').classList.add("d-none");

        document.getElementById('save-course-btn').classList.remove("d-none");

        this.typeOfNewElement = 'topic';
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

    // Показать модальное окно "Добавить урок"
    async showAddLessonModal() {
        document.getElementById('new-chapter-name-input').classList.add("d-none");
        document.getElementById('new-chapter-number-input').classList.add("d-none");
        
        document.getElementById('new-topic-name-input').classList.add("d-none");
        document.getElementById('new-topic-number-input').classList.add("d-none");  
        
        document.getElementById('new-lesson-name-input').classList.remove("d-none");
        document.getElementById('new-lesson-number-input').classList.remove("d-none");
        document.getElementById('lesson-content-input').classList.remove("d-none");
        
        document.getElementById('save-course-btn').classList.remove("d-none");

        this.typeOfNewElement = 'lesson';
    }

    // 
    setupStructureEventListeners() {

        const allAccordionButtons = document.querySelectorAll('.accordion-button');

        allAccordionButtons.forEach(accordionButton => {
            if (accordionButton.id === "accordion-button-chapter") {                
                accordionButton.addEventListener('click', () => {
                    this.currentChapterId = accordionButton.getAttribute('chapter-num');
                    document.getElementById('add-topic-btn').classList.remove('d-none');
                    document.getElementById('add-lesson-btn').classList.add('d-none');
                })
            }

            if (accordionButton.id === "accordion-button-topic") {                
                accordionButton.addEventListener('click', () => {
                    this.currentChapterId = accordionButton.getAttribute('chapter-num');
                    this.currentTopicId = accordionButton.getAttribute('topic-num');
                    document.getElementById('add-lesson-btn').classList.remove('d-none');
                    document.getElementById('add-topic-btn').classList.add('d-none');
                })
            }            

            if (accordionButton.id === "accordion-button-lesson") {                
                accordionButton.addEventListener('click', () => {
                    document.getElementById('add-topic-btn').classList.add('d-none');
                })
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
    async saveCourse() {

        switch (this.typeOfNewElement) {
            case 'chapter':

                const chapterNumber = document.getElementById('new-chapter-number-input').value;
                const chapterName = document.getElementById('new-chapter-name-input').value;

                if (!chapterNumber) {
                    alert('Введите номер главы');
                    return;                   
                }

                if (!chapterName) {
                    alert('Введите название главы'); 
                    return;                                      
                }

                try {
                    await window.electronAPI.createChapter(parseInt(chapterNumber), chapterName, '');
                    await this.loadChapters();
                    await this.loadCoursesStructure();
                    this.renderStructureSelector();
                    alert('Глава успешно создана!');
                } catch (error) {
                    console.error('Error creating chapter:', error);
                    alert('Ошибка при создании главы: ' + error.message);
                }
                break;
            case 'topic':

                const topicNumber = document.getElementById('new-topic-number-input').value;
                const topicName = document.getElementById('new-topic-name-input').value;
                const selectedChapterNumber = this.currentChapterId;

                if (!topicNumber) {
                    alert('Введите номер темы');
                    return;                   
                }

                if (!topicName) {
                    alert('Введите название темы'); 
                    return;                                      
                }

                if (!selectedChapterNumber) {
                    alert('Выберите главу'); 
                    return;                                      
                }

                try {
                    await window.electronAPI.createTopic(parseInt(selectedChapterNumber), parseInt(topicNumber), topicName, '');
                    await this.loadCoursesStructure();
                    this.renderStructureSelector();
                    alert('Тема успешно создана!');
                } catch (error) {
                    console.error('Error creating topic:', error);
                    alert('Ошибка при создании темы: ' + error.message);
                }

                break;
            case 'lesson':
                const lessonTitle = document.getElementById('new-lesson-name-input').value;
                const lessonNumber = document.getElementById('new-lesson-number-input').value;
                const lessonContent = document.getElementById('lesson-content-input').value;
                
                const chapterSelect = this.currentChapterId;
                const topicSelect = this.currentTopicId;

                if (!lessonNumber) {
                    alert('Пожалуйста, введите номер урока');
                    return;                   
                }

                if (!lessonTitle) {
                    alert('Пожалуйста, введите название урока'); 
                    return;                                      
                }

                const lessonId = `${chapterSelect}.${topicSelect}.${lessonNumber}`;

                try {
                    await window.electronAPI.saveLesson(lessonId, lessonTitle, lessonContent);
                    alert('Урок успешно сохранен!');
                } catch (error) {
                    console.error('Error saving lesson:', error);
                    alert('Ошибка при сохранении урока: ' + error.message);
                }

                break;
            default:
                break;
        }
    }
}

// Делаем класс доступным глобально
window.MakeLessonManager = MakeLessonManager;