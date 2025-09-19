export const sidebarRightContent = {
    simulation : `
        <div class="sidebar-section">Симуляция
        </div>
    `,
    settings : `
        <div class="sidebar-section">Настройка
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

export function getSidebarRightContent(contentKey) {
    return sidebarRightContent[contentKey] || '<p>Контент не найден</p>';
}