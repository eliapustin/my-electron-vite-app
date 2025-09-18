export const sidebarLeftContent = {
    simulation : `
        <div class="sidebar-section">Симуляция
        </div>
    `,
    settings : `
        <li>Камера
            <ol>
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
            </ol>            
        </li>
        <button class="sidebar-left-button">Камера</button>
        <button class="sidebar-left-button">Свет</button>
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