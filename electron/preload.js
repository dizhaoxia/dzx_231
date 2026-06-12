const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getStoreData: (key) => ipcRenderer.invoke('get-store-data', key),
  setStoreData: (key, value) => ipcRenderer.invoke('set-store-data', key, value),
  getAllData: () => ipcRenderer.invoke('get-all-data')
})
