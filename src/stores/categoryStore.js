import { create } from 'zustand'
import { storage, generateId } from '../utils/storage'

const defaultCategories = [
  { id: '1', name: '计算机基础', parentId: null, sort: 0, enabled: true },
  { id: '2', name: '数据结构', parentId: null, sort: 1, enabled: true },
  { id: '3', name: '操作系统', parentId: null, sort: 2, enabled: true }
]

export const useCategoryStore = create((set, get) => ({
  categories: [],
  selectedCategoryId: null,
  isLoading: true,

  init: async () => {
    let categories = await storage.get('categories', null)
    if (!categories || categories.length === 0) {
      categories = defaultCategories
      await storage.set('categories', categories)
    }
    const migrated = categories.map(c => ({
      parentId: null,
      sort: 0,
      enabled: true,
      ...c
    }))
    if (JSON.stringify(migrated) !== JSON.stringify(categories)) {
      await storage.set('categories', migrated)
    }
    set({
      categories: migrated,
      selectedCategoryId: migrated[0]?.id || null,
      isLoading: false
    })
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId })
  },

  addCategory: async (name, parentId = null) => {
    const { categories } = get()
    const exists = categories.some(c => c.name === name && c.parentId === parentId)
    if (exists) {
      return { success: false, message: '分类名称已存在' }
    }
    const maxSort = categories
      .filter(c => c.parentId === parentId)
      .reduce((max, c) => Math.max(max, c.sort || 0), -1)
    const newCategory = {
      id: generateId(),
      name,
      parentId,
      sort: maxSort + 1,
      enabled: true
    }
    const newCategories = [...categories, newCategory]
    await storage.set('categories', newCategories)
    set({ categories: newCategories })
    return { success: true, category: newCategory }
  },

  updateCategory: async (id, updates) => {
    const { categories } = get()
    const name = typeof updates === 'string' ? updates : updates.name
    const otherFields = typeof updates === 'string' ? {} : updates
    const exists = categories.some(c => c.name === name && c.id !== id)
    if (exists && name) {
      return { success: false, message: '分类名称已存在' }
    }
    const newCategories = categories.map(c =>
      c.id === id ? { ...c, ...(name ? { name } : {}), ...otherFields } : c
    )
    await storage.set('categories', newCategories)
    set({ categories: newCategories })
    return { success: true }
  },

  deleteCategory: async (id) => {
    const { categories, selectedCategoryId } = get()
    const childIds = categories.filter(c => c.parentId === id).map(c => c.id)
    const idsToRemove = [id, ...childIds]
    const newCategories = categories.filter(c => !idsToRemove.includes(c.id))
    await storage.set('categories', newCategories)
    set({
      categories: newCategories,
      selectedCategoryId: idsToRemove.includes(selectedCategoryId)
        ? (newCategories[0]?.id || null)
        : selectedCategoryId
    })
    return { success: true, removedIds: idsToRemove }
  },

  toggleCategoryEnabled: async (id) => {
    const { categories } = get()
    const newCategories = categories.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    )
    await storage.set('categories', newCategories)
    set({ categories: newCategories })
    return { success: true }
  },

  sortCategories: async (sortedIds) => {
    const { categories } = get()
    const newCategories = categories.map(c => {
      const idx = sortedIds.indexOf(c.id)
      if (idx !== -1) {
        return { ...c, sort: idx }
      }
      return c
    })
    await storage.set('categories', newCategories)
    set({ categories: newCategories })
    return { success: true }
  },

  moveCategory: async (id, newParentId) => {
    const { categories } = get()
    const newCategories = categories.map(c =>
      c.id === id ? { ...c, parentId: newParentId } : c
    )
    await storage.set('categories', newCategories)
    set({ categories: newCategories })
    return { success: true }
  },

  getCategoryById: (id) => {
    return get().categories.find(c => c.id === id)
  },

  getCategoryName: (id) => {
    const category = get().categories.find(c => c.id === id)
    return category ? category.name : '未分类'
  },

  getTopCategories: () => {
    return get().categories.filter(c => !c.parentId)
  },

  getSubCategories: (parentId) => {
    return get().categories.filter(c => c.parentId === parentId)
  },

  getEnabledCategories: () => {
    return get().categories.filter(c => c.enabled !== false)
  },

  getCategoryTree: () => {
    const { categories } = get()
    const tops = categories.filter(c => !c.parentId).sort((a, b) => (a.sort || 0) - (b.sort || 0))
    return tops.map(t => ({
      ...t,
      children: categories
        .filter(c => c.parentId === t.id)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    }))
  }
}))
