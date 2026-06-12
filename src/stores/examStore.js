import { create } from 'zustand'
import { storage, generateId } from '../utils/storage'

export const useExamStore = create((set, get) => ({
  examRecords: [],
  currentExam: null,
  isLoading: true,

  init: async () => {
    const examRecords = await storage.get('examRecords', [])
    const cachedExam = await storage.get('currentExamCache', null)
    set({
      examRecords,
      currentExam: cachedExam,
      isLoading: false
    })
  },

  startExam: (questions, duration) => {
    const answers = {}
    const marked = {}
    questions.forEach(q => {
      answers[q.id] = []
      marked[q.id] = false
    })
    const exam = {
      id: generateId(),
      questionIds: questions.map(q => q.id),
      answers,
      marked,
      startTime: Date.now(),
      duration: duration * 60 * 1000,
      endTime: null,
      submitted: false,
      halfTimeAlerted: false,
      fiveMinAlerted: false
    }
    storage.set('currentExamCache', exam)
    set({ currentExam: exam })
    return exam
  },

  startWrongExam: (questions, duration) => {
    const answers = {}
    const marked = {}
    questions.forEach(q => {
      answers[q.id] = []
      marked[q.id] = false
    })
    const exam = {
      id: generateId(),
      questionIds: questions.map(q => q.id),
      answers,
      marked,
      startTime: Date.now(),
      duration: duration * 60 * 1000,
      endTime: null,
      submitted: false,
      isWrongExam: true,
      halfTimeAlerted: false,
      fiveMinAlerted: false
    }
    storage.set('currentExamCache', exam)
    set({ currentExam: exam })
    return exam
  },

  setAnswer: (questionId, answer) => {
    const { currentExam } = get()
    if (!currentExam) return
    const newExam = {
      ...currentExam,
      answers: {
        ...currentExam.answers,
        [questionId]: answer
      }
    }
    storage.set('currentExamCache', newExam)
    set({ currentExam: newExam })
  },

  toggleMark: (questionId) => {
    const { currentExam } = get()
    if (!currentExam) return
    const newExam = {
      ...currentExam,
      marked: {
        ...currentExam.marked,
        [questionId]: !currentExam.marked[questionId]
      }
    }
    storage.set('currentExamCache', newExam)
    set({ currentExam: newExam })
  },

  setHalfTimeAlerted: () => {
    const { currentExam } = get()
    if (!currentExam) return
    const newExam = { ...currentExam, halfTimeAlerted: true }
    storage.set('currentExamCache', newExam)
    set({ currentExam: newExam })
  },

  setFiveMinAlerted: () => {
    const { currentExam } = get()
    if (!currentExam) return
    const newExam = { ...currentExam, fiveMinAlerted: true }
    storage.set('currentExamCache', newExam)
    set({ currentExam: newExam })
  },

  saveAnswerCache: () => {
    const { currentExam } = get()
    if (!currentExam) return
    storage.set('currentExamCache', currentExam)
  },

  hasCachedExam: async () => {
    const cached = await storage.get('currentExamCache', null)
    return cached && !cached.submitted
  },

  recoverCachedExam: async () => {
    const cached = await storage.get('currentExamCache', null)
    if (cached && !cached.submitted) {
      set({ currentExam: cached })
      return cached
    }
    return null
  },

  submitExam: async (questions) => {
    const { currentExam, examRecords } = get()
    if (!currentExam) return null

    let correctCount = 0
    const results = {}

    questions.forEach(q => {
      const userAnswer = currentExam.answers[q.id] || []
      const correctAnswer = q.answer || []
      const isCorrect = userAnswer.length === correctAnswer.length &&
        userAnswer.every(a => correctAnswer.includes(a))
      results[q.id] = isCorrect
      if (isCorrect) correctCount++
    })

    const record = {
      ...currentExam,
      endTime: Date.now(),
      submitted: true,
      totalCount: questions.length,
      correctCount,
      wrongCount: questions.length - correctCount,
      accuracy: Math.round((correctCount / questions.length) * 100)
    }

    const newRecords = [record, ...examRecords]
    await storage.set('examRecords', newRecords)
    await storage.set('currentExamCache', null)
    set({ currentExam: record, examRecords: newRecords })
    return record
  },

  clearCurrentExam: async () => {
    await storage.set('currentExamCache', null)
    set({ currentExam: null })
  },

  getExamRecords: () => {
    return get().examRecords
  },

  getLatestRecord: () => {
    const records = get().examRecords
    return records[0] || null
  }
}))
