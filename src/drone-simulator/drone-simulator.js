import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class DroneSimulator {
    constructor(config) {
        this.config = config;
        this.propellerSpeed = 0;
        this.isConnected = false;
        this.isAutoMode = true;
        this.lastAnimationTime = 0;
        this.propeller1 = null;
        this.propeller2 = null;
        this.propeller3 = null;
        this.propeller4 = null;
        this.drone = null;
        this.autoLoadSettings = true;
        this.isModelSplit = false;
        this.originalPositions = new Map();
        this.splitDistance = 1.5; // Расстояние между частями при разделении
        this.keys = {
            yawLeft: false,   // a
            yawRight: false,  // d
            rollLeft: false,  // ArrowLeft
            rollRight: false, // ArrowRight
            pitchDown: false, // ArrowDown
            pitchUp: false,   // ArrowUp
            speedDown: false, // s
            speedUp: false    // w
        };
        this.baseHeight = 0; // Базовая высота дрона
        this.targetHeight = 0; // Целевая высота для анимации
        this.currentHeight = 0; // Текущая высота дрона
        this.maxLiftHeight = 3; // Максимальная высота подъема
        this.liftSpeed = 0.1; // Скорость изменения высоты
        this.liftThreshold = 5; // Порог крена/тангажа для подъема (5 градусов)
        this.yawOffset = 0;  // Перем. для хранения коррекции
        this.lastYaw = 0;    // Последнее полученное значение yaw

        // Для плавности 1:
        this.targetAttitude = {pitch: 0, roll: 0, yaw: 0};        
        this.currentAttitude = {pitch: 0, roll: 0, yaw: 0};
        this.lerpFactor = 0.2; // Коэффициент плавности

        // Для плавности 3
        this.attitudeBuffer = [];
        this.attitudeBufferSize = 1;

        // Для плавности 2:
        this.lastUpdateTime = 0;
        this.lastSpeed = {pitchSpeed: 0, rollSpeed: 0, yawSpeed: 0};

        this.axes = {
            pitch: new THREE.Vector3(1, 0, 0),  // Ось X для тангажа
            yaw: new THREE.Vector3(0, 1, 0),    // Ось Y для рыскания
            roll: new THREE.Vector3(0, 0, 1)     // Ось Z для крена
        };

        

        // Для симуляции полета
        this.isSimulating = false;
        this.simulationInterval = null;

        
        // Инициализация Three.js
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true
        });
        
        // Освещение
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.ambientLight = new THREE.AmbientLight(0x404040);
        
        // WebSocket соединение
        this.ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);
        console.log('WebSocket connecting to:', `ws://${window.location.hostname}:${window.location.port}`);
        this.connectionTimeout = 5000;
    }

    init() {
        this.setupRenderer();
        this.setupLights();
        this.setupControls();
        this.loadDroneModel();
        this.setupEventListeners();
        this.setupKeyboardControls();
        this.loadSettings();
        this.animate();
        document.getElementById('back-to-3d').addEventListener('click', () => this.returnTo3DView());
    }

    setupRenderer() {
        const container = this.config.container;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        // this.camera.position.x = 0;
        // this.camera.position.y = 2.7;
        // this.camera.position.z = -8.7;
        // this.camera.rotation.x = 0.24;
        // this.camera.rotation.y = -3.14;
        // this.camera.rotation.z = 0;
        this.camera.updateProjectionMatrix();
        
        container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        this.directionalLight.position.set(1, 2.1, 1);
        this.scene.add(this.directionalLight);
        this.scene.add(this.ambientLight);
    }

    loadDroneModel() {
        const loader = new GLTFLoader();
        loader.load(
            this.config.modelPath,
            (gltf) => this.onModelLoaded(gltf),
            undefined,
            (error) => this.onModelError(error)
        );
    }

    onModelLoaded(gltf) {
        this.drone = gltf.scene;
        this.scene.add(this.drone);
        this.drone.scale.set(0.5, 0.5, 0.5);
        this.drone.position.set(0, 0, 0);
        
        // Инициализируем кватернион
        this.drone.quaternion.identity();

        this.updateDroneOrientation(0, 0, 0);
        this.baseHeight = 0;
        this.currentHeight = 0;
        this.targetHeight = 0;

        // Находим лопасти в модели
        this.drone.traverse((child) => {
            if (child.isMesh) {
                if (child.name.includes('propeller_1')) this.propeller1 = child;
                if (child.name.includes('propeller_2')) this.propeller2 = child;
                if (child.name.includes('propeller_3')) this.propeller3 = child;
                if (child.name.includes('propeller_4')) this.propeller4 = child;
            }
        });
        
        if (!this.propeller1 || !this.propeller2 || !this.propeller3 || !this.propeller4) {
            console.warn('Не все лопасти найдены в модели!');
        }
    }

    onModelError(error) {
        console.error('Ошибка загрузки модели:', error);
        const geometry = new THREE.BoxGeometry(2, 0.5, 1.5);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x00aaff,
            transparent: true,
            opacity: 0.8
        });
        this.drone = new THREE.Mesh(geometry, material);
        this.scene.add(this.drone);
        this.updateDroneOrientation(0, 0, 0);
    }

    updateDroneOrientation(pitch, roll, yaw, updateSliders = true) {

        this.lastYaw = yaw;  // Сохраняем последнее значение
        
        // В авторежиме применяем коррекцию
        const correctedYaw = this.isAutoMode ? yaw + this.yawOffset : yaw;// Для нормализации угла в диапазон [0, 360)
        const normalizedYaw = (correctedYaw + 360) % 360;
        
        if (this.drone) {
            // Создаем кватернионы для каждого вращения
            const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(1, 0, 0), // Ось X (тангаж)
                THREE.MathUtils.degToRad(pitch)
            );
            
            const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0), // Ось Y (рыскание)
                THREE.MathUtils.degToRad(normalizedYaw)
            );
            
            const rollQuaternion = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 0, 1), // Ось Z (крен)
                THREE.MathUtils.degToRad(roll)
            );
            
            // Комбинируем вращения (порядок важен: рыскание -> тангаж -> крен)
            this.drone.quaternion.copy(yawQuaternion)
                .multiply(pitchQuaternion)
                .multiply(rollQuaternion);
        }

        if (updateSliders) {
            this.config.controlElements.rollControl.value = roll;
            this.config.controlElements.rollValue.textContent = roll.toFixed(0) + '°';
            this.config.controlElements.pitchControl.value = pitch;
            this.config.controlElements.pitchValue.textContent = pitch.toFixed(0) + '°';
            this.config.controlElements.yawControl.value = yaw;
            this.config.controlElements.yawValue.textContent = yaw.toFixed(0) + '°';
        }

        // Если ориентация выходит за пределы стабильности, плавно снижаем высоту
        if (Math.abs(pitch) > this.liftThreshold || Math.abs(roll) > this.liftThreshold) {
            this.baseHeight = Math.max(0, this.currentHeight - 0.1); // Плавное снижение
            this.targetHeight = this.baseHeight;
        }
    }

    setupKeyboardControls() {
        console.log('Setting up keyboard controls...'); // Добавьте эту строку
        const keyMap = {
            'a': 'yawLeft',
            'd': 'yawRight',
            'arrowleft': 'rollLeft',
            'arrowright': 'rollRight',
            'arrowdown': 'pitchDown',
            'arrowup': 'pitchUp',
            's': 'speedDown',
            'w': 'speedUp'
        };
    
        // Обработчики для нажатия клавиш
        document.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (keyMap[key]) {
                this.keys[keyMap[key]] = true;
                event.preventDefault();
            }
        });
    
        // Обработчики для отпускания клавиш
        document.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            if (keyMap[key]) {
                this.keys[keyMap[key]] = false;
                event.preventDefault();
            }
        });
    }

    updateDroneLift(deltaTime) {
        if (!this.drone) return;
    
        // Получаем текущие значения крена и тангажа
        const roll = parseFloat(this.config.controlElements.rollControl.value);
        const pitch = parseFloat(this.config.controlElements.pitchControl.value);
        const speed = parseFloat(this.config.controlElements.propellerSpeed.value);
    
        // Проверяем условия для подъема (крен и тангаж в пределах ±5 градусов)
        const isStable = Math.abs(roll) <= this.liftThreshold && 
                         Math.abs(pitch) <= this.liftThreshold;
        
        if (isStable) {
            if (speed <= 50) {
                // При скорости ≤50% - дрон на земле (высота = 0)
                this.targetHeight = 0;
            } else {
                // При скорости >50% - рассчитываем высоту:
                // 50% = 0, 100% = maxLiftHeight
                const normalizedSpeed = (speed - 50) / 50; // Нормализуем от 0 до 1
                this.targetHeight = normalizedSpeed * this.maxLiftHeight;
            }
        } else {
            // Если дрон нестабилен, плавно снижаемся
            this.targetHeight = Math.max(0, this.currentHeight - 0.1 * (deltaTime / 16));
        }
    
        // Плавно изменяем текущую высоту к целевой
        const deltaHeight = this.targetHeight - this.currentHeight;
        if (Math.abs(deltaHeight) > 0.01) {
            this.currentHeight += deltaHeight * this.liftSpeed * (deltaTime / 16);
            this.drone.position.y = this.currentHeight;
        }
    }

    updateKeyboardControls(deltaTime) {
        const step = 1 * (deltaTime / 16); // Нормализуем скорость относительно времени кадра
        
        if (this.keys.yawLeft) {
            this.adjustSlider(this.config.controlElements.yawControl, step);
        }
        if (this.keys.yawRight) {
            this.adjustSlider(this.config.controlElements.yawControl, -step);
        }
        if (this.keys.rollLeft) {
            this.adjustSlider(this.config.controlElements.rollControl, -step);
        }
        if (this.keys.rollRight) {
            this.adjustSlider(this.config.controlElements.rollControl, step);
        }
        if (this.keys.pitchDown) {
            this.adjustSlider(this.config.controlElements.pitchControl, step);
        }
        if (this.keys.pitchUp) {
            this.adjustSlider(this.config.controlElements.pitchControl, -step);
        }
        if (this.keys.speedDown) {
            this.adjustSlider(this.config.controlElements.propellerSpeed, -step);
        }
        if (this.keys.speedUp) {
            this.adjustSlider(this.config.controlElements.propellerSpeed, step);
        }
    }

    adjustSlider(slider, change) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        let newValue = parseFloat(slider.value) + change;
        
        // Ограничиваем значение в пределах min и max
        newValue = Math.max(min, Math.min(max, newValue));
        
        // Устанавливаем новое значение и запускаем событие input
        slider.value = newValue;
        const inputEvent = new Event('input', { bubbles: true });
        slider.dispatchEvent(inputEvent);
    }

    partDroneModel() {
        if (!this.drone || this.isModelSplit) return;
    
        // Сохраняем оригинальные позиции всех частей
        this.originalPositions = new Map();
        this.drone.traverse(child => {
            if (child.isMesh) {
                this.originalPositions.set(child, child.position.clone());
            }
        });
    
        // Сдвигаем всю модель 
        gsap.to(this.drone.position, {
            // x: +(this.splitDistance * 2),
            // y: -this.splitDistance,
            y: -0.2,
            z: -0.4,
            duration: 1,
            onComplete: () => {
                // Находим все нужные части модели
                const corpusPart= [];
                const corpusCPUPart = [];
                const ramaPart = [];
                const propellers = [];
                const motors = [];
    
                this.drone.traverse(child => {
                    if (!child.isMesh) return;
    
                    if (child.name.includes("rama")) {
                        ramaPart.push(child);
                    } else if (child.name.includes("corpusFrame")) {
                        corpusPart.push(child);
                    } else if (child.name.includes("corpusCPU")) {
                        corpusCPUPart.push(child);
                    } else if (child.name.includes("propeller_")) {
                        propellers.push(child);
                    } else if (child.name.includes("motors")) {
                        motors.push(child);
                    } else {
                        otherParts.push(child);
                        console.log("otherParts:", otherParts);
                    }
                });
    
                // Создаем контейнер для кнопок
                const buttonsContainer = document.createElement('div');
                buttonsContainer.id = 'part-buttons-container';
                document.body.appendChild(buttonsContainer);
                document.getElementById('drone-parts').appendChild(buttonsContainer);
    
                // Функция для создания кнопки
                const createPartButton = (text, partType) => {
                    const button = document.createElement('button');
                    button.className = 'part-button';
                    button.textContent = text;
                    button.style.display = 'block';    
                    button.style.margin = '0 auto';
                    button.style.marginTop = '5px';     
                    button.dataset.partType = partType;
                    button.addEventListener('click', () => this.showLearningContent(partType));
                    return button;
                };
    
                //  Кнопка для корпуса
                if (corpusPart.length > 0) {
                    const button = createPartButton('Корпус', 'corpusFrame');
                    buttonsContainer.appendChild(button);
                }

                //  Кнопка для "Полетный контроллер"
                if (corpusCPUPart.length > 0) {
                    const button = createPartButton('Полетный контроллер', 'corpusCPU');
                    buttonsContainer.appendChild(button);
                }

                //  Кнопка для пропеллеров
                if (propellers.length > 0) {
                    const button = createPartButton('Винты', 'propellers');
                    buttonsContainer.appendChild(button);
                }
                
                //  Кнопка для моторов
                if (motors.length > 0) {
                    const button = createPartButton('Моторы', 'motors');
                    buttonsContainer.appendChild(button);
                }
                //  Кнопка для "Рама"
                if (ramaPart.length > 0) {
                    const button = createPartButton('Рама', 'frame');
                    buttonsContainer.appendChild(button);
                }
    
                // Анимация разделения частей с учетом требований
                const ramaHeight = 0;
                const motorsHeight = 2;
                const propellersHeight = 4;
                const corpusCPUHeight = 6;
                const corpusHeight = 8;
    
                // Моторы двигаются симметрично и выше рамы
                motors.forEach((part, index) => {
                    gsap.to(part.position, {
                        y: part.position.y + motorsHeight,
                        duration: 1.5,
                        ease: "power2.out"
                    });
                });
    
                // Пропеллеры двигаются симметрично и выше моторов
                propellers.forEach((part, index) => {
                    gsap.to(part.position, {
                        y: part.position.y + propellersHeight,
                        duration: 1.5,
                        ease: "power2.out"
                    });
                });
    
                // "Корпус контроллера" поднимается выше пропеллеров
                corpusCPUPart.forEach(part => {
                    gsap.to(part.position, {
                        y: part.position.y + corpusCPUHeight,
                        duration: 1.5,
                        ease: "power2.out"
                    });
                });

                // "Корпус" поднимается выше корпуса CPU
                corpusPart.forEach(part => {
                    console.log("part:", part);
                    gsap.to(part.position, {
                        z: part.position.z - corpusHeight*30,
                        duration: 1.5,
                        ease: "power2.out"
                    });
                });
            }
        });
    
        this.isModelSplit = true;
    }
    
    assembleDroneModel() {
        if (!this.drone || !this.isModelSplit || !this.originalPositions) return;
    
        // Удаляем кнопки
        const buttonsContainer = document.getElementById('part-buttons-container');
        if (buttonsContainer) {
            buttonsContainer.remove();
        }
    
        // Возвращаем все части на оригинальные позиции
        this.drone.traverse(child => {
            if (child.isMesh && this.originalPositions.has(child)) {
                const originalPos = this.originalPositions.get(child);
                gsap.to(child.position, {
                    x: originalPos.x,
                    y: originalPos.y,
                    z: originalPos.z,
                    duration: 1.5,
                    ease: "power2.inOut"
                });
            }
        });
    
        // Возвращаем всю модель в центр
        gsap.to(this.drone.position, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1,
            delay: 1.5,
            onComplete: () => {
                this.originalPositions.clear();
            }
        });
    
        this.isModelSplit = false;
    }

    // Для симуляции полета
    startFlightSimulation(animationDuration = 1, pauseBetweenAnimations = 1) {
        if (this.isSimulating) return;
        this.isSimulating = true;
        
        this.resetToDefaultPosition();
        this.runSimulationCycle(animationDuration, pauseBetweenAnimations);
        
        this.config.controlElements.flightSimulatorBtn.textContent = 'Остановить симулятор';
        this.config.controlElements.flightSimulatorBtn.style.backgroundColor = '#f44336';
    }

    stopFlightSimulation() {
        this.isSimulating = false;
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        this.resetToDefaultPosition();
    }

    resetToDefaultPosition() {
        // Устанавливаем значения слайдеров напрямую
        this.config.controlElements.rollControl.value = 0;
        this.config.controlElements.pitchControl.value = 0;
        this.config.controlElements.yawControl.value = 0;
        this.config.controlElements.propellerSpeed.value = 50;
        
        // Обновляем отображаемые значения
        this.config.controlElements.rollValue.textContent = '0°';
        this.config.controlElements.pitchValue.textContent = '0°';
        this.config.controlElements.yawValue.textContent = '0°';
        this.config.controlElements.propellerSpeedValue.textContent = '50%';
        
        // Сбрасываем вращение модели
        if (this.drone) {
            this.drone.quaternion.identity(); // Устанавливаем кватернион в нейтральное положение
        }
        
        // Триггерим события изменения
        this.config.controlElements.rollControl.dispatchEvent(new Event('input'));
        this.config.controlElements.pitchControl.dispatchEvent(new Event('input'));
        this.config.controlElements.yawControl.dispatchEvent(new Event('input'));
        this.config.controlElements.propellerSpeed.dispatchEvent(new Event('input'));
    }

    runSimulationCycle(animationDuration = 1, pauseBetweenAnimations = 1) {
        if (!this.isSimulating) return;
        
        // Общее время для каждой фазы анимации (вперед-назад)
        const phaseDuration = animationDuration * 2;
        
        // 1. Анимация скорости пропеллеров: 50% -> 100% -> 50%
        gsap.to(this.config.controlElements.propellerSpeed, {
            value: 100,
            duration: animationDuration,
            onUpdate: () => {
                this.config.controlElements.propellerSpeedValue.textContent = 
                    Math.round(this.config.controlElements.propellerSpeed.value) + '%';
                this.config.controlElements.propellerSpeed.dispatchEvent(new Event('input'));
            },
            onComplete: () => {
                gsap.to(this.config.controlElements.propellerSpeed, {
                    value: 50,
                    duration: animationDuration,
                    delay: pauseBetweenAnimations,
                    onUpdate: () => {
                        this.config.controlElements.propellerSpeedValue.textContent = 
                            Math.round(this.config.controlElements.propellerSpeed.value) + '%';
                        this.config.controlElements.propellerSpeed.dispatchEvent(new Event('input'));
                    }
                });
            }
        });
        
        // 2. Анимация крена: 0 -> -60 -> 60 -> 0
        gsap.to(this.config.controlElements.rollControl, {
            value: -60,
            duration: animationDuration,
            delay: phaseDuration + pauseBetweenAnimations,
            onUpdate: () => {
                this.config.controlElements.rollValue.textContent = 
                    Math.round(this.config.controlElements.rollControl.value) + '°';
                this.config.controlElements.rollControl.dispatchEvent(new Event('input'));
            },
            onComplete: () => {
                gsap.to(this.config.controlElements.rollControl, {
                    value: 60,
                    duration: animationDuration,
                    onUpdate: () => {
                        this.config.controlElements.rollValue.textContent = 
                            Math.round(this.config.controlElements.rollControl.value) + '°';
                        this.config.controlElements.rollControl.dispatchEvent(new Event('input'));
                    },
                    onComplete: () => {
                        gsap.to(this.config.controlElements.rollControl, {
                            value: 0,
                            duration: animationDuration,
                            delay: pauseBetweenAnimations,
                            onUpdate: () => {
                                this.config.controlElements.rollValue.textContent = 
                                    Math.round(this.config.controlElements.rollControl.value) + '°';
                                this.config.controlElements.rollControl.dispatchEvent(new Event('input'));
                            }
                        });
                    }
                });
            }
        });
        
        // 3. Анимация тангажа: 0 -> -60 -> 60 -> 0
        gsap.to(this.config.controlElements.pitchControl, {
            value: -60,
            duration: animationDuration,
            delay: (phaseDuration + pauseBetweenAnimations) * 2,
            onUpdate: () => {
                this.config.controlElements.pitchValue.textContent = 
                    Math.round(this.config.controlElements.pitchControl.value) + '°';
                this.config.controlElements.pitchControl.dispatchEvent(new Event('input'));
            },
            onComplete: () => {
                gsap.to(this.config.controlElements.pitchControl, {
                    value: 60,
                    duration: animationDuration,
                    onUpdate: () => {
                        this.config.controlElements.pitchValue.textContent = 
                            Math.round(this.config.controlElements.pitchControl.value) + '°';
                        this.config.controlElements.pitchControl.dispatchEvent(new Event('input'));
                    },
                    onComplete: () => {
                        gsap.to(this.config.controlElements.pitchControl, {
                            value: 0,
                            duration: animationDuration,
                            delay: pauseBetweenAnimations,
                            onUpdate: () => {
                                this.config.controlElements.pitchValue.textContent = 
                                    Math.round(this.config.controlElements.pitchControl.value) + '°';
                                this.config.controlElements.pitchControl.dispatchEvent(new Event('input'));
                            }
                        });
                    }
                });
            }
        });
        
        // 4. Анимация рыскания: 0 -> -60 -> 60 -> 0
        gsap.to(this.config.controlElements.yawControl, {
            value: -60,
            duration: animationDuration,
            delay: (phaseDuration + pauseBetweenAnimations) * 3,
            onUpdate: () => {
                this.config.controlElements.yawValue.textContent = 
                    Math.round(this.config.controlElements.yawControl.value) + '°';
                this.config.controlElements.yawControl.dispatchEvent(new Event('input'));
            },
            onComplete: () => {
                gsap.to(this.config.controlElements.yawControl, {
                    value: 60,
                    duration: animationDuration,
                    onUpdate: () => {
                        this.config.controlElements.yawValue.textContent = 
                            Math.round(this.config.controlElements.yawControl.value) + '°';
                        this.config.controlElements.yawControl.dispatchEvent(new Event('input'));
                    },
                    onComplete: () => {
                        gsap.to(this.config.controlElements.yawControl, {
                            value: 0,
                            duration: animationDuration,
                            delay: pauseBetweenAnimations,
                            onUpdate: () => {
                                this.config.controlElements.yawValue.textContent = 
                                    Math.round(this.config.controlElements.yawControl.value) + '°';
                                this.config.controlElements.yawControl.dispatchEvent(new Event('input'));
                            },
                            onComplete: () => {
                                // Повтор цикла через паузу
                                if (this.isSimulating) {
                                    setTimeout(() => this.runSimulationCycle(animationDuration, pauseBetweenAnimations), pauseBetweenAnimations * 1000);
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    // метод для показа учебного контента
    showLearningContent(partType) {
        const droneContainer = document.getElementById('drone-container');
        const learningContent = document.getElementById('learning-content');
        const learningContentButton = document.getElementById('learning-content-button');
        const learningText = document.getElementById('learning-text');
        const learningImage = document.getElementById('learning-image');

        // Скрываем 3D модель и показываем учебный контент
        droneContainer.style.display = 'none';
        learningContent.style.display = 'block';
        learningContentButton.style.display = 'block';

        // Загружаем соответствующий контент в зависимости от выбранной части
        switch(partType) {
            case 'frame':
                learningText.innerHTML = '<h2>Рама дрона</h2><p>Основа дрона, к которой крепятся все компоненты.</p> <p>Обычно изготавливается из карбона или композитных материалов для легкости и прочности.</p> <p>От ее конструкции зависит устойчивость и маневренность.</p>';
                learningImage.src = './images/rama_gray.jpg';
                break;
            case 'corpusCPU':
                learningText.innerHTML = '<h2>Полетный контроллер</h2><p>"Мозг" дрона, обрабатывающий данные с датчиков (гироскопа, акселерометра) и управляющий моторами.</p> <p>Поддерживает современные протоколы, такие как Betaflight, обеспечивая плавный полет.</p>';
                learningImage.src = './images/controller.jpg';
                break;
            case 'corpusFrame':
                learningText.innerHTML = '<h2>Корпус</h2><p>Защищает электронику от повреждений и внешних воздействий.</p> <p>Может быть открытым или закрытым, в зависимости от назначения дрона.</p>';
                learningImage.src = './images/corpus_gray.jpg';
                break;
            case 'propellers':
                learningText.innerHTML = '<h2>Винты дрона</h2><p>Создают подъемную силу.</p> <p>Размер и форма винтов подбираются под характеристики моторов и задачи дрона.</p>';
                learningImage.src = './images/propellers_bee_gray.jpg';
                break;
            case 'motors':
                learningText.innerHTML = '<h2>Моторы</h2><p>Обеспечивают тягу для полета.</p> <p>Их мощность и КПД напрямую влияют на скорость и грузоподъемность дрона.</p>';
                learningImage.src = './images/motor2.jpg';
                break;
        }
    }

    // метод для возврата к 3D модели
    returnTo3DView() {
        document.getElementById('drone-container').style.display = 'block';
        document.getElementById('learning-content').style.display = 'none';
        document.getElementById('learning-content-button').style.display = 'none';
    }

    setupControls() {
        // Переключатель режимов
        this.config.controlElements.modeToggle.addEventListener('change', () => {
            const wasAutoMode = this.isAutoMode;
            this.isAutoMode = this.config.controlElements.modeToggle.checked;
            console.log('Mode changed to:', this.isAutoMode ? 'Auto' : 'Manual');
            this.config.controlElements.modeText.textContent = this.isAutoMode ? 'Авто' : 'Ручной';

            // Сбрасываем рыскание при переходе в авторежим
            if (!wasAutoMode && this.isAutoMode) {
            // if (this.isAutoMode) {
                // this.resetYawOnModeSwitch();
                this.yawOffset = -this.lastYaw;
            }
            
            const droneControls = [
                this.config.controlElements.rollControl,
                this.config.controlElements.pitchControl,
                this.config.controlElements.yawControl
            ];
            
            droneControls.forEach(control => {
                control.disabled = this.isAutoMode;
            });
        });

        // Слайдер скорости
        this.config.controlElements.propellerSpeed.addEventListener('input', () => {
            this.propellerSpeed = parseInt(this.config.controlElements.propellerSpeed.value);
            this.config.controlElements.propellerSpeedValue.textContent = this.propellerSpeed + '%';
            
            // Сбрасываем базовую высоту при изменении скорости
            this.baseHeight = this.currentHeight;
        });

        // Регуляторы ориентации дрона
        this.config.controlElements.rollControl.addEventListener('input', () => {
            const value = parseInt(this.config.controlElements.rollControl.value);
            this.config.controlElements.rollValue.textContent = value + '°';
            if (!this.isAutoMode) {
                this.updateDroneOrientation(
                    parseInt(this.config.controlElements.pitchControl.value),
                    value,
                    parseInt(this.config.controlElements.yawControl.value),
                    false
                );
            }
        });

        this.config.controlElements.pitchControl.addEventListener('input', () => {
            const value = parseInt(this.config.controlElements.pitchControl.value);
            this.config.controlElements.pitchValue.textContent = value + '°';
            if (!this.isAutoMode) {
                this.updateDroneOrientation(
                    value,
                    parseInt(this.config.controlElements.rollControl.value),
                    parseInt(this.config.controlElements.yawControl.value),
                    false
                );
            }
        });

        this.config.controlElements.yawControl.addEventListener('input', () => {
            const value = parseInt(this.config.controlElements.yawControl.value);
            this.config.controlElements.yawValue.textContent = value + '°';
            if (!this.isAutoMode) {
                this.updateDroneOrientation(
                    parseInt(this.config.controlElements.pitchControl.value),
                    parseInt(this.config.controlElements.rollControl.value),
                    value,
                    false
                );
            }
        });

        // Регуляторы положения камеры
        this.config.controlElements.camX.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.camX.value);
            this.config.controlElements.camXValue.textContent = value.toFixed(1);
            this.camera.position.x = value;
        });

        this.config.controlElements.camY.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.camY.value);
            this.config.controlElements.camYValue.textContent = value.toFixed(1);
            this.camera.position.y = value;
        });

        this.config.controlElements.camZ.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.camZ.value);
            this.config.controlElements.camZValue.textContent = value.toFixed(1);
            this.camera.position.z = value;
        });

        // Регуляторы вращения камеры
        this.config.controlElements.camRotX.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.camRotX.value);
            this.config.controlElements.camRotXValue.textContent = value.toFixed(2);
            this.camera.rotation.x = value;
        });

        this.config.controlElements.camRotY.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.camRotY.value);
            this.config.controlElements.camRotYValue.textContent = value.toFixed(2);
            this.camera.rotation.y = value;
        });

        this.config.controlElements.camRotZ.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.camRotZ.value);
            this.config.controlElements.camRotZValue.textContent = value.toFixed(2);
            this.camera.rotation.z = value;
        });

        // Управление источником света
        this.config.controlElements.lightX.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.lightX.value);
            this.config.controlElements.lightXValue.textContent = value.toFixed(1);
            this.directionalLight.position.x = value;
        });

        this.config.controlElements.lightY.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.lightY.value);
            this.config.controlElements.lightYValue.textContent = value.toFixed(1);
            this.directionalLight.position.y = value;
        });

        this.config.controlElements.lightZ.addEventListener('input', () => {
            const value = parseFloat(this.config.controlElements.lightZ.value);
            this.config.controlElements.lightZValue.textContent = value.toFixed(1);
            this.directionalLight.position.z = value;
        });

        // Кнопки сохранения/загрузки настроек
        this.config.controlElements.saveSettings.addEventListener('click', () => this.saveSettings());
        this.config.controlElements.loadSettings.addEventListener('click', () => this.autoLoadSettings = false);
        this.config.controlElements.loadSettings.addEventListener('click', () => this.loadSettings());

        // Обработчик для переключателя разделения модели
        if (this.config.controlElements.splitModelToggle) {
        this.config.controlElements.splitModelToggle.addEventListener('change', () => {
            if (this.config.controlElements.splitModelToggle.checked) {
                this.partDroneModel();
                this.config.controlElements.splitModelText.textContent = 'Вкл';
            } else {
                this.assembleDroneModel();
                this.config.controlElements.splitModelText.textContent = 'Выкл';
            }
        });

        // Запуск симуляции полета
        this.config.controlElements.flightSimulatorBtn.addEventListener('click', () => {
            if (this.isSimulating) {
                this.stopFlightSimulation();
                this.config.controlElements.flightSimulatorBtn.textContent = 'Запустить симулятор полета';
                this.config.controlElements.flightSimulatorBtn.style.backgroundColor = '#2196F3';
            } else {
                // Получаем значения из полей ввода или используем значения по умолчанию
                const duration = parseFloat(document.getElementById('animationDuration').value) || 1;
                const pause = parseFloat(document.getElementById('animationPause').value) || 1;
                this.startFlightSimulation(duration, pause);
            }
        });
    }
    }

    resetYawOnModeSwitch() {
        const targetYaw = 0;
        const currentYaw = parseInt(this.config.controlElements.yawControl.value);
        const duration = 1.0; // секунды
        
        // Плавная анимация с помощью GSAP
        gsap.to(this.config.controlElements.yawControl, {
            value: targetYaw,
            duration: duration,
            onUpdate: () => {
                this.config.controlElements.yawValue.textContent = 
                    Math.round(this.config.controlElements.yawControl.value) + '°';
                this.updateDroneOrientation(
                    parseInt(this.config.controlElements.pitchControl.value),
                    parseInt(this.config.controlElements.rollControl.value),
                    parseInt(this.config.controlElements.yawControl.value),
                    false
                );
            }
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        this.ws.onopen = () => {
            this.updateConnectionStatus(true);
            console.log('WebSocket подключен');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Пришедшие данные
                console.log('Received data:', data); 
                
                this.config.infoElements.mavlinkType.textContent = data.type || 'N/A';
                this.config.infoElements.mavlinkSysId.textContent = data.sysid || 'N/A';
                this.config.infoElements.mavlinkCompId.textContent = data.compid || 'N/A';
                
                switch(data.type) {
                    case 'SYS_STATUS':
                        this.updateSystemStatus(data);
                        break;
                    case 'ATTITUDE':
                        this.updateAttitude(data);
                        break;
                    case 'RC_CHANNELS_RAW':
                        this.updateRCChannels(data);
                        break;
                    case 'VFR_HUD':
                        this.updateVFRHUD(data);
                        break;
                }
                
                if (this.isAutoMode && data.attitude) {

                    const invertedYaw = data.attitude.yaw * -1;

                    this.updateDroneOrientation(
                        data.attitude.pitch || 0,
                        data.attitude.roll || 0,
                        invertedYaw
                    );
                }
            } catch (e) {
                console.error('Ошибка обработки сообщения:', e);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus(false);
            this.updateDroneOrientation(0, 0, 0);
        };
        
        this.ws.onclose = () => {
            this.updateConnectionStatus(false);
            this.updateDroneOrientation(0, 0, 0);
        };

        
        const resizeObserver = new ResizeObserver(() => {
            const container = this.config.container;
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        });
        
        resizeObserver.observe(this.config.container);
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        this.config.infoElements.status.textContent = connected ? 'Подключено' : 'Нет подключения';
        this.config.infoElements.status.style.color = connected ? '#00ff00' : '#ff0000';
    }

    updateSystemStatus(data) {
        if (data.sysStatus) {
            this.config.infoElements.voltage.textContent = (data.sysStatus.voltage_battery || 0).toFixed(2);
            this.config.infoElements.current.textContent = (data.sysStatus.current_battery || 0).toFixed(2);
            this.config.infoElements.batteryRemain.textContent = data.sysStatus.battery_remaining || 0;
            this.config.infoElements.load.textContent = data.sysStatus.load || 0;
        }
    }

    updateAttitude(data) {
        if (data.attitude) {
            this.lastSpeed = {
                pitchSpeed: data.attitude.pitch || 0,
                rollSpeed: data.attitude.roll || 0,
                yawSpeed: data.attitude.yaw || 0
            }

            this.config.infoElements.attRoll.textContent = (data.attitude.roll || 0).toFixed(2);
            this.config.infoElements.attPitch.textContent = (data.attitude.pitch || 0).toFixed(2);
            this.config.infoElements.attYaw.textContent = (data.attitude.yaw || 0).toFixed(2);
            this.config.infoElements.rollSpeed.textContent = (data.attitude.rollspeed || 0).toFixed(2);
            this.config.infoElements.pitchSpeed.textContent = (data.attitude.pitchspeed || 0).toFixed(2);
            this.config.infoElements.yawSpeed.textContent = (data.attitude.yawspeed || 0).toFixed(2);
        }
    }

    updateRCChannels(data) {
        if (data.rcChannels) {
            this.config.infoElements.rcChan1.textContent = data.rcChannels.chan1_raw || 0;
            this.config.infoElements.rcChan2.textContent = data.rcChannels.chan2_raw || 0;
            this.config.infoElements.rcChan3.textContent = data.rcChannels.chan3_raw || 0;
            this.config.infoElements.rcChan4.textContent = data.rcChannels.chan4_raw || 0;
            this.config.infoElements.rcRssi.textContent = data.rcChannels.rssi || 0;
        }
    }

    updateVFRHUD(data) {
        if (data.vfrHud) {
            this.config.infoElements.airspeed.textContent = (data.vfrHud.airspeed || 0).toFixed(2);
            this.config.infoElements.groundspeed.textContent = (data.vfrHud.groundspeed || 0).toFixed(2);
            this.config.infoElements.heading.textContent = data.vfrHud.heading || 0;
            this.config.infoElements.throttle.textContent = data.vfrHud.throttle || 0;
            this.config.infoElements.altitude.textContent = (data.vfrHud.alt || 0).toFixed(2);
            this.config.infoElements.climb.textContent = (data.vfrHud.climb || 0).toFixed(2);
        }
    }

    calculateRequiredKeys(targetPitch, targetRoll, targetYaw) {
        const pitchDiff = targetPitch - this.currentAttitude.pitch;
        const rollDiff = targetRoll - this.currentAttitude.roll;
        const yawDiff = targetYaw - this.currentAttitude.yaw;   
        
        // Порог срабатывания увеличен для плавности
        const threshold = 0.1;
        
        // Определяем какие клавиши "нажать"
        this.keys.pitchUp = pitchDiff >= threshold;
        this.keys.pitchDown = pitchDiff <= -threshold;
        this.keys.rollRight = rollDiff >= threshold;
        this.keys.rollLeft = rollDiff <= -threshold;
        this.keys.yawRight = yawDiff >= threshold;
        this.keys.yawLeft = yawDiff <= -threshold;
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));

        const deltaTime = time - this.lastAnimationTime;
        this.lastAnimationTime = time;

        //В авторежиме плавно интерполируем к целевым значениям
        // if (this.isAutoMode) {
        //     // Обновляем targetAttitude при получении новых данных
        //     if (this.isConnected && this.lastSpeed) {
        //         this.targetAttitude = {
        //             pitch: this.lastSpeed.pitchSpeed,
        //             roll: this.lastSpeed.rollSpeed,
        //             yaw: this.lastSpeed.yawSpeed
        //         };
        //     }

        //     // Интерполяция
        //     this.currentAttitude.pitch = THREE.MathUtils.lerp(
        //         this.currentAttitude.pitch,
        //         this.targetAttitude.pitch,
        //         this.lerpFactor
        //     );
        //     this.currentAttitude.roll = THREE.MathUtils.lerp(
        //         this.currentAttitude.roll,
        //         this.targetAttitude.roll,
        //         this.lerpFactor
        //     );
        //     this.currentAttitude.yaw = THREE.MathUtils.lerp(
        //         this.currentAttitude.yaw,
        //         this.targetAttitude.yaw,
        //         this.lerpFactor
        //     );
            
        //     // Применяем интерполированные значения
        //     this.updateDroneOrientation(
        //         this.currentAttitude.pitch,
        //         this.currentAttitude.roll,
        //         this.currentAttitude.yaw,
        //         false
        //     );
        // }

        // if (this.isAutoMode && this.isConnected) {
        //     // Рассчитываем необходимые "нажатия"
        //     this.calculateRequiredKeys(
        //         this.targetAttitude.pitch,
        //         this.targetAttitude.roll,
        //         this.targetAttitude.yaw
        //     );
        // }
        
        // Обновляем управление с клавиатуры
        this.updateKeyboardControls(deltaTime);
    
        // Обрабатываем вертикальное перемещение
        this.updateDroneLift(deltaTime);
        
        if (this.propeller1 && this.propeller2 && this.propeller3 && this.propeller4 && this.propellerSpeed > 0) {
            const rotationSpeed = this.propellerSpeed * 0.01 * deltaTime * 0.1;
            
            this.propeller1.rotation.y -= rotationSpeed;
            this.propeller2.rotation.y += rotationSpeed;
            this.propeller3.rotation.y -= rotationSpeed;
            this.propeller4.rotation.y += rotationSpeed;
        }
        this.renderer.render(this.scene, this.camera);
    }

    saveSettings() {
        const settings = {
            mode: this.isAutoMode,
            droneOrientation: {
                roll: this.config.controlElements.rollControl.value,
                pitch: this.config.controlElements.pitchControl.value,
                yaw: this.config.controlElements.yawControl.value
            },
            cameraPosition: {
                x: this.config.controlElements.camX.value,
                y: this.config.controlElements.camY.value,
                z: this.config.controlElements.camZ.value
            },
            cameraRotation: {
                x: this.config.controlElements.camRotX.value,
                y: this.config.controlElements.camRotY.value,
                z: this.config.controlElements.camRotZ.value
            },
            lightPosition: {
                x: this.config.controlElements.lightX.value,
                y: this.config.controlElements.lightY.value,
                z: this.config.controlElements.lightZ.value
            },
            propellerSpeed: this.config.controlElements.propellerSpeed.value,
            modeToggle: this.config.controlElements.modeToggle.checked
        };
            
        try {
            localStorage.setItem('droneSettings', JSON.stringify(settings));
            alert('Настройки сохранены!');
        } catch (e) {
            console.error('Ошибка сохранения настроек:', e);
            alert('Ошибка сохранения настроек: ' + e.message);
        }
    }

    loadSettings() {
        let savedSettings;
        try {
            savedSettings = localStorage.getItem('droneSettings');
            if (!savedSettings) {
                alert('Сохраненные настройки не найдены');
                return;
            }
            
            const settings = JSON.parse(savedSettings);
            
            if (settings.modeToggle !== undefined) {
                this.config.controlElements.modeToggle.checked = settings.modeToggle;
                this.isAutoMode = settings.modeToggle;
                this.config.controlElements.modeText.textContent = this.isAutoMode ? 'Авто' : 'Ручной';
            }
            
            const droneControls = [
                this.config.controlElements.rollControl,
                this.config.controlElements.pitchControl,
                this.config.controlElements.yawControl
            ];
            droneControls.forEach(control => {
                control.disabled = this.isAutoMode;
            });
            
            if (settings.droneOrientation) {
                this.config.controlElements.rollControl.value = settings.droneOrientation.roll || 0;
                this.config.controlElements.rollValue.textContent = (settings.droneOrientation.roll || 0) + '°';
                this.config.controlElements.pitchControl.value = settings.droneOrientation.pitch || 0;
                this.config.controlElements.pitchValue.textContent = (settings.droneOrientation.pitch || 0) + '°';
                this.config.controlElements.yawControl.value = settings.droneOrientation.yaw || 0;
                this.config.controlElements.yawValue.textContent = (settings.droneOrientation.yaw || 0) + '°';
                
                this.updateDroneOrientation(
                    parseFloat(settings.droneOrientation.pitch || 0),
                    parseFloat(settings.droneOrientation.roll || 0),
                    parseFloat(settings.droneOrientation.yaw || 0),
                    false
                );
            }
            
            if (settings.cameraPosition) {
                ['x', 'y', 'z'].forEach(axis => {
                    const value = parseFloat(settings.cameraPosition[axis] || (axis === 'y' ? 1 : axis === 'z' ? 3 : 0));
                    this.config.controlElements[`cam${axis.toUpperCase()}`].value = value;
                    this.config.controlElements[`cam${axis.toUpperCase()}Value`].textContent = value.toFixed(1);
                    this.camera.position[axis] = value;
                });
            }
            
            if (settings.cameraRotation) {
                ['x', 'y', 'z'].forEach(axis => {
                    const value = parseFloat(settings.cameraRotation[axis] || 0);
                    this.config.controlElements[`camRot${axis.toUpperCase()}`].value = value;
                    this.config.controlElements[`camRot${axis.toUpperCase()}Value`].textContent = value.toFixed(2);
                    this.camera.rotation[axis] = value;
                });
            }
            
            if (settings.lightPosition) {
                ['x', 'y', 'z'].forEach(axis => {
                    const value = parseFloat(settings.lightPosition[axis] || 1);
                    this.config.controlElements[`light${axis.toUpperCase()}`].value = value;
                    this.config.controlElements[`light${axis.toUpperCase()}Value`].textContent = value.toFixed(1);
                    this.directionalLight.position[axis] = value;
                });
            }
            
            if (settings.propellerSpeed !== undefined) {
                const speed = parseInt(settings.propellerSpeed) || 0;
                this.config.controlElements.propellerSpeed.value = speed;
                this.config.controlElements.propellerSpeedValue.textContent = speed + '%';
                this.propellerSpeed = speed;
            }
            
            if (this.autoLoadSettings == false) 
            {
                alert('Настройки загружены!');
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
            alert('Ошибка загрузки настроек. Проверьте консоль для подробностей.');
        }
    }
}