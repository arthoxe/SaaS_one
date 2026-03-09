const { contextBridge } = require('electron')

// Expose des APIs sécurisées au renderer si besoin
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
})
