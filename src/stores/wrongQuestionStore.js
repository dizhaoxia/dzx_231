import { create } from 'zustand'
import { storage } from '../utils/storage'

export const useWrongQuestionStore = create((set, get) => ({
  wrongQuestions: [],
  isLoading: true,

  init: async () => {
    const wrongQuestions = await storage.get('wrongQuestions', [])
    set({ wrongQuestions, isLoading: false })
  },

  addWrongQuestion: async (questionId, userAnswer) => {
    const { wrongQuestions } = get()
    const exists = wrongQuestions.find(w => w.questionId === questionId)
    if (exists) {
      const newWrongQuestions = wrongQuestions.map(w =>
        w.questionId === questionId
          ? { ...w, wrongCount: w.wrongCount + 1, lastWrongAnswer: userAnswer, lastWrongTime: Date.now() }
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
        lastWrongTime: Date.now()
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

  isWrongQuestion: (questionId) => {
    return get().wrongQuestions.some(w => w.questionId === questionId)
  },

  clearAllWrong: async () => {
    await storage.set('wrongQuestions', [])
    set({ wrongQuestions: [] })
  },

  getWrongCount: () => {
    return get().wrongQuestions.length
  }
}))
