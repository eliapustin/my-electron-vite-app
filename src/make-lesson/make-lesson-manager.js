export class MakeLessonManager {
    constructor() {
        this.currentLessonId = null;
        this.currentTopicId = null;
        this.currentChapterId = null;
        this.coursesStructure = [];
        this.chapters = [];
        this.topics = [];
        this.typeOfSelectedElement = "";
        this.typeOfNewElement = "";
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
                    <label for="new-topic-name" class="form-label d-none"  id="new-topic-name-label">Тема</label>
                    <input type="text" class="form-control d-none mb-2" id="new-topic-number-input" placeholder="Введите номер темы">
                    <input type="text" class="form-control d-none mb-2" id="new-topic-name-input" placeholder="Введите название темы">
                    <label for="new-lesson-name" class="form-label d-none"  id="new-lesson-name-label">Урок</label>
                    <input type="text" class="form-control d-none mb-2" id="new-lesson-number-input" placeholder="Введите номер урока">
                    <input type="text" class="form-control d-none mb-2" id="new-lesson-name-input" placeholder="Введите название урока">
                    <label for="lesson-content-input" class="form-label d-none"  id="new-lesson-content-name-label">Содержание урока</label>
                    <textarea class="form-control d-none" id="lesson-content-input" rows="12" placeholder="Введите содержание урока"></textarea>
                </div>
            </div>
        `;

        this.setupStructureEventListeners();
        this.setupActionButtons();
    }

    // Рендеринг главы
    renderChapter(chapter) {
        // return `
        //     <div class="chapter-item">
        //         <div class="chapter-header d-flex justify-content-between align-items-center" chapterId="${chapter.chapter}">
        //             <div>
        //                 <a class="h5" role="button">${chapter.chapter}. ${chapter.chapterName}</a>
        //             </div>
        //         </div>
        //     </div>
        // `;

        return `<div class="accordion accordion-flush" id="accordion-chapter-${chapter.chapter}">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button 
                        id="accordion-button-chapter"
                        class="accordion-button collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#flush-collapseChapter-${chapter.chapter}" 
                        aria-expanded="false" 
                        aria-controls="flush-collapseChapter-${chapter.chapter}"
                        slyle="color: black;">
                        ${chapter.chapter}. ${chapter.chapterName}
                    </button>
                </h2>
                <div id="flush-collapseChapter-${chapter.chapter}" class="accordion-collapse collapse" data-bs-parent="#accordion-chapter-${chapter.chapter}">
                    <div class="accordion-body">
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
        return `
            <div class="topic-item bg-light">
                <div class="topic-header d-flex justify-content-between align-items-center" role="button" topicId="${topic.topic}">
                    <div>
                        <strong>${topic.topic}. ${topic.topicName}</strong>
                        <span class="badge bg-secondary ms-2">Количество уроков: ${topic.lessons.length}</span>
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
    // showAddChapterModal() {
    async showAddChapterModal() {

        // document.getElementById('new-chapter-name-label').classList.remove("d-none");
        document.getElementById('new-chapter-name-input').classList.remove("d-none");
        document.getElementById('new-chapter-number-input').classList.remove("d-none");
        
        document.getElementById('new-topic-name-input').classList.add("d-none");
        document.getElementById('new-topic-number-input').classList.add("d-none");
        
        document.getElementById('new-lesson-name-input').classList.add("d-none");
        document.getElementById('new-lesson-number-input').classList.add("d-none");

        document.getElementById('save-course-btn').classList.remove("d-none");

        this.typeOfNewElement = 'chapter';

        // const chapterName = document.getElementById('new-chapter-name-input').value;
        // const chapterNumber = document.getElementById('new-chapter-number-input').value;

        // // const number = prompt('Введите номер главы:');
        // const number = document.getElementById('new-chapter-number').value;
        // if (!number) return;
        
        // // const name = prompt('Введите название главы:');        
        // const name = document.getElementById('new-chapter-name').value;
        // if (!name) return;

        // try {
        //     await window.electronAPI.createChapter(parseInt(number), name, '');
        //     await this.loadChapters();
        //     await this.loadCoursesStructure();
        //     this.renderStructureSelector();
        //     alert('Глава успешно создана!');
        // } catch (error) {
        //     console.error('Error creating chapter:', error);
        //     alert('Ошибка при создании главы: ' + error.message);
        // }
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

        document.getElementById('new-topic-name-input').classList.remove("d-none");
        document.getElementById('new-topic-number-input').classList.remove("d-none");

        document.getElementById('new-chapter-name-input').classList.add("d-none");
        document.getElementById('new-chapter-number-input').classList.add("d-none");    
        
        document.getElementById('new-lesson-name-input').classList.add("d-none");
        document.getElementById('new-lesson-number-input').classList.add("d-none");

        document.getElementById('save-course-btn').classList.remove("d-none");

        this.typeOfNewElement = 'topic';

        // if (this.chapters.length === 0) {
        //     alert('Сначала создайте хотя бы одну главу');
        //     return;
        // }

        // // const chapterNumber = prompt('Введите номер главы для новой темы:');
        // const chapterNumber = document.getElementById('chapter-select').value;
        // if (!chapterNumber) return;

        // const chapter = this.chapters.find(c => c.number == chapterNumber);
        // if (!chapter) {
        //     alert('Глава с таким номером не существует');
        //     return;
        // }

        // // const number = prompt('Введите номер темы:');
        // const number = document.getElementById('new-topic-number').value;
        // if (!number) return;

        // // const name = prompt('Введите название темы:');
        // const name = document.getElementById('new-topic-name').value;
        // if (!name) return;

        // try {
        //     await window.electronAPI.createTopic(parseInt(chapterNumber), parseInt(number), name, '');
        //     await this.loadCoursesStructure();
        //     this.renderStructureSelector();
        //     alert('Тема успешно создана!');
        // } catch (error) {
        //     console.error('Error creating topic:', error);
        //     alert('Ошибка при создании темы: ' + error.message);
        // }
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

        const allAccordionButtons = document.querySelectorAll('.accordion-button');

        allAccordionButtons.forEach(accordionButton => {
            if (accordionButton.id === "accordion-button-chapter") {
                accordionButton.addEventListener('click', () => {
                    document.getElementById('add-topic-btn').classList.remove('d-none');
                })
            }
        });

        // const chapterSelect = document.getElementById('chapter-select');
        // const topicSelect = document.getElementById('topic-select');

        // chapterSelect.addEventListener('change', () => {
        //     if (chapterSelect.value === 'new') {
        //         document.getElementById('new-chapter-fields').style.display = 'block';
        //         topicSelect.disabled = true;
        //         topicSelect.innerHTML = '<option value="">Сначала создайте главу</option>';
        //     } else {
        //         document.getElementById('new-chapter-fields').style.display = 'none';
        //         this.updateTopicSelect(chapterSelect.value);
        //     }
        // });
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

                const topivNumber = document.getElementById('new-topic-number-input').value;
                const topicName = document.getElementById('new-topic-name-input').value;

                if (!chapterNumber) {
                    alert('Введите номер темы');
                    return;                   
                }

                if (!chapterName) {
                    alert('Введите название темы'); 
                    return;                                      
                }

                try {
                    await window.electronAPI.createTopic(parseInt(chapterNumber), parseInt(topivNumber), topicName, '');
                    await this.loadCoursesStructure();
                    this.renderStructureSelector();
                    alert('Тема успешно создана!');
                } catch (error) {
                    console.error('Error creating topic:', error);
                    alert('Ошибка при создании темы: ' + error.message);
                }

                break;
            default:
                break;
        }

    //     const lessonTitle = document.getElementById('lesson-title-input').value;
    //     const lessonContent = document.getElementById('lesson-content-input').value;
    //     const lessonNumber = document.getElementById('lesson-number').value;
        
    //     const chapterSelect = document.getElementById('chapter-select');
    //     const topicSelect = document.getElementById('topic-select');
        
    //     let chapter, topic;

    //     if (chapterSelect.value === 'new') {
    //         const newChapterNumber = document.getElementById('new-chapter-number').value;
    //         const newChapterName = document.getElementById('new-chapter-name').value;
            
    //         if (!newChapterNumber || !newChapterName) {
    //             alert('Пожалуйста, заполните поля для новой главы');
    //             return;
    //         }
            
    //         try {
    //             await window.electronAPI.createChapter(parseInt(newChapterNumber), newChapterName, '');
    //             chapter = newChapterNumber;
    //         } catch (error) {
    //             alert('Ошибка при создании главы: ' + error.message);
    //             return;
    //         }
    //     } else {
    //         chapter = chapterSelect.value;
    //     }

    //     if (!topicSelect.value) {
    //         alert('Пожалуйста, выберите тему');
    //         return;
    //     } else {
    //         topic = topicSelect.value;
    //     }

    //     if (!chapter || !topic || !lessonNumber) {
    //         alert('Пожалуйста, заполните все поля структуры');
    //         return;
    //     }

    //     if (!title.trim()) {
    //         alert('Пожалуйста, введите название урока');
    //         return;
    //     }

    //     const lessonId = `${chapter}.${topic}.${lessonNumber}`;

    //     try {
    //         await window.electronAPI.saveLesson(lessonId, title, content);
    //         alert('Урок успешно сохранен!');
    //         window.close();
    //     } catch (error) {
    //         console.error('Error saving lesson:', error);
    //         alert('Ошибка при сохранении урока: ' + error.message);
    //     }
    }
}

// Делаем класс доступным глобально
window.MakeLessonManager = MakeLessonManager;