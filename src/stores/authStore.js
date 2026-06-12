import { create } from 'zustand'
import { storage } from '../utils/storage'

export const useAuthStore = create((set, get) => ({
  role: null,
  isLoading: true,

  init: async () => {
    const savedRole = await storage.get('role', null)
    set({ role: savedRole, isLoading: false })
  },

  setRole: async (role) => {
    await storage.set('role', role)
    set({ role })
  },

  logout: async () => {
    await storage.set('role', null)
    set({ role: null })
  },

  isAdmin: () => get().role === 'admin',
  isStudent: () => get().role === 'student'
}))
