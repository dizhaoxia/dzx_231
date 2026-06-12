const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Store = require('electron-store')

app.commandLine.appendSwitch('--no-sandbox')
app.commandLine.appendSwitch('--disable-gpu')
app.commandLine.appendSwitch('--disable-software-rasterizer')

const store = new Store({
  name: 'quiz-data',
  defaults: {
    categories: [
      { id: '1', name: '计算机基础' },
      { id: '2', name: '数据结构' },
      { id: '3', name: '操作系统' }
    ],
    questions: [
      {
        id: 'q1',
        categoryId: '1',
        type: 'single',
        question: '计算机的中央处理器简称是什么？',
        options: ['CPU', 'GPU', 'RAM', 'ROM'],
        answer: ['A'],
        explanation: 'CPU是Central Processing Unit的缩写，即中央处理器，是计算机的核心运算和控制部件。'
      },
      {
        id: 'q2',
        categoryId: '1',
        type: 'multiple',
        question: '以下哪些是计算机的输入设备？',
        options: ['键盘', '鼠标', '显示器', '扫描仪'],
        answer: ['A', 'B', 'D'],
        explanation: '键盘、鼠标和扫描仪属于输入设备，显示器属于输出设备。'
      },
      {
        id: 'q3',
        categoryId: '1',
        type: 'judge',
        question: '计算机病毒只存在于可执行文件中。',
        options: ['正确', '错误'],
        answer: ['B'],
        explanation: '计算机病毒不仅存在于可执行文件中，还可以存在于文档、宏、脚本等多种文件中。'
      },
      {
        id: 'q4',
        categoryId: '2',
        type: 'single',
        question: '下列哪种数据结构是先进先出(FIFO)的？',
        options: ['栈', '队列', '树', '图'],
        answer: ['B'],
        explanation: '队列是先进先出(FIFO)的数据结构，栈是后进先出(LIFO)的数据结构。'
      },
      {
        id: 'q5',
        categoryId: '2',
        type: 'multiple',
        question: '以下哪些是线性数据结构？',
        options: ['数组', '链表', '二叉树', '栈'],
        answer: ['A', 'B', 'D'],
        explanation: '数组、链表和栈都是线性数据结构，二叉树是非线性数据结构。'
      },
      {
        id: 'q6',
        categoryId: '3',
        type: 'single',
        question: '操作系统的主要功能不包括以下哪项？',
        options: ['进程管理', '内存管理', '设备管理', '编译程序'],
        answer: ['D'],
        explanation: '操作系统的主要功能包括进程管理、内存管理、文件管理和设备管理等，编译程序是系统软件，不属于操作系统的核心功能。'
      },
      {
        id: 'q7',
        categoryId: '3',
        type: 'judge',
        question: '进程和线程是同一个概念。',
        options: ['正确', '错误'],
        answer: ['B'],
        explanation: '进程是资源分配的基本单位，线程是CPU调度的基本单位，一个进程可以包含多个线程。'
      }
    ],
    wrongQuestions: [],
    examRecords: []
  }
})

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '题库刷题软件',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('get-store-data', (event, key) => {
  return store.get(key)
})

ipcMain.handle('set-store-data', (event, key, value) => {
  store.set(key, value)
  return true
})

ipcMain.handle('get-all-data', () => {
  return {
    categories: store.get('categories'),
    questions: store.get('questions'),
    wrongQuestions: store.get('wrongQuestions'),
    examRecords: store.get('examRecords')
  }
})
