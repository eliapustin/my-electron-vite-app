import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {UDPServer} from './udp-server/udp-server'
import {Database} from './database/database';

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
let makeLessonWindow;
let db;

function createMainWindow() {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    title: "АТС Симулятор",
    width: 1280,
    height: 1024,
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
  // if (isDev) mainWindow.webContents.openDevTools();

  // Инициализируем UDP сервер после загрузки окна.
  mainWindow.webContents.on('did-finish-load', () => {
    udpServer = new UDPServer(mainWindow);
    udpServer.start();
  })

  // Инициализируем базу данных
  db = new Database();
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

function createMakeLessonWindow() {
  // Создаем окно браузера
  makeLessonWindow = new BrowserWindow({
    title: 'Создать урок',
    width: 1024,
    height: 768,
    icon: 'src/assets/icon/v2_colour_64x64_8bit.ico',
    resizable: true,
    autoHideMenuBar: true,
  });

  makeLessonWindow.loadFile('make_lesson.html');
}

// Данный метод будет вызван, когда Electron завершит
// процесс инициализации и будет готов к созданию окна браузера.
// Некоторые API могут быть недоступны до этого момента.
app.whenReady().then(() => {
  // dark mode
  nativeTheme.themeSource = 'dark';

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
  },
  {
    label: 'Обучение',
    submenu: [
      {
        label: 'Создать урок',
        click: createMakeLessonWindow
      }
    ]
  }
]

// для Mac:
if (isMac) {
  menu.unshift({role: 'appMenu'})
}

// Обработчики событий IPC Для работы с базой данных
ipcMain.handle('get-all-lessons', async () => {
  return new Promise((resolve, reject) => {
    db.getAllLessons((err, lessons) => {
      if (err) reject(err);
      else resolve(lessons);
    });
  });
});

ipcMain.handle('get-lesson', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.getLesson(id, (err, lesson) => {
      if (err) reject(err);
      else resolve(lesson);
    });
  });
});

ipcMain.handle('save-lesson', async (event, title, content) => {
  return new Promise((resolve, reject) => {
    db.saveLesson(title, content, (err, id) => {
      if (err) reject(err);
      else resolve(id);
    });
  });
});

ipcMain.handle('update-lesson', async (event, id, title, content) => {
  return new Promise((resolve, reject) => {
    db.updateLesson(id, title, content, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

ipcMain.handle('delete-lesson', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.deleteLesson(id, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

ipcMain.handle('save-annotation', async (event, lessonId, selectedText, annotationText) => {
  return new Promise((resolve, reject) => {
    db.saveAnnotation(lessonId, selectedText, annotationText, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

ipcMain.handle('get-annotations', async (event, lessonId) => {
  return new Promise((resolve, reject) => {
    db.getAnnotations(lessonId, (err, annotations) => {
      if (err) reject(err);
      else resolve(annotations);
    });
  });
});

ipcMain.handle('export-data', async () => {
  return new Promise((resolve, reject) => {
    db.exportData((err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
});

ipcMain.handle('import-data', async (event, jsonData) => {
  return new Promise((resolve, reject) => {
    db.importData(jsonData, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

// Обработчик для выбора файла импорта/экспорта
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
})

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
})

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
  if (db) {
    db.close();
  }
});
