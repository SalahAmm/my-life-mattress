import type { ElectronAPI } from '@shared/ipc'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export const api: ElectronAPI = new Proxy({} as ElectronAPI, {
  get: (_target, prop: keyof ElectronAPI) => {
    const electronAPI = window.electronAPI
    if (!electronAPI) {
      throw new Error('window.electronAPI is not available')
    }
    return electronAPI[prop]
  },
})
