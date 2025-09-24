export const headerContent = {
    simulation : `
        Симуляция
    `,
    settings : `
        Настройка
    `,
    education : `
        Обучение
    `,
    flying : `
        Полет
    `
};

export function getHeaderContent(contentKey) {
    return headerContent[contentKey] || '<p>Контент не найден</p>';
}