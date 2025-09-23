В вашей программе параметры canvas регулируются через несколько механизмов. Вот основные способы управления размерами и свойствами canvas:

## 1. **Автоматическое изменение размера через ResizeObserver**
```javascript
// В методе setupEventListeners()
const resizeObserver = new ResizeObserver(() => {
    const container = this.config.container;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
});
resizeObserver.observe(this.config.container);
```

## 2. **Ручная настройка в setupRenderer()**
```javascript
setupRenderer() {
    const container = this.config.container;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    container.appendChild(this.renderer.domElement);
}
```

## 3. **Параметры рендерера при создании**
```javascript
this.renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true  // Прозрачный фон
});
```

## **Как добавить регулировку параметров canvas:**

### A. **Добавьте контролы в интерфейс:**
```html
<div class="control-group">
    <h3>Canvas Settings</h3>
    <div class="slider-container">
        <label>Width:</label>
        <input type="range" id="canvasWidth" min="100" max="2000" value="895">
        <span id="canvasWidthValue">895px</span>
    </div>
    <div class="slider-container">
        <label>Height:</label>
        <input type="range" id="canvasHeight" min="100" max="2000" value="991">
        <span id="canvasHeightValue">991px</span>
    </div>
    <div>
        <label>
            <input type="checkbox" id="antialiasToggle" checked> Antialiasing
        </label>
        <label>
            <input type="checkbox" id="alphaToggle" checked> Transparent
        </label>
    </div>
</div>
```

### B. **Добавьте методы для управления canvas:**
```javascript
// В класс DroneSimulator добавьте методы:

setCanvasSize(width, height) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // Обновляем стили для правильного отображения
    this.renderer.domElement.style.width = width + 'px';
    this.renderer.domElement.style.height = height + 'px';
}

toggleAntialiasing(enabled) {
    this.renderer.dispose(); // Очищаем старый рендерер
    this.renderer = new THREE.WebGLRenderer({ 
        antialias: enabled,
        alpha: this.renderer.getContext().getContextAttributes().alpha
    });
    
    // Восстанавливаем размер и добавляем в DOM
    this.setCanvasSize(
        this.renderer.domElement.width,
        this.renderer.domElement.height
    );
    this.config.container.appendChild(this.renderer.domElement);
}

toggleTransparency(enabled) {
    this.renderer.dispose();
    this.renderer = new THREE.WebGLRenderer({ 
        antialias: this.renderer.getContext().getContextAttributes().antialias,
        alpha: enabled
    });
    
    this.setCanvasSize(
        this.renderer.domElement.width,
        this.renderer.domElement.height
    );
    this.config.container.appendChild(this.renderer.domElement);
}
```

### C. **Добавьте обработчики событий:**
```javascript
// В setupControls() добавьте:
setupControls() {
    // ... существующий код ...
    
    // Контролы для canvas
    this.config.controlElements.canvasWidth.addEventListener('input', () => {
        const width = parseInt(this.config.controlElements.canvasWidth.value);
        const height = parseInt(this.config.controlElements.canvasHeight.value);
        this.setCanvasSize(width, height);
        this.config.controlElements.canvasWidthValue.textContent = width + 'px';
    });
    
    this.config.controlElements.canvasHeight.addEventListener('input', () => {
        const width = parseInt(this.config.controlElements.canvasWidth.value);
        const height = parseInt(this.config.controlElements.canvasHeight.value);
        this.setCanvasSize(width, height);
        this.config.controlElements.canvasHeightValue.textContent = height + 'px';
    });
    
    this.config.controlElements.antialiasToggle.addEventListener('change', () => {
        this.toggleAntialiasing(this.config.controlElements.antialiasToggle.checked);
    });
    
    this.config.controlElements.alphaToggle.addEventListener('change', () => {
        this.toggleTransparency(this.config.controlElements.alphaToggle.checked);
    });
}
```

### D. **Обновите конфигурацию:**
```javascript
// В объект config добавьте:
controlElements: {
    // ... существующие элементы ...
    canvasWidth: document.getElementById('canvasWidth'),
    canvasHeight: document.getElementById('canvasHeight'),
    canvasWidthValue: document.getElementById('canvasWidthValue'),
    canvasHeightValue: document.getElementById('canvasHeightValue'),
    antialiasToggle: document.getElementById('antialiasToggle'),
    alphaToggle: document.getElementById('alphaToggle')
}
```

## **Дополнительные параметры которые можно регулировать:**
- **Pixel Ratio**: `this.renderer.setPixelRatio(value)`
- **Shadow Quality**: `this.renderer.shadowMap.type`
- **Clear Color**: `this.renderer.setClearColor(color, alpha)`
- **Precision**: `precision` в настройках WebGLRenderer

Таким образом вы получите полный контроль над параметрами canvas через интерфейс вашего приложения.