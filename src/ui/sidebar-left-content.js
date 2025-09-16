export const sidebarLeftContent = {
    simulation : `
        <div class="sidebar-section">Симуляция
        </div>
    `,
    settings : `
        <div class="sidebar-section">Настройки
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