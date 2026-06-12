import { create } from 'zustand'
import { storage } from '../utils/storage'

const WRONG_TYPES = {
  CONCEPT: 'concept',
  READING: 'reading',
  KNOWLEDGE_GAP: 'knowledge_gap',
  CARELESS: 'careless',
  OTHER: 'other'
}

const wrongTypeLabels = {
  [WRONG_TYPES.CONCEPT]: '概念错误',
  [WRONG_TYPES.READING]: '审题错误',
  [WRONG_TYPES.KNOWLEDGE_GAP]: '知识盲区',
  [WRONG_TYPES.CARELESS]: '粗心大意',
  [WRONG_TYPES.OTHER]: '其他'
}

export const useWrongQuestionStore = create((set, get) => ({
  wrongQuestions: [],
  isLoading: true,

  init: async () => {
    const wrongQuestions = await storage.get('wrongQuestions', [])
    const migrated = wrongQuestions.map(w => ({
      firstWrongTime: w.addTime || Date.now(),
      lastWrongAnswer: w.lastWrongAnswer || w.userAnswer || [],
      wrongType: w.wrongType || WRONG_TYPES.OTHER,
      mastered: w.mastered || false,
      masteredAt: w.masteredAt || null,
      ...w
    }))
    if (JSON.stringify(migrated) !== JSON.stringify(wrongQuestions)) {
      await storage.set('wrongQuestions', migrated)
    }
    set({ wrongQuestions: migrated, isLoading: false })
  },

  addWrongQuestion: async (questionId, userAnswer, wrongType = WRONG_TYPES.OTHER) => {
    const { wrongQuestions } = get()
    const exists = wrongQuestions.find(w => w.questionId === questionId)
    if (exists) {
      const newWrongQuestions = wrongQuestions.map(w =>
        w.questionId === questionId
          ? {
              ...w,
              wrongCount: w.wrongCount + 1,
              lastWrongAnswer: userAnswer,
              lastWrongTime: Date.now(),
              mastered: false,
              masteredAt: null,
              wrongType
            }
          : w
      )
      await storage.set('wrongQuestions', newWrongQuestions)
      set({ wrongQuestions: newWrongQuestions })
    } else {
      const newWrong = {
        questionId,
        userAnswer,
        wrongCount: 1,
        addTime: Date.now(),
        firstWrongTime: Date.now(),
        lastWrongTime: Date.now(),
        lastWrongAnswer: userAnswer,
        wrongType,
        mastered: false,
        masteredAt: null
      }
      const newWrongQuestions = [...wrongQuestions, newWrong]
      await storage.set('wrongQuestions', newWrongQuestions)
      set({ wrongQuestions: newWrongQuestions })
    }
  },

  removeWrongQuestion: async (questionId) => {
    const { wrongQuestions } = get()
    const newWrongQuestions = wrongQuestions.filter(w => w.questionId !== questionId)
    await storage.set('wrongQuestions', newWrongQuestions)
    set({ wrongQuestions: newWrongQuestions })
  },

  batchRemoveWrongQuestions: async (questionIds) => {
    const { wrongQuestions } = get()
    const newWrongQuestions = wrongQuestions.filter(w => !questionIds.includes(w.questionId))
    await storage.set('wrongQuestions', newWrongQuestions)
    set({ wrongQuestions: newWrongQuestions })
  },

  markAsMastered: async (questionId) => {
    const { wrongQuestions } = get()
    const newWrongQuestions = wrongQuestions.map(w =>
      w.questionId === questionId
        ? { ...w, mastered: true, masteredAt: Date.now() }
        : w
    )
    await storage.set('wrongQuestions', newWrongQuestions)
    set({ wrongQuestions: newWrongQuestions })
  },

  unmarkMastered: async (questionId) => {
    const { wrongQuestions } = get()
    const newWrongQuestions = wrongQuestions.map(w =>
      w.questionId === questionId
        ? { ...w, mastered: false, masteredAt: null }
        : w
    )
    await storage.set('wrongQuestions', newWrongQuestions)
    set({ wrongQuestions: newWrongQuestions })
  },

  setWrongType: async (questionId, wrongType) => {
    const { wrongQuestions } = get()
    const newWrongQuestions = wrongQuestions.map(w =>
      w.questionId === questionId ? { ...w, wrongType } : w
    )
    await storage.set('wrongQuestions', newWrongQuestions)
    set({ wrongQuestions: newWrongQuestions })
  },

  isWrongQuestion: (questionId) => {
    return get().wrongQuestions.some(w => w.questionId === questionId)
  },

  isMastered: (questionId) => {
    const w = get().wrongQuestions.find(w => w.questionId === questionId)
    return w?.mastered || false
  },

  clearAllWrong: async () => {
    await storage.set('wrongQuestions', [])
    set({ wrongQuestions: [] })
  },

  getWrongCount: () => {
    return get().wrongQuestions.filter(w => !w.mastered).length
  },

  getTotalWrongCount: () => {
    return get().wrongQuestions.length
  },

  getMasteredCount: () => {
    return get().wrongQuestions.filter(w => w.mastered).length
  },

  getFilteredWrongQuestions: ({ type, categoryId, minWrongCount, maxWrongCount, includeMastered = false }) => {
    const { wrongQuestions } = get()
    let result = [...wrongQuestions]

    if (!includeMastered) {
      result = result.filter(w => !w.mastered)
    }

    if (minWrongCount !== undefined && minWrongCount !== null) {
      result = result.filter(w => w.wrongCount >= minWrongCount)
    }

    if (maxWrongCount !== undefined && maxWrongCount !== null) {
      result = result.filter(w => w.wrongCount <= maxWrongCount)
    }

    return result
  },

  getWrongQuestionById: (questionId) => {
    return get().wrongQuestions.find(w => w.questionId === questionId)
  },

  getHighFrequencyWrong: (threshold = 3) => {
    return get().wrongQuestions.filter(w => w.wrongCount >= threshold && !w.mastered)
  },

  getWrongTypeStats: () => {
    const { wrongQuestions } = get()
    const stats = {}
    Object.keys(WRONG_TYPES).forEach(key => {
      stats[WRONG_TYPES[key]] = {
        label: wrongTypeLabels[WRONG_TYPES[key]],
        count: 0,
        questions: []
      }
    })

    wrongQuestions.filter(w => !w.mastered).forEach(w => {
      const type = w.wrongType || WRONG_TYPES.OTHER
      if (stats[type]) {
        stats[type].count++
        stats[type].questions.push(w.questionId)
      }
    })

    return stats
  },

  getWeakPointReport: (getQuestionById, getCategoryName) => {
    const { wrongQuestions } = get()
    const categoryStats = {}
    const typeStats = {}

    wrongQuestions.filter(w => !w.mastered).forEach(w => {
      const q = getQuestionById(w.questionId)
      if (!q) return

      const catName = getCategoryName(q.categoryId)
      if (!categoryStats[catName]) {
        categoryStats[catName] = { category: catName, count: 0, wrongCount: 0, questions: [] }
      }
      categoryStats[catName].count++
      categoryStats[catName].wrongCount += w.wrongCount
      categoryStats[catName].questions.push(w.questionId)

      const type = w.wrongType || WRONG_TYPES.OTHER
      if (!typeStats[type]) {
        typeStats[type] = { label: wrongTypeLabels[type], count: 0, questions: [] }
      }
      typeStats[type].count++
      typeStats[type].questions.push(w.questionId)
    })

    const sortedCategories = Object.values(categoryStats)
      .sort((a, b) => b.wrongCount - a.wrongCount)

    const sortedTypes = Object.values(typeStats)
      .sort((a, b) => b.count - a.count)

    const totalWrong = wrongQuestions.filter(w => !w.mastered).length
    const totalWrongTimes = wrongQuestions
      .filter(w => !w.mastered)
      .reduce((sum, w) => sum + w.wrongCount, 0)

    return {
      totalWrong,
      totalWrongTimes,
      categoryStats: sortedCategories,
      typeStats: sortedTypes,
      topWeakCategories: sortedCategories.slice(0, 3),
      topWrongTypes: sortedTypes.slice(0, 3)
    }
  },

  exportWrongQuestions: (getQuestionById, getCategoryName, format = 'json') => {
    const { wrongQuestions } = get()
    const data = wrongQuestions.map(w => {
      const q = getQuestionById(w.questionId)
      if (!q) return null
      return {
        题目类型: q.type === 'single' ? '单选题' : q.type === 'multiple' ? '多选题' : '判断题',
        题目分类: getCategoryName(q.categoryId),
        题干: q.question,
        选项: q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('; '),
        正确答案: q.answer.join('、'),
        答案解析: q.explanation || '',
        做错次数: w.wrongCount,
        错误类型: wrongTypeLabels[w.wrongType || WRONG_TYPES.OTHER],
        最近错误答案: w.lastWrongAnswer?.join('、') || '',
        首次做错时间: w.firstWrongTime ? new Date(w.firstWrongTime).toLocaleString('zh-CN') : '',
        最近做错时间: w.lastWrongTime ? new Date(w.lastWrongTime).toLocaleString('zh-CN') : '',
        是否已掌握: w.mastered ? '是' : '否'
      }
    }).filter(Boolean)

    if (format === 'json') {
      return JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalCount: data.length,
        questions: data
      }, null, 2)
    }

    return data
  }
}))

export { WRONG_TYPES, wrongTypeLabels }
