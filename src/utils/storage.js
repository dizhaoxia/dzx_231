const isElectron = window.electronAPI && typeof window.electronAPI.getStoreData === 'function'

let writeQueue = []
let writeInProgress = false

async function processWriteQueue() {
  if (writeInProgress || writeQueue.length === 0) return
  writeInProgress = true

  while (writeQueue.length > 0) {
    const { key, value, resolve, reject } = writeQueue.shift()
    if (isElectron) {
      try {
        await window.electronAPI.setStoreData(key, value)
        resolve(true)
      } catch (e) {
        console.error('Electron storage set error:', e)
        resolve(false)
      }
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        resolve(true)
      } catch (e) {
        console.error('LocalStorage set error:', e)
        resolve(false)
      }
    }
  }

  writeInProgress = false
}

export const storage = {
  async get(key, defaultValue = null) {
    if (isElectron) {
      try {
        const data = await window.electronAPI.getStoreData(key)
        return data !== undefined ? data : defaultValue
      } catch (e) {
        console.error('Electron storage get error:', e)
        return defaultValue
      }
    } else {
      try {
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : defaultValue
      } catch (e) {
        console.error('LocalStorage get error:', e)
        return defaultValue
      }
    }
  },

  async set(key, value) {
    return new Promise((resolve) => {
      writeQueue.push({ key, value, resolve, reject: resolve })
      processWriteQueue()
    })
  },

  async getAll() {
    if (isElectron) {
      try {
        return await window.electronAPI.getAllData()
      } catch (e) {
        console.error('Electron storage getAll error:', e)
        return null
      }
    } else {
      return {
        categories: JSON.parse(localStorage.getItem('categories') || 'null'),
        questions: JSON.parse(localStorage.getItem('questions') || 'null'),
        wrongQuestions: JSON.parse(localStorage.getItem('wrongQuestions') || 'null'),
        examRecords: JSON.parse(localStorage.getItem('examRecords') || 'null')
      }
    }
  }
}

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
