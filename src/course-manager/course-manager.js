// course-manager.js
export class CourseManager {
    constructor() {
        this.currentLessonId = null;
        this.currentTopicId = null;
        this.currentChapterId = null;
        this.coursesStructure = [];
        this.chapters = [];
        this.topics = [];
        this.annotations = [];
        this.typeOfSelectedElement = "";
        this.typeOfNewElement = "";
    }

    // Общие методы для работы с данными
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

    organizeLessonsByStructure(lessons) {
        this.courses = [];
        
        lessons.forEach(lesson => {
            const idParts = lesson.id.split('.');
            if (idParts.length !== 3) {
                console.warn(`Invalid lesson ID format: ${lesson.id}`);
                return;
            }
            
            const [chapter, topic, lessonNum] = idParts.map(Number);
            
            let course = this.courses.find(c => c.name === `Курс ${chapter}`);
            if (!course) {
                course = { name: `Курс ${chapter}`, chapters: [] };
                this.courses.push(course);
            }
            
            let chapterObj = course.chapters.find(ch => ch.number === chapter);
            if (!chapterObj) {
                chapterObj = { number: chapter, name: `Глава ${chapter}`, topics: [] };
                course.chapters.push(chapterObj);
            }
            
            let topicObj = chapterObj.topics.find(t => t.number === topic);
            if (!topicObj) {
                topicObj = { 
                    number: topic, 
                    name: `Тема ${topic}`, 
                    lessons: []
                };
                chapterObj.topics.push(topicObj);
            }

            topicObj.lessons.push({
                id: lesson.id,
                number: lessonNum,
                title: lesson.title,
                content: lesson.content
            });
        });
        
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

    // Общие методы рендеринга
    renderChapter(chapter) {
        return `<div class="accordion accordion-flush" id="accordion-chapter-${chapter.chapter}">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button 
                        class="accordion-button chapter collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#flush-collapseChapter-${chapter.chapter}" 
                        chapter-num="${chapter.chapter}">
                        ${chapter.chapter}. ${chapter.chapterName}
                    </button>
                </h2>
                <div id="flush-collapseChapter-${chapter.chapter}" class="accordion-collapse collapse">
                    <div class="accordion-body chapter-body">
                        ${chapter.topics.map(topic => this.renderTopic(chapter.chapter, topic)).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    }

    renderTopic(chapterNumber, topic) {
        return `<div class="accordion accordion-flush" id="accordion-topic-${topic.topic}">
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button 
                        class="accordion-button topic collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#flush-collapseTopic-${topic.topic}"
                        chapter-num="${chapterNumber}"
                        topic-num="${topic.topic}">
                        ${chapterNumber}.${topic.topic} ${topic.topicName}
                    </button>
                </h2>
                <div id="flush-collapseTopic-${topic.topic}" class="accordion-collapse collapse">
                    <div class="accordion-body topic-body">
                        ${topic.lessons.map(lesson => this.renderLesson(chapterNumber, topic.topic, lesson)).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    }

    renderLesson(chapterNumber, topicNumber, lesson) {
        return `<div class="lesson-item">
            ${chapterNumber}.${topicNumber}.${lesson.number} ${lesson.title}
        </div>`;
    }

    // Общие обработчики событий
    setupStructureEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.accordion-button.chapter')) {
                this.currentChapterId = e.target.closest('.accordion-button.chapter').getAttribute('chapter-num');
                this.onChapterSelect(this.currentChapterId);
            } else if (e.target.closest('.accordion-button.topic')) {
                const button = e.target.closest('.accordion-button.topic');
                this.currentChapterId = button.getAttribute('chapter-num');
                this.currentTopicId = button.getAttribute('topic-num');
                this.onTopicSelect(this.currentChapterId, this.currentTopicId);
            }
        });
    }

    // Методы для переопределения в дочерних классах
    onChapterSelect(chapterId) {}
    onTopicSelect(chapterId, topicId) {}
}