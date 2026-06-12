import { create } from 'zustand'
import { storage, generateId } from '../utils/storage'

export const useExamStore = create((set, get) => ({
  examRecords: [],
  currentExam: null,
  isLoading: true,

  init: async () => {
    const examRecords = await storage.get('examRecords', [])
    set({ examRecords, isLoading: false })
  },

  startExam: (questions, duration) => {
    const answers = {}
    questions.forEach(q => {
      answers[q.id] = []
    })
    const exam = {
      id: generateId(),
      questionIds: questions.map(q => q.id),
      answers,
      startTime: Date.now(),
      duration: duration * 60 * 1000,
      endTime: null,
      submitted: false
    }
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
    set({ currentExam: newExam })
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
    set({ currentExam: record, examRecords: newRecords })
    return record
  },

  clearCurrentExam: () => {
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
