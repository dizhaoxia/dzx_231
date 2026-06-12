import { create } from 'zustand'
import { storage, generateId } from '../utils/storage'

const defaultQuestions = [
  {
    id: 'q1',
    categoryId: '1',
    type: 'single',
    question: '计算机的中央处理器简称是什么？',
    options: ['CPU', 'GPU', 'RAM', 'ROM'],
    answer: ['A'],
    explanation: 'CPU是Central Processing Unit的缩写，即中央处理器，是计算机的核心运算和控制部件。',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 3,
    status: 'active'
  },
  {
    id: 'q2',
    categoryId: '1',
    type: 'multiple',
    question: '以下哪些是计算机的输入设备？',
    options: ['键盘', '鼠标', '显示器', '扫描仪'],
    answer: ['A', 'B', 'D'],
    explanation: '键盘、鼠标和扫描仪属于输入设备，显示器属于输出设备。',
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 2,
    status: 'active'
  },
  {
    id: 'q3',
    categoryId: '1',
    type: 'judge',
    question: '计算机病毒只存在于可执行文件中。',
    options: ['正确', '错误'],
    answer: ['B'],
    explanation: '计算机病毒不仅存在于可执行文件中，还可以存在于文档、宏、脚本等多种文件中。',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 1,
    status: 'active'
  },
  {
    id: 'q4',
    categoryId: '2',
    type: 'single',
    question: '下列哪种数据结构是先进先出(FIFO)的？',
    options: ['栈', '队列', '树', '图'],
    answer: ['B'],
    explanation: '队列是先进先出(FIFO)的数据结构，栈是后进先出(LIFO)的数据结构。',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 1,
    status: 'active'
  },
  {
    id: 'q5',
    categoryId: '2',
    type: 'multiple',
    question: '以下哪些是线性数据结构？',
    options: ['数组', '链表', '二叉树', '栈'],
    answer: ['A', 'B', 'D'],
    explanation: '数组、链表和栈都是线性数据结构，二叉树是非线性数据结构。',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
    status: 'active'
  },
  {
    id: 'q6',
    categoryId: '3',
    type: 'single',
    question: '操作系统的主要功能不包括以下哪项？',
    options: ['进程管理', '内存管理', '设备管理', '编译程序'],
    answer: ['D'],
    explanation: '操作系统的主要功能包括进程管理、内存管理、文件管理和设备管理等，编译程序是系统软件，不属于操作系统的核心功能。',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    status: 'active'
  },
  {
    id: 'q7',
    categoryId: '3',
    type: 'judge',
    question: '进程和线程是同一个概念。',
    options: ['正确', '错误'],
    answer: ['B'],
    explanation: '进程是资源分配的基本单位，线程是CPU调度的基本单位，一个进程可以包含多个线程。',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    status: 'active'
  }
]

export const useQuestionStore = create((set, get) => ({
  questions: [],
  drafts: [],
  isLoading: true,

  init: async () => {
    let questions = await storage.get('questions', null)
    if (!questions || questions.length === 0) {
      questions = defaultQuestions
      await storage.set('questions', questions)
    }
    const drafts = await storage.get('questionDrafts', [])
    set({ questions, drafts, isLoading: false })
  },

  getQuestionsByCategory: (categoryId) => {
    if (!categoryId) return get().questions
    return get().questions.filter(q => q.categoryId === categoryId)
  },

  getActiveQuestionsByCategory: (categoryId) => {
    const questions = categoryId
      ? get().questions.filter(q => q.categoryId === categoryId)
      : get().questions
    return questions.filter(q => q.status !== 'disabled')
  },

  getQuestionById: (id) => {
    return get().questions.find(q => q.id === id)
  },

  searchQuestions: ({ keyword, type, categoryId, startTime, endTime, status }) => {
    let result = [...get().questions]

    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      result = result.filter(q => q.question.toLowerCase().includes(kw))
    }

    if (type) {
      result = result.filter(q => q.type === type)
    }

    if (categoryId) {
      result = result.filter(q => q.categoryId === categoryId)
    }

    if (startTime) {
      result = result.filter(q => q.createdAt >= startTime)
    }

    if (endTime) {
      result = result.filter(q => q.createdAt <= endTime)
    }

    if (status) {
      result = result.filter(q => q.status === status)
    }

    return result
  },

  addQuestion: async (questionData) => {
    const { questions } = get()
    const now = Date.now()
    const newQuestion = {
      ...questionData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      status: questionData.status || 'active'
    }
    const newQuestions = [...questions, newQuestion]
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return newQuestion
  },

  updateQuestion: async (id, questionData) => {
    const { questions } = get()
    const newQuestions = questions.map(q =>
      q.id === id ? { ...q, ...questionData, updatedAt: Date.now() } : q
    )
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return true
  },

  deleteQuestion: async (id) => {
    const { questions } = get()
    const newQuestions = questions.filter(q => q.id !== id)
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return true
  },

  batchDeleteQuestions: async (ids) => {
    const { questions } = get()
    const newQuestions = questions.filter(q => !ids.includes(q.id))
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return true
  },

  batchMoveCategory: async (ids, targetCategoryId) => {
    const { questions } = get()
    const newQuestions = questions.map(q =>
      ids.includes(q.id)
        ? { ...q, categoryId: targetCategoryId, updatedAt: Date.now() }
        : q
    )
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return true
  },

  deleteQuestionsByCategory: async (categoryId) => {
    const { questions } = get()
    const newQuestions = questions.filter(q => q.categoryId !== categoryId)
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return true
  },

  getRandomQuestions: ({ categoryIds, types, count }) => {
    let pool = [...get().questions]

    if (categoryIds && categoryIds.length > 0) {
      pool = pool.filter(q => categoryIds.includes(q.categoryId))
    }

    if (types && types.length > 0) {
      pool = pool.filter(q => types.includes(q.type))
    }

    pool = pool.filter(q => q.status !== 'disabled')

    const shuffled = pool.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
  },

  saveDraft: async (draftData) => {
    const { drafts } = get()
    const now = Date.now()

    if (draftData.id) {
      const newDrafts = drafts.map(d =>
        d.id === draftData.id ? { ...d, ...draftData, updatedAt: now } : d
      )
      await storage.set('questionDrafts', newDrafts)
      set({ drafts: newDrafts })
      return draftData
    } else {
      const newDraft = {
        ...draftData,
        id: generateId(),
        createdAt: now,
        updatedAt: now
      }
      const newDrafts = [newDraft, ...drafts]
      await storage.set('questionDrafts', newDrafts)
      set({ drafts: newDrafts })
      return newDraft
    }
  },

  getDraft: (id) => {
    return get().drafts.find(d => d.id === id)
  },

  deleteDraft: async (id) => {
    const { drafts } = get()
    const newDrafts = drafts.filter(d => d.id !== id)
    await storage.set('questionDrafts', newDrafts)
    set({ drafts: newDrafts })
    return true
  },

  clearAllDrafts: async () => {
    await storage.set('questionDrafts', [])
    set({ drafts: [] })
    return true
  }
}))
