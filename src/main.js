import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {UDPServer} from './udp-server/udp-server'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

process.env.NODE_ENV = 'development'
const isDev = process.env.NODE_ENV !== 'production' ? true : false
const isMac = process.platform === 'darwin' ? true : false

let udpServer;
let mainWindow;
let aboutWindow;

function createMainWindow() {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    title: "АТС Симулятор",
    width: 800,
    height: 600,
    icon: 'src/assets/icon/v2_colour_64x64_8bit.ico',
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
  mainWindow.webContents.openDevTools();

  // Инициализируем UDP сервер после загрузки окна.
  mainWindow.webContents.on('did-finish-load', () => {
    udpServer = new UDPServer(mainWindow);
    udpServer.start();
  })
};

function createAboutWindow() {
  // Создаем окно браузера
  aboutWindow = new BrowserWindow({
    title: 'О программе АТС Симулятор',
    width: 600,
    height: 300,
    icon: 'src/assets/icon/v2_colour_64x64_8bit.ico',
    resizable: false,
    autoHideMenuBar: true,
  });

  aboutWindow.loadFile('about.html');
};

// Данный метод будет вызван, когда Electron завершит
// процесс инициализации и будет готов к созданию окна браузера.
// Некоторые API могут быть недоступны до этого момента.
app.whenReady().then(() => {
  createMainWindow();

  // Создаем меню
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu)

  // Global shortcuts
  // globalShortcut.register('CmdOrCtrl+R', () => mainWindow.reload())
  // globalShortcut.register(isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I', () => mainWindow.toggleDevTools())

  // На ОС X этот метод пересоздает окно при нажатии на 
  // иконку в doc и в случае, если нет других открытых окон.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});


// Создаем опции для меню
const menu = [
  // {role: 'appMenu'}
  ... (isMac ? [{role: 'appMenu'}] : []),
  // {role: 'fileMenu'}
  {
    label: 'Файл',
    submenu: [
      {
        label: 'Выйти',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit()
      }
    ]
  },
  ...(isDev ? [
    {
      label: 'Разработчик',
      submenu: [
        { role: 'reload'},
        { role: 'forcereload'},
        { type: 'separator'},
        { role: 'toggledevtools'},
      ]
    }
  ] : []),
  // {role: 'modeMenu'}
  {
    label: 'Режим',
    submenu: [
      {
        label: 'Обучение',
        // click: () => app.quit()
      },
      {
        label: 'Полёт',
        submenu: [
          {
            label: 'Авто'
          },              
          {
            label: 'Ручной'
          }
        ]
      }
    ]
  },
  // {role: 'helpMenu'}
  {
    label: 'Помощь',
    submenu: [
      {
        label: 'О программе',
        click: createAboutWindow
      }
    ]
  }
]

// для Mac:
if (isMac) {
  menu.unshift({role: 'appMenu'})
}


// Выход из приложения при закрытии всех окон. Работает на всех ОС кроме macOS.
// В macOS, даже при закрытии всех окон приложение все равно остается активным,
// пока пользователь не нажмет Ctrl + Q
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
  if (udpServer) {
    udpServer.stop();
  }
});
