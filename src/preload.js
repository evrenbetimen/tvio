'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tvio', {
  platform: process.platform,

  fetchPlaylist: (url) => ipcRenderer.invoke('playlist:fetch', url),
  parsePlaylist: (text) => ipcRenderer.invoke('playlist:parse', text),
  openLocalPlaylist: () => ipcRenderer.invoke('playlist:openLocal'),

  setStreamHeaders: (url, ua) => ipcRenderer.invoke('player:headers', { url, ua }),

  windowAction: (action) => ipcRenderer.invoke('win:action', action),
  onFullscreen: (cb) => ipcRenderer.on('win:fullscreen', (_e, v) => cb(v)),

  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  clearCache: () => ipcRenderer.invoke('app:clearCache'),
});
