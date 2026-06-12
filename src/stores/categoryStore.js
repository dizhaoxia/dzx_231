import { create } from 'zustand'
import { storage, generateId } from '../utils/storage'

const defaultCategories = [
  { id: '1', name: '计算机基础' },
  { id: '2', name: '数据结构' },
  { id: '3', name: '操作系统' }
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
    set({
      categories,
      selectedCategoryId: categories[0]?.id || null,
      isLoading: false
    })
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId })
  },

  addCategory: async (name) => {
    const { categories } = get()
    const exists = categories.some(c => c.name === name)
    if (exists) {
      return { success: false, message: '分类名称已存在' }
    }
    const newCategory = { id: generateId(), name }
    const newCategories = [...categories, newCategory]
    await storage.set('categories', newCategories)
    set({ categories: newCategories })
    return { success: true, category: newCategory }
  },

  updateCategory: async (id, name) => {
    const { categories } = get()
    const exists = categories.some(c => c.name === name && c.id !== id)
    if (exists) {
      return { success: false, message: '分类名称已存在' }
    }
    const newCategories = categories.map(c => c.id === id ? { ...c, name } : c)
    await storage.set('categories', newCategories)
    set({ categories: newCategories })
    return { success: true }
  },

  deleteCategory: async (id) => {
    const { categories, selectedCategoryId } = get()
    const newCategories = categories.filter(c => c.id !== id)
    await storage.set('categories', newCategories)
    set({
      categories: newCategories,
      selectedCategoryId: selectedCategoryId === id ? (newCategories[0]?.id || null) : selectedCategoryId
    })
    return { success: true }
  },

  getCategoryById: (id) => {
    return get().categories.find(c => c.id === id)
  },

  getCategoryName: (id) => {
    const category = get().categories.find(c => c.id === id)
    return category ? category.name : '未分类'
  }
}))
