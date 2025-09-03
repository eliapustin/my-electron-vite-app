/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './public/styles.css';
import { DroneSimulator } from './drone-simulator';

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