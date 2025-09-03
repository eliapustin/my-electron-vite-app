import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {UDPServer} from './udp-server'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let udpServer;

const createWindow = () => {
  // Создаем окно браузера
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // и загружаем index.html-файл приложения.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Открываем окно разработчика (если требуется).
  // mainWindow.webContents.openDevTools();

  // Инициализируем UDP сервер после загрузки окна.
  mainWindow.webContents.on('did-finish-load', () => {
    udpServer = new UDPServer(mainWindow);
    udpServer.start();
  })
};

// Данный метод будет вызван, когда Electron завершит
// процесс инициализации и будет готов к созданию окна браузера.
// Некоторые API могут быть недоступны до этого момента.
app.whenReady().then(() => {
  createWindow();

  // На ОС X этот метод пересоздает окно при нажатии на 
  // иконку в doc и в случае, если нет других открытых окон.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выход из приложения при закрытии всех окон. Работает на всех ОС кроме macOS.
// В macOS, даже при закрытии всех окон приложение все равно остается активным,
// пока пользователь не нажмет Ctrl + Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (udpServer) {
    udpServer.stop();
  }
});
