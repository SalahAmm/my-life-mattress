import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, IpcResult } from '@shared/ipc'

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, payload)) as IpcResult<T>
  if (!result.ok) {
    const error = new Error(result.error.message) as Error & { code?: string }
    error.code = result.error.code
    throw error
  }
  return result.data
}

const api: ElectronAPI = {
  auth: {
    status: () => invoke('auth:status'),
    setupOwner: (input) => invoke('auth:setupOwner', input),
    login: (username, password) => invoke('auth:login', { username, password }),
    logout: () => invoke('auth:logout'),
    recoverOwner: (input) => invoke('auth:recoverOwner', input),
  },
  products: {
    list: () => invoke('products:list'),
    listFull: () => invoke('products:listFull'),
    topSellers: () => invoke('products:topSellers'),
    create: (input) => invoke('products:create', input),
    update: (input) => invoke('products:update', input),
    deactivate: (id) => invoke('products:deactivate', id),
    uploadImage: () => invoke('products:uploadImage'),
  },
  suppliers: {
    list: () => invoke('suppliers:list'),
    create: (input) => invoke('suppliers:create', input),
    setActive: (input) => invoke('suppliers:setActive', input),
  },
  categories: {
    list: () => invoke('categories:list'),
  },
  stock: {
    restock: (input) => invoke('stock:restock', input),
    adjust: (input) => invoke('stock:adjust', input),
    movements: (productVariantId) => invoke('stock:movements', productVariantId),
  },
  sales: {
    create: (payload) => invoke('sales:create', payload),
    get: (id) => invoke('sales:get', id),
    recent: (limit) => invoke('sales:recent', limit),
    list: (input) => invoke('sales:list', input),
    addPayment: (input) => invoke('sales:addPayment', input),
    setStatus: (input) => invoke('sales:setStatus', input),
    cancel: (input) => invoke('sales:cancel', input.saleId),
  },
  printing: {
    printReceipt: (saleId) => invoke('printing:printReceipt', saleId),
    printInBrowser: (saleId) => invoke('printing:printInBrowser', saleId),
    printReport: (range, rangeLabel) => invoke('printing:printReport', { range, rangeLabel }),
    printReportInBrowser: (range, rangeLabel) => invoke('printing:printReportInBrowser', { range, rangeLabel }),
  },
  files: {
    saveCsv: (input) => invoke('files:saveCsv', input),
  },
  settings: {
    get: () => invoke('settings:get'),
    updateReceipt: (input) => invoke('settings:updateReceipt', input),
    uploadLogo: () => invoke('settings:uploadLogo'),
  },
  reports: {
    summary: (range) => invoke('reports:summary', range),
    sales: (range) => invoke('reports:sales', range),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
