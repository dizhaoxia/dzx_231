import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useCategoryStore } from './stores/categoryStore'
import { useQuestionStore } from './stores/questionStore'
import { useWrongQuestionStore } from './stores/wrongQuestionStore'
import { useExamStore } from './stores/examStore'
import { useOperationLogStore } from './stores/operationLogStore'
import { useSettingsStore } from './stores/settingsStore'
import { Spin } from 'antd'
import RoleSelect from './pages/RoleSelect'
import StudentLayout from './layouts/StudentLayout'
import AdminLayout from './layouts/AdminLayout'
import Practice from './pages/student/Practice'
import Exam from './pages/student/Exam'
import WrongBook from './pages/student/WrongBook'
import Statistics from './pages/student/Statistics'
import Settings from './pages/student/Settings'
import CategoryManage from './pages/admin/CategoryManage'
import QuestionManage from './pages/admin/QuestionManage'
import OperationLogs from './pages/admin/OperationLogs'
import BackupManage from './pages/admin/BackupManage'
import styles from './App.module.css'

function App() {
  const { role, isLoading: authLoading, init: initAuth } = useAuthStore()
  const { isLoading: categoryLoading, init: initCategory } = useCategoryStore()
  const { isLoading: questionLoading, init: initQuestion } = useQuestionStore()
  const { isLoading: wrongLoading, init: initWrong } = useWrongQuestionStore()
  const { isLoading: examLoading, init: initExam } = useExamStore()
  const { isLoading: logLoading, init: initLogs } = useOperationLogStore()
  const { isLoading: settingsLoading, init: initSettings } = useSettingsStore()

  useEffect(() => {
    initAuth()
    initCategory()
    initQuestion()
    initWrong()
    initExam()
    initLogs()
    initSettings()
  }, [])

  const isLoading = authLoading || categoryLoading || questionLoading || wrongLoading || examLoading || logLoading || settingsLoading

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <Routes>
        <Route path="/" element={
          role ? <Navigate to={role === 'admin' ? '/admin/categories' : '/student/practice'} replace /> : <RoleSelect />
        } />
        
        <Route path="/student/*" element={
          role === 'student' ? <StudentLayout /> : <Navigate to="/" replace />
        }>
          <Route path="practice" element={<Practice />} />
          <Route path="exam" element={<Exam />} />
          <Route path="wrong" element={<WrongBook />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/admin/*" element={
          role === 'admin' ? <AdminLayout /> : <Navigate to="/" replace />
        }>
          <Route path="categories" element={<CategoryManage />} />
          <Route path="questions" element={<QuestionManage />} />
          <Route path="logs" element={<OperationLogs />} />
          <Route path="backup" element={<BackupManage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
