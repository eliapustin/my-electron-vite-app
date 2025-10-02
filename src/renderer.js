
import './public/css/styles.css';
import './public/css/custom.css';
import { DroneSimulator } from './drone-simulator/drone-simulator';
import { getHeaderContent } from './ui/header-content';
import { EducationEditor } from './education-editor/education-editor';

document.addEventListener('DOMContentLoaded', () => {    
    const simulator = new DroneSimulator({
        modelPath: '/src/drone-simulator/bee.glb',
        container: document.getElementById('drone-container'),
        infoElements: {
            roll: document.getElementById('roll') || 0,
            pitch: document.getElementById('pitch') || 0,
            yaw: document.getElementById('yaw') || 0,
            status: document.getElementById('status-text') || 0,
            mavlinkType: document.getElementById('mavlink-type') || 0,
            mavlinkSysId: document.getElementById('mavlink-sysid') || 0,
            mavlinkCompId: document.getElementById('mavlink-compid') || 0,
            voltage: document.getElementById('voltage') || 0,
            current: document.getElementById('current') || 0,
            batteryRemain: document.getElementById('battery-remain') || 0,
            load: document.getElementById('load') || 0,
            attRoll: document.getElementById('att-roll') || 0,
            attPitch: document.getElementById('att-pitch') || 0,
            attYaw: document.getElementById('att-yaw') || 0,
            rollSpeed: document.getElementById('roll-speed') || 0,
            pitchSpeed: document.getElementById('pitch-speed') || 0,
            yawSpeed: document.getElementById('yaw-speed') || 0,
            rcChan1: document.getElementById('rc-chan1') || 0,
            rcChan2: document.getElementById('rc-chan2') || 0,
            rcChan3: document.getElementById('rc-chan3') || 0,
            rcChan4: document.getElementById('rc-chan4') || 0,
            rcRssi: document.getElementById('rc-rssi') || 0,
            airspeed: document.getElementById('airspeed') || 0,
            groundspeed: document.getElementById('groundspeed') || 0,
            heading: document.getElementById('heading') || 0,
            throttle: document.getElementById('throttle') || 0,
            altitude: document.getElementById('altitude') || 0,
            climb: document.getElementById('climb') || 0
        },
        controlElements: {
            modeToggle: document.getElementById('mode-toggle') || 0,
            modeText: document.getElementById('mode-text') || 0,
            rollControl: document.getElementById('roll-control') || 0,
            rollValue: document.getElementById('roll-value') || 0,
            pitchControl: document.getElementById('pitch-control') || 0,
            pitchValue: document.getElementById('pitch-value') || 0,
            yawControl: document.getElementById('yaw-control') || 0,
            yawValue: document.getElementById('yaw-value') || 0,
            propellerSpeed: document.getElementById('propeller-speed') || 0,
            propellerSpeedValue: document.getElementById('propeller-speed-value') || 0,
            camX: document.getElementById('cam-x') || 0,
            camXValue: document.getElementById('cam-x-value') || 0,
            camY: document.getElementById('cam-y') || 0,
            camYValue: document.getElementById('cam-y-value') || 0,
            camZ: document.getElementById('cam-z') || 0,
            camZValue: document.getElementById('cam-z-value') || 0,
            camRotX: document.getElementById('cam-rot-x') || 0,
            camRotXValue: document.getElementById('cam-rot-x-value') || 0,
            camRotY: document.getElementById('cam-rot-y') || 0,
            camRotYValue: document.getElementById('cam-rot-y-value') || 0,
            camRotZ: document.getElementById('cam-rot-z') || 0,
            camRotZValue: document.getElementById('cam-rot-z-value') || 0,
            lightX: document.getElementById('light-x') || 0,
            lightXValue: document.getElementById('light-x-value') || 0,
            lightY: document.getElementById('light-y') || 0,
            lightYValue: document.getElementById('light-y-value') || 0,
            lightZ: document.getElementById('light-z') || 0,
            lightZValue: document.getElementById('light-z-value') || 0,
            saveSettings: document.getElementById('save-settings') || 0,
            loadSettings: document.getElementById('load-settings') || 0,
            splitModelToggle: document.getElementById('split-model-toggle') || 0,
            splitModelText: document.getElementById('split-model-text') || 0,
            flightSimulatorBtn: document.getElementById('flight-simulator-btn') || 0
        }
    });
    simulator.init();    
})

document.addEventListener('DOMContentLoaded', () => {
    const activityManager = new ActivityManager();
    const educationEditor = new EducationEditor();
});

class ActivityManager {
    constructor() {
        this.currentActivity = 'simulation';
        this.init();
        console.log('init activity manager');
    }

    init() {
        this.setupEventListeners();
        this.setSideBarLeftContent('simulation');
        this.setSideBarRightContent('simulation');
        this.switchHeaderContent('simulation');
    }

    setupEventListeners() {
        const activityButtons = document.querySelectorAll('.activity-button');

        activityButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const contentKey = e.currentTarget.dataset.content; //?
                this.switchActivity(contentKey, e.currentTarget); 

                this.switchHeaderContent(contentKey);
                this.setSideBarLeftContent(contentKey);
                this.setSideBarRightContent(contentKey);
                this.setupContentSpecificHandlers(contentKey);
            })
        })
    }

    switchHeaderContent(contentKey) {
        const header = document.getElementById('header-content');
        header.innerHTML = getHeaderContent(contentKey);
    }

    switchActivity(contentKey, button) {
        document.querySelectorAll('.activity-button').forEach(btn => {
            btn.classList.remove('active');
        })

        button.classList.add('active');
        this.currentActivity = contentKey;

        // Переключаем отображение контента
        if (contentKey === 'education') {
            document.getElementById('drone-container').style.display = 'none';
            document.getElementById('education-content').style.display = 'block';    
        } else {
            document.getElementById('drone-container').style.display = 'block';
            document.getElementById('education-content').style.display = 'none';  
                  
            const modal = document.getElementById('editor-modal');
            modal.style.display = 'none';
        }
    }

    setSideBarLeftContent(contentKey) {
        // Скрываем все accordion-body
        document.querySelectorAll('.accordion.accordion-flush').forEach(accordion => {
            accordion.classList.add('d-none');
        });

        // Показываем только нужный accordion-блок
        const targetAccordion = document.querySelector(`.accordion.accordion-flush[data-content="${contentKey}"]`);
        if (targetAccordion) {
            targetAccordion.classList.remove("d-none");

            // Закрываем все секции в показываемом accordion
            const collapses = targetAccordion.querySelectorAll('.accrodion-collapse');
            const buttons = targetAccordion.querySelectorAll('.accrodion-button');

            collapses.forEach(collapse => collapse.classList.remove('show'));
            buttons.forEach(button => {
                button.classList.add('collapsed');
                button.setAttribute('aria-expanded', 'false');
            });
        }
    }

    setSideBarRightContent(contentKey) {
        const sideBarRight = document.getElementById('drone-orientation');
        if (contentKey === 'education') {
            sideBarRight.classList.add('d-none');
        } else {
            sideBarRight.classList.remove('d-none');
        }
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
    }

    setupSettingsHandlers() {        
    }

    setupEducationHandlers() {
    }

    setupFlyingHandlers() {
    }
}

