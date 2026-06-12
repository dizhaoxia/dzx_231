import { create } from 'zustand'
import { storage } from '../utils/storage'

const defaultSettings = {
  fontSize: 'medium',
  theme: 'light',
  timerStyle: 'digital',
  shortcuts: {
    prevQuestion: 'ArrowLeft',
    nextQuestion: 'ArrowRight',
    submit: 'Enter',
    toggleMark: 'Ctrl+M'
  },
  shuffleQuestions: false,
  shuffleOptions: false,
  autoSaveInterval: 10,
  showAnswerInstantly: true,
  showHighFrequencyTips: true,
  examRecoveryEnabled: true,
  practiceProgressEnabled: true
}

const fontSizeMap = {
  small: { question: '14px', option: '13px', title: '16px' },
  medium: { question: '16px', option: '15px', title: '20px' },
  large: { question: '18px', option: '17px', title: '24px' },
  xlarge: { question: '20px', option: '19px', title: '28px' }
}

export const useSettingsStore = create((set, get) => ({
  settings: defaultSettings,
  isLoading: true,

  init: async () => {
    const saved = await storage.get('userSettings', null)
    if (saved) {
      set({
        settings: {
          ...defaultSettings,
          ...saved,
          shortcuts: { ...defaultSettings.shortcuts, ...(saved.shortcuts || {}) }
        },
        isLoading: false
      })
    } else {
      set({ settings: defaultSettings, isLoading: false })
    }
  },

  updateSetting: async (key, value) => {
    const { settings } = get()
    const newSettings = { ...settings, [key]: value }
    await storage.set('userSettings', newSettings)
    set({ settings: newSettings })
    return newSettings
  },

  updateShortcut: async (key, value) => {
    const { settings } = get()
    const newSettings = {
      ...settings,
      shortcuts: { ...settings.shortcuts, [key]: value }
    }
    await storage.set('userSettings', newSettings)
    set({ settings: newSettings })
    return newSettings
  },

  resetSettings: async () => {
    await storage.set('userSettings', defaultSettings)
    set({ settings: defaultSettings })
    return defaultSettings
  },

  getFontSize: () => {
    const { settings } = get()
    return fontSizeMap[settings.fontSize] || fontSizeMap.medium
  },

  getShortcutDisplay: (key) => {
    const { settings } = get()
    const shortcut = settings.shortcuts[key]
    if (!shortcut) return ''
    return shortcut.replace('Ctrl+', 'Ctrl + ').replace('Alt+', 'Alt + ').replace('Shift+', 'Shift + ')
  }
}))

export { fontSizeMap }
