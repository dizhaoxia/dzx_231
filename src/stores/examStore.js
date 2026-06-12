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

  startExam: async (questions, duration, options = {}) => {
    const { shuffleQuestions = false, shuffleOptions = false } = options
    const answers = {}
    const marked = {}
    const optionOrder = {}

    let processedQuestions = [...questions]
    if (shuffleQuestions) {
      processedQuestions = processedQuestions.sort(() => Math.random() - 0.5)
    }

    processedQuestions.forEach(q => {
      answers[q.id] = []
      marked[q.id] = false

      if (shuffleOptions && q.type !== 'judge') {
        const indices = q.options.map((_, i) => i)
        const shuffled = indices.sort(() => Math.random() - 0.5)
        optionOrder[q.id] = shuffled
      }
    })

    const exam = {
      id: generateId(),
      questionIds: processedQuestions.map(q => q.id),
      answers,
      marked,
      startTime: Date.now(),
      duration: duration * 60 * 1000,
      endTime: null,
      submitted: false,
      halfTimeAlerted: false,
      fiveMinAlerted: false,
      shuffleQuestions,
      shuffleOptions,
      optionOrder
    }
    await storage.set('currentExamCache', exam)
    set({ currentExam: exam })
    return exam
  },

  startWrongExam: async (questions, duration, options = {}) => {
    const { shuffleQuestions = false, shuffleOptions = false } = options
    const answers = {}
    const marked = {}
    const optionOrder = {}

    let processedQuestions = [...questions]
    if (shuffleQuestions) {
      processedQuestions = processedQuestions.sort(() => Math.random() - 0.5)
    }

    processedQuestions.forEach(q => {
      answers[q.id] = []
      marked[q.id] = false

      if (shuffleOptions && q.type !== 'judge') {
        const indices = q.options.map((_, i) => i)
        const shuffled = indices.sort(() => Math.random() - 0.5)
        optionOrder[q.id] = shuffled
      }
    })

    const exam = {
      id: generateId(),
      questionIds: processedQuestions.map(q => q.id),
      answers,
      marked,
      startTime: Date.now(),
      duration: duration * 60 * 1000,
      endTime: null,
      submitted: false,
      isWrongExam: true,
      halfTimeAlerted: false,
      fiveMinAlerted: false,
      shuffleQuestions,
      shuffleOptions,
      optionOrder
    }
    await storage.set('currentExamCache', exam)
    set({ currentExam: exam })
    return exam
  },

  getShuffledOptions: (questionId, question) => {
    const { currentExam } = get()
    if (!currentExam || !currentExam.shuffleOptions || !currentExam.optionOrder || !currentExam.optionOrder[questionId]) {
      return question.options
    }

    const order = currentExam.optionOrder[questionId]
    const originalLabels = question.options.map((_, i) => String.fromCharCode(65 + i))
    const shuffledOptions = order.map(idx => ({
      index: idx,
      originalLabel: originalLabels[idx],
      text: question.options[idx]
    }))
    return shuffledOptions
  },

  mapShuffledAnswerToOriginal: (questionId, selectedLabels) => {
    const { currentExam } = get()
    if (!currentExam || !currentExam.shuffleOptions || !currentExam.optionOrder || !currentExam.optionOrder[questionId]) {
      return selectedLabels
    }

    const order = currentExam.optionOrder[questionId]
    const displayLabels = order.map((_, i) => String.fromCharCode(65 + i))

    return selectedLabels.map(label => {
      const displayIdx = displayLabels.indexOf(label)
      if (displayIdx === -1) return label
      const originalIdx = order[displayIdx]
      return String.fromCharCode(65 + originalIdx)
    }).sort()
  },

  mapOriginalAnswerToShuffled: (questionId, originalAnswers) => {
    const { currentExam } = get()
    if (!currentExam || !currentExam.shuffleOptions || !currentExam.optionOrder || !currentExam.optionOrder[questionId]) {
      return originalAnswers
    }

    const order = currentExam.optionOrder[questionId]
    const originalLabels = order.map(idx => String.fromCharCode(65 + idx))
    const displayLabels = order.map((_, i) => String.fromCharCode(65 + i))

    return originalAnswers.map(orig => {
      const idx = originalLabels.indexOf(orig)
      return idx === -1 ? orig : displayLabels[idx]
    }).sort()
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

      let isCorrect
      if (currentExam.shuffleOptions) {
        const mappedUserAnswer = get().mapShuffledAnswerToOriginal(q.id, userAnswer)
        isCorrect = mappedUserAnswer.length === correctAnswer.length &&
          mappedUserAnswer.every(a => correctAnswer.includes(a))
      } else {
        isCorrect = userAnswer.length === correctAnswer.length &&
          userAnswer.every(a => correctAnswer.includes(a))
      }

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
  },

  savePracticeProgress: async (categoryId, questionIndex, answers = {}) => {
    const progress = await storage.get('practiceProgress', {})
    progress[categoryId] = {
      questionIndex,
      answers,
      updatedAt: Date.now()
    }
    await storage.set('practiceProgress', progress)
  },

  getPracticeProgress: async (categoryId) => {
    const progress = await storage.get('practiceProgress', {})
    return progress[categoryId] || null
  },

  clearPracticeProgress: async (categoryId) => {
    const progress = await storage.get('practiceProgress', {})
    if (categoryId) {
      delete progress[categoryId]
    } else {
      Object.keys(progress).forEach(k => delete progress[k])
    }
    await storage.set('practiceProgress', progress)
  }
}))
