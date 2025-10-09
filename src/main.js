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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    parent: mainWindow // Делаем окно модальным
  });

  makeLessonWindow.loadFile('make_lesson.html');

  // Передаем ссылку на окно создания уроков в главное окно
  // mainWindow.makeLessonWindow = makeLessonWindow;
  
  makeLessonWindow.on('closed', () => {
    makeLessonWindow = null;
    if (mainWindow) {
      mainWindow.makeLessonWindow = null;
    }
  });
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

// ИСПРАВЛЕННЫЙ ОБРАБОТЧИК - теперь принимает 3 параметра
ipcMain.handle('save-lesson', async (event, id, title, content) => {
  return new Promise((resolve, reject) => {
    db.saveLesson(id, title, content, (err, lessonId) => {
      if (err) reject(err);
      else resolve(lessonId);
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

// обработчик для открытия окна создания урока
ipcMain.handle('open-make-lesson-window', async () => {
  if (!makeLessonWindow) {
    createMakeLessonWindow();
  } else {
    makeLessonWindow.focus();
  }
  return true;
});

// обработчик для получения структуры курсов
ipcMain.handle('get-courses-structure', async () => {
  return new Promise((resolve, reject) => {
    db.getAllLessons((err, lessons) => {
      if (err) reject(err);
      else {
        // Организуем уроки по структуре
        const courses = [];
        lessons.forEach(lesson => {
          const idParts = lesson.id.split('.');
          if (idParts.length === 3) {
            const [chapter, topic, lessonNum] = idParts.map(Number);
            
            let course = courses.find(c => c.chapter === chapter);
            if (!course) {
              course = { 
                chapter: chapter, 
                chapterName: `Глава ${chapter}`, 
                topics: [] 
              };
              courses.push(course);
            }
            
            let topicObj = course.topics.find(t => t.topic === topic);
            if (!topicObj) {
              topicObj = { 
                topic: topic, 
                topicName: `Тема ${topic}`, 
                lessons: [] 
              };
              course.topics.push(topicObj);
            }
            
            topicObj.lessons.push({
              id: lesson.id,
              number: lessonNum,
              title: lesson.title
            });
          }
        });
        
        // Сортируем
        courses.sort((a, b) => a.chapter - b.chapter);
        courses.forEach(course => {
          course.topics.sort((a, b) => a.topic - b.topic);
          course.topics.forEach(topic => {
            topic.lessons.sort((a, b) => a.number - b.number);
          });
        });
        
        resolve(courses);
      }
    });
  });
});

ipcMain.handle('update-chapter-name', async (event, chapter, newName) => {
  return new Promise((resolve, reject) => {
    // Здесь нужно обновить все уроки этой главы
    // Это сложная операция, требующая обновления всех ID уроков
    // Для простоты можно хранить названия глав в отдельной таблице
    resolve();
  });
});

ipcMain.handle('update-topic-name', async (event, chapter, topic, newName) => {
  return new Promise((resolve, reject) => {
    // Аналогично для тем
    resolve();
  });
});

ipcMain.handle('move-lesson', async (event, oldId, newChapter, newTopic, newLessonNum) => {
  return new Promise((resolve, reject) => {
    const newId = `${newChapter}.${newTopic}.${newLessonNum}`;
    
    // Получаем данные урока
    db.getLesson(oldId, (err, lesson) => {
      if (err) reject(err);
      
      // Сохраняем с новым ID
      db.saveLesson(newId, lesson.title, lesson.content, (err) => {
        if (err) reject(err);
        
        // Удаляем старый урок
        db.deleteLesson(oldId, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    });
  });
});

// Выход из приложения при закрытии всех окон. Работает на всех ОС кроме macOS.
// В macOS, даже при закрытии всех окон приложения все равно остается активным,
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