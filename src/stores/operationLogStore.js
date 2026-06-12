import { create } from 'zustand'
import { storage, generateId } from '../utils/storage'

const LOG_ACTIONS = {
  QUESTION_ADD: 'question_add',
  QUESTION_EDIT: 'question_edit',
  QUESTION_DELETE: 'question_delete',
  QUESTION_BATCH_DELETE: 'question_batch_delete',
  QUESTION_BATCH_MOVE: 'question_batch_move',
  QUESTION_TOGGLE_STATUS: 'question_toggle_status',
  QUESTION_BATCH_TOGGLE_STATUS: 'question_batch_toggle_status',
  QUESTION_IMPORT: 'question_import',
  QUESTION_EXPORT: 'question_export',
  QUESTION_DUPLICATE_CHECK: 'question_duplicate_check',
  CATEGORY_ADD: 'category_add',
  CATEGORY_EDIT: 'category_edit',
  CATEGORY_DELETE: 'category_delete',
  CATEGORY_TOGGLE: 'category_toggle',
  CATEGORY_SORT: 'category_sort',
  BACKUP_CREATE: 'backup_create',
  BACKUP_RESTORE: 'backup_restore',
  BACKUP_RESET: 'backup_reset',
  EXAM_START: 'exam_start',
  EXAM_SUBMIT: 'exam_submit',
  EXAM_RECOVER: 'exam_recover',
  SETTINGS_CHANGE: 'settings_change',
  WRONG_QUESTION_REMOVE: 'wrong_question_remove',
  WRONG_QUESTION_MASTERED: 'wrong_question_mastered',
  WRONG_QUESTION_EXPORT: 'wrong_question_export'
}

const actionLabels = {
  [LOG_ACTIONS.QUESTION_ADD]: '新增题目',
  [LOG_ACTIONS.QUESTION_EDIT]: '编辑题目',
  [LOG_ACTIONS.QUESTION_DELETE]: '删除题目',
  [LOG_ACTIONS.QUESTION_BATCH_DELETE]: '批量删除题目',
  [LOG_ACTIONS.QUESTION_BATCH_MOVE]: '批量迁移题目',
  [LOG_ACTIONS.QUESTION_TOGGLE_STATUS]: '切换题目状态',
  [LOG_ACTIONS.QUESTION_BATCH_TOGGLE_STATUS]: '批量切换题目状态',
  [LOG_ACTIONS.QUESTION_IMPORT]: '导入题库',
  [LOG_ACTIONS.QUESTION_EXPORT]: '导出题库',
  [LOG_ACTIONS.QUESTION_DUPLICATE_CHECK]: '题目重复校验',
  [LOG_ACTIONS.CATEGORY_ADD]: '新增分类',
  [LOG_ACTIONS.CATEGORY_EDIT]: '编辑分类',
  [LOG_ACTIONS.CATEGORY_DELETE]: '删除分类',
  [LOG_ACTIONS.CATEGORY_TOGGLE]: '切换分类状态',
  [LOG_ACTIONS.CATEGORY_SORT]: '分类排序',
  [LOG_ACTIONS.BACKUP_CREATE]: '创建备份',
  [LOG_ACTIONS.BACKUP_RESTORE]: '恢复备份',
  [LOG_ACTIONS.BACKUP_RESET]: '重置题库',
  [LOG_ACTIONS.EXAM_START]: '开始考试',
  [LOG_ACTIONS.EXAM_SUBMIT]: '提交试卷',
  [LOG_ACTIONS.EXAM_RECOVER]: '恢复考试',
  [LOG_ACTIONS.SETTINGS_CHANGE]: '修改设置',
  [LOG_ACTIONS.WRONG_QUESTION_REMOVE]: '移出错题本',
  [LOG_ACTIONS.WRONG_QUESTION_MASTERED]: '标记错题已掌握',
  [LOG_ACTIONS.WRONG_QUESTION_EXPORT]: '导出错题'
}

export const useOperationLogStore = create((set, get) => ({
  logs: [],
  isLoading: true,

  init: async () => {
    const logs = await storage.get('operationLogs', [])
    set({ logs, isLoading: false })
  },

  addLog: async (action, detail = {}) => {
    const { logs } = get()
    const log = {
      id: generateId(),
      action,
      actionLabel: actionLabels[action] || action,
      detail,
      timestamp: Date.now()
    }
    const newLogs = [log, ...logs].slice(0, 1000)
    await storage.set('operationLogs', newLogs)
    set({ logs: newLogs })
    return log
  },

  getLogs: ({ action, startTime, endTime, keyword } = {}) => {
    let result = [...get().logs]

    if (action) {
      result = result.filter(l => l.action === action)
    }

    if (startTime) {
      result = result.filter(l => l.timestamp >= startTime)
    }

    if (endTime) {
      result = result.filter(l => l.timestamp <= endTime)
    }

    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      result = result.filter(l => {
        const detailStr = JSON.stringify(l.detail || {}).toLowerCase()
        return l.actionLabel.toLowerCase().includes(kw) || detailStr.includes(kw)
      })
    }

    return result
  },

  getLogActionLabels: () => actionLabels,

  clearLogs: async () => {
    await storage.set('operationLogs', [])
    set({ logs: [] })
    return true
  },

  exportLogs: (filter = {}) => {
    const logs = get().getLogs(filter)
    return logs.map(log => ({
      时间: new Date(log.timestamp).toLocaleString('zh-CN'),
      操作类型: log.actionLabel,
      详情: JSON.stringify(log.detail || {})
    }))
  }
}))

export { LOG_ACTIONS }
