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
    explanation: 'CPU是Central Processing Unit的缩写，即中央处理器，是计算机的核心运算和控制部件。'
  },
  {
    id: 'q2',
    categoryId: '1',
    type: 'multiple',
    question: '以下哪些是计算机的输入设备？',
    options: ['键盘', '鼠标', '显示器', '扫描仪'],
    answer: ['A', 'B', 'D'],
    explanation: '键盘、鼠标和扫描仪属于输入设备，显示器属于输出设备。'
  },
  {
    id: 'q3',
    categoryId: '1',
    type: 'judge',
    question: '计算机病毒只存在于可执行文件中。',
    options: ['正确', '错误'],
    answer: ['B'],
    explanation: '计算机病毒不仅存在于可执行文件中，还可以存在于文档、宏、脚本等多种文件中。'
  },
  {
    id: 'q4',
    categoryId: '2',
    type: 'single',
    question: '下列哪种数据结构是先进先出(FIFO)的？',
    options: ['栈', '队列', '树', '图'],
    answer: ['B'],
    explanation: '队列是先进先出(FIFO)的数据结构，栈是后进先出(LIFO)的数据结构。'
  },
  {
    id: 'q5',
    categoryId: '2',
    type: 'multiple',
    question: '以下哪些是线性数据结构？',
    options: ['数组', '链表', '二叉树', '栈'],
    answer: ['A', 'B', 'D'],
    explanation: '数组、链表和栈都是线性数据结构，二叉树是非线性数据结构。'
  },
  {
    id: 'q6',
    categoryId: '3',
    type: 'single',
    question: '操作系统的主要功能不包括以下哪项？',
    options: ['进程管理', '内存管理', '设备管理', '编译程序'],
    answer: ['D'],
    explanation: '操作系统的主要功能包括进程管理、内存管理、文件管理和设备管理等，编译程序是系统软件，不属于操作系统的核心功能。'
  },
  {
    id: 'q7',
    categoryId: '3',
    type: 'judge',
    question: '进程和线程是同一个概念。',
    options: ['正确', '错误'],
    answer: ['B'],
    explanation: '进程是资源分配的基本单位，线程是CPU调度的基本单位，一个进程可以包含多个线程。'
  }
]

export const useQuestionStore = create((set, get) => ({
  questions: [],
  isLoading: true,

  init: async () => {
    let questions = await storage.get('questions', null)
    if (!questions || questions.length === 0) {
      questions = defaultQuestions
      await storage.set('questions', questions)
    }
    set({ questions, isLoading: false })
  },

  getQuestionsByCategory: (categoryId) => {
    if (!categoryId) return get().questions
    return get().questions.filter(q => q.categoryId === categoryId)
  },

  getQuestionById: (id) => {
    return get().questions.find(q => q.id === id)
  },

  addQuestion: async (questionData) => {
    const { questions } = get()
    const newQuestion = {
      ...questionData,
      id: generateId()
    }
    const newQuestions = [...questions, newQuestion]
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return newQuestion
  },

  updateQuestion: async (id, questionData) => {
    const { questions } = get()
    const newQuestions = questions.map(q => q.id === id ? { ...q, ...questionData } : q)
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

  deleteQuestionsByCategory: async (categoryId) => {
    const { questions } = get()
    const newQuestions = questions.filter(q => q.categoryId !== categoryId)
    await storage.set('questions', newQuestions)
    set({ questions: newQuestions })
    return true
  }
}))
