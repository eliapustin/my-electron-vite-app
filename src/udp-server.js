const dgram = require('dgram')
const clients = new Set();

const UDP_PORT = 14550;

/**
 * Создает класс UDP-сервера
 */
export class UdpServer {
    /**
     * 
     * @param {*} mainWindow 
     */
    constructor(mainWindow) {
        this.udpServer = dgram.createSocket('udp4');
        this.mainWindow = mainWindow;
        this.UDP_PORT = UDP_PORT;
    }

    /**
     * 
     */
    start() {
        this.udpServer.bind(UDP_PORT, () => {
            console.log(`UDP server listening on port ${UDP_PORT}`);
        })

        this.udpServer.on('message', (msg, info) => {
            try {
                const data = parseMAVLink(msg);
                if (data && this.mainWindow) {
                    const jsonData = JSON.stringify(data);
                    clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(jsonData);
                        }
                    })
                    // this.mainWindow.webContents.send('mavlink-data', data);
                }
            } catch (e) {
                console.error(`Error parsing mavlink message:`, e);
            }
        })
    }

    /**
     * 
     * @param {*} buffer 
     * @returns 
     */
    parseMAVLink(buffer) {
        if (buffer.length < 8) return null;
        if (buffer[0] !== 0xFE) return null;

        const len = buffer[1];
        const seq = buffer[2];
        const sysid = buffer[3];
        const compid = buffer[4];
        const msgId = buffer[5];
        const payload = buffer.slice(6, 6 + len);
        const crc = buffer.slice(6 + len, 8 + len);
        
        const MAV_MSG_TYPES = {
            1: 'SYS_STATUS',
            30: 'ATTITUDE',
            35: 'RC_CHANNELS_RAW',
            74: 'VFR_HUD'
        };

        const result = {
            msgId,
            type: MAV_MSG_TYPES[msgId] || `UNKNOWN_${msgId}`,
            sysid,
            compid
        };

        // SYS_STATUS (ID=1)
        if (msgId === 1) {
            result.sysStatus = {
            onboard_control_sensors_present: payload.readUInt32LE(0),
            onboard_control_sensors_enabled: payload.readUInt32LE(4),
            onboard_control_sensors_health: payload.readUInt32LE(8),
            load: payload.readUInt16LE(12),
            voltage_battery: payload.readUInt16LE(14) / 1000,
            current_battery: payload.readInt16LE(16) / 100,
            battery_remaining: payload.readInt8(18),
            drop_rate_comm: payload.readUInt16LE(19),
            errors_comm: payload.readUInt16LE(21),
            errors_count1: payload.readUInt16LE(23),
            errors_count2: payload.readUInt16LE(25),
            errors_count3: payload.readUInt16LE(27),
            errors_count4: payload.readUInt16LE(29)
            };
        }

        // ATTITUDE (ID=30)
        if (msgId === 30) {
            const PI = 3.14159;
            result.attitude = {
            time_boot_ms: payload.readUInt32LE(0),
            roll: payload.readFloatLE(4) * (180.0 / PI),
            pitch: payload.readFloatLE(8) * (-1.0) * (180.0 / PI),
            yaw: payload.readFloatLE(12) * (180.0 / PI),
            rollspeed: payload.readFloatLE(16),
            pitchspeed: payload.readFloatLE(20),
            yawspeed: payload.readFloatLE(24)
            };
        }

        // RC_CHANNELS_RAW (ID=35)
        if (msgId === 35) {
            result.rcChannels = {
            time_boot_ms: payload.readUInt32LE(0),
            port: payload.readUInt8(4),
            chan1_raw: payload.readUInt16LE(5),
            chan2_raw: payload.readUInt16LE(7),
            chan3_raw: payload.readUInt16LE(9),
            chan4_raw: payload.readUInt16LE(11),
            chan5_raw: payload.readUInt16LE(13),
            chan6_raw: payload.readUInt16LE(15),
            chan7_raw: payload.readUInt16LE(17),
            chan8_raw: payload.readUInt16LE(19),
            rssi: payload.readUInt8(21)
            };
        }

        // VFR_HUD (ID=74)
        if (msgId === 74) {
            result.vfrHud = {
            airspeed: payload.readFloatLE(0),
            groundspeed: payload.readFloatLE(4),
            heading: payload.readInt16LE(8),
            throttle: payload.readUInt16LE(10),
            alt: payload.readFloatLE(12),
            climb: payload.readFloatLE(16)
            };
        }

        return result;
    }

    stop() {
        this.udpServer.close();
    }
}