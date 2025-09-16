
import './public/styles.css';
import { DroneSimulator } from './drone-simulator/drone-simulator';
import { getSidebarLeftContent } from './ui/sidebar-left-content';

document.addEventListener('DOMContentLoaded', () => {    
    const simulator = new DroneSimulator({
        modelPath: '/src/drone-simulator/bee.glb',
        container: document.getElementById('drone-container'),
        infoElements: {
            roll: document.getElementById('roll'),
            pitch: document.getElementById('pitch'),
            yaw: document.getElementById('yaw'),
            status: document.getElementById('status-text'),
            mavlinkType: document.getElementById('mavlink-type'),
            mavlinkSysId: document.getElementById('mavlink-sysid'),
            mavlinkCompId: document.getElementById('mavlink-compid'),
            voltage: document.getElementById('voltage'),
            current: document.getElementById('current'),
            batteryRemain: document.getElementById('battery-remain'),
            load: document.getElementById('load'),
            attRoll: document.getElementById('att-roll'),
            attPitch: document.getElementById('att-pitch'),
            attYaw: document.getElementById('att-yaw'),
            rollSpeed: document.getElementById('roll-speed'),
            pitchSpeed: document.getElementById('pitch-speed'),
            yawSpeed: document.getElementById('yaw-speed'),
            rcChan1: document.getElementById('rc-chan1'),
            rcChan2: document.getElementById('rc-chan2'),
            rcChan3: document.getElementById('rc-chan3'),
            rcChan4: document.getElementById('rc-chan4'),
            rcRssi: document.getElementById('rc-rssi'),
            airspeed: document.getElementById('airspeed'),
            groundspeed: document.getElementById('groundspeed'),
            heading: document.getElementById('heading'),
            throttle: document.getElementById('throttle'),
            altitude: document.getElementById('altitude'),
            climb: document.getElementById('climb')
        },
        controlElements: {
            modeToggle: document.getElementById('mode-toggle'),
            modeText: document.getElementById('mode-text'),
            rollControl: document.getElementById('roll-control'),
            rollValue: document.getElementById('roll-value'),
            pitchControl: document.getElementById('pitch-control'),
            pitchValue: document.getElementById('pitch-value'),
            yawControl: document.getElementById('yaw-control'),
            yawValue: document.getElementById('yaw-value'),
            propellerSpeed: document.getElementById('propeller-speed'),
            propellerSpeedValue: document.getElementById('propeller-speed-value'),
            camX: document.getElementById('cam-x'),
            camXValue: document.getElementById('cam-x-value'),
            camY: document.getElementById('cam-y'),
            camYValue: document.getElementById('cam-y-value'),
            camZ: document.getElementById('cam-z'),
            camZValue: document.getElementById('cam-z-value'),
            camRotX: document.getElementById('cam-rot-x'),
            camRotXValue: document.getElementById('cam-rot-x-value'),
            camRotY: document.getElementById('cam-rot-y'),
            camRotYValue: document.getElementById('cam-rot-y-value'),
            camRotZ: document.getElementById('cam-rot-z'),
            camRotZValue: document.getElementById('cam-rot-z-value'),
            lightX: document.getElementById('light-x'),
            lightXValue: document.getElementById('light-x-value'),
            lightY: document.getElementById('light-y'),
            lightYValue: document.getElementById('light-y-value'),
            lightZ: document.getElementById('light-z'),
            lightZValue: document.getElementById('light-z-value'),
            saveSettings: document.getElementById('save-settings'),
            loadSettings: document.getElementById('load-settings'),
            splitModelToggle: document.getElementById('split-model-toggle'),
            splitModelText: document.getElementById('split-model-text'),
            flightSimulatorBtn: document.getElementById('flight-simulator-btn')
        }
    });
    simulator.init();    
})

document.addEventListener('DOMContentLoaded', () => {
    const activityManager = new ActivityManager();
    activityManager.init();
});

class ActivityManager {
    constructor() {
        this.currentActivity = 'simulation';
        this.init();
        console.log('init activity manager');
    }

    init() {
        this.setupEventListeners();
        this.loadContent('simulation');
    }

    setupEventListeners() {
        const activityButtons = document.querySelectorAll('.activity-button');

        activityButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const contentKey = e.currentTarget.dataset.content; //?
                this.switchActivity(contentKey, e.currentTarget); 
            })
        })
    }

    switchActivity(contentKey, button) {
        document.querySelectorAll('.activity-button').forEach(btn => {
            btn.classList.remove('active');
        })

        button.classList.add('active');

        this.loadContent(contentKey);

        this.currentActivity = contentKey;
    }

    loadContent(contentKey) {
        const sidebarLeft = document.getElementById('sidebar-left');

        sidebarLeft.innerHTML = '';

        const content = getSidebarLeftContent(contentKey);
        sidebarLeft.innerHTML = content;

        this.setupContentSpecificHandlers(contentKey);
    }

    setupContentSpecificHandlers(contentKey) {
        switch(contentKey) {
            case 'simulation':
                this.setupSimulationHandlers();
                break;
            case 'settings':
                this.setupSettingsHandlers();
                break;
            case 'education':
                this.setupEducationHandlers();
                break;
            case 'flying':
                this.setupFlyingHandlers();
                break;
        }
    }

    setupSimulationHandlers() {
        const speedSlider = document.getElementById('sim-speed');
        const speedValue = document.getElementById('speed-value');
        
        // if (speedSlider && speedValue) {
        //     speedSlider.addEventListener('input', (e) => {
        //         speedValue.textContent = `${e.target.value}x`;
        //     });
        // }
    }

    setupSettingsHandlers() {
        const saveBtn = document.getElementById('save-settings');
        // if (saveBtn) {
        //     saveBtn.addEventListener('click', () => {
        //         const udpPort = document.getElementById('udp-port').value;
        //         console.log('Сохранение настроек, порт:', udpPort);
        //         // Здесь можно добавить логику сохранения настроек
        //     });
        // }
    }

    setupEducationHandlers() {
        const lessonButtons = document.querySelectorAll('.lesson-btn');
        // lessonButtons.forEach(btn => {
        //     btn.addEventListener('click', (e) => {
        //         const lesson = e.target.dataset.lesson;
        //         console.log('Выбран урок:', lesson);
        //         // Логика загрузки урока
        //     });
        // });
    }

    setupFlyingHandlers() {
        const takeoffBtn = document.getElementById('takeoff');
        const landBtn = document.getElementById('land');
        
        // if (takeoffBtn) {
        //     takeoffBtn.addEventListener('click', () => {
        //         console.log('Команда взлета');
        //     });
        // }
        
        // if (landBtn) {
        //     landBtn.addEventListener('click', () => {
        //         console.log('Команда посадки');
        //     });
        // }
    }
}

