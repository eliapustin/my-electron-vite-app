export const sidebarLeftContent = {
    simulation : `
        <div class="sidebar-section">Симуляция
        </div>
    `,
    settings : `
        <div class="accordion accordion-flush" id="accordionSettings">
            <div class="accordion-item">
                <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne">
                    Камера
                </button>
                </h2>
                <div id="flush-collapseOne" class="accordion-collapse collapse" data-bs-parent="#accordionSettings">
                    <div class="accordion-body">
                        <div class="control-group">
                            <p>Положение камеры</p>
                            <div class="slider-container">
                                <label>X:</label>
                                <input type="range" id="cam-x" min="-20" max="20" step="0.1" value="0">
                                <span id="cam-x-value">0</span>
                            </div>
                            <div class="slider-container">
                                <label>Y:</label>
                                <input type="range" id="cam-y" min="-20" max="20" step="0.1" value="1">
                                <span id="cam-y-value">1</span>
                            </div>
                            <div class="slider-container">
                                <label>Z:</label>
                                <input type="range" id="cam-z" min="-20" max="20" step="0.1" value="3">
                                <span id="cam-z-value">3</span>
                            </div>
                        </div>

                        <div class="control-group">
                            <p>Вращение камеры</p>
                            <div class="slider-container">
                                <label>X:</label>
                                <input type="range" id="cam-rot-x" min="-3.14" max="3.14" step="0.01" value="0">
                                <span id="cam-rot-x-value">0</span>
                            </div>
                            <div class="slider-container">
                                <label>Y:</label>
                                <input type="range" id="cam-rot-y" min="-3.14" max="3.14" step="0.01" value="0">
                                <span id="cam-rot-y-value">0</span>
                            </div>
                            <div class="slider-container">
                                <label>Z:</label>
                                <input type="range" id="cam-rot-z" min="-3.14" max="3.14" step="0.01" value="0">
                                <span id="cam-rot-z-value">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseTwo" aria-expanded="false" aria-controls="flush-collapseTwo">
                    Свет
                </button>
                </h2>
                <div id="flush-collapseTwo" class="accordion-collapse collapse" data-bs-parent="#accordionSettings">
                    <div class="accordion-body">
                        <div class="control-group">
                            <p>Источник света</p>
                            <div class="slider-container">
                                <label>X:</label>
                                <input type="range" id="light-x" min="-20" max="10" step="0.1" value="1">
                                <span id="light-x-value">1</span>
                            </div>
                            <div class="slider-container">
                                <label>Y:</label>
                                <input type="range" id="light-y" min="-20" max="10" step="0.1" value="1">
                                <span id="light-y-value">1</span>
                            </div>
                            <div class="slider-container">
                                <label>Z:</label>
                                <input type="range" id="light-z" min="-20" max="10" step="0.1" value="1">
                                <span id="light-z-value">1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    education : `
        <div class="sidebar-section">Обучение
        </div>
    `,
    flying : `
        <div class="sidebar-section">Полет
        </div>
    `
};

export function getSidebarLeftContent(contentKey) {
    return sidebarLeftContent[contentKey] || '<p>Контент не найден</p>';
}