import React, { useState, useEffect, useMemo } from 'react'
import {
  Layout,
  Menu,
  Card,
  Button,
  Radio,
  Checkbox,
  Tag,
  Typography,
  Empty,
  message,
  Space,
  Result,
  Alert,
  Segmented
} from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  BookOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useWrongQuestionStore, WRONG_TYPES, wrongTypeLabels } from '../../stores/wrongQuestionStore'
import { useExamStore } from '../../stores/examStore'
import { useSettingsStore } from '../../stores/settingsStore'
import styles from './Practice.module.css'

const { Sider, Content } = Layout
const { Title, Paragraph, Text } = Typography

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function Practice() {
  const { categories, selectedCategoryId, setSelectedCategory } = useCategoryStore()
  const { getQuestionsByCategory } = useQuestionStore()
  const { addWrongQuestion, removeWrongQuestion, isWrongQuestion, getWrongQuestionById, getHighFrequencyWrong } = useWrongQuestionStore()
  const { savePracticeProgress, getPracticeProgress, clearPracticeProgress } = useExamStore()
  const { settings, getFontSize } = useSettingsStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [answersMap, setAnswersMap] = useState({})
  const [showResult, setShowResult] = useState(false)
  const [selectedWrongType, setSelectedWrongType] = useState(null)

  const fontSize = useMemo(() => getFontSize(), [getFontSize])

  const questions = useMemo(() => {
    if (!selectedCategoryId) return []
    return getQuestionsByCategory(selectedCategoryId)
  }, [selectedCategoryId, getQuestionsByCategory])

  const currentQuestion = questions[currentIndex]

  const highFrequencyWrong = useMemo(() => {
    if (!currentQuestion || !settings.showHighFrequencyTips) return null
    const wrong = getWrongQuestionById(currentQuestion.id)
    if (wrong && wrong.wrongCount >= 3) {
      return wrong
    }
    return null
  }, [currentQuestion, settings.showHighFrequencyTips, getWrongQuestionById])

  useEffect(() => {
    if (!selectedCategoryId) return
    const restoreProgress = async () => {
      const progress = await getPracticeProgress(selectedCategoryId)
      if (progress && progress.questionIndex !== undefined && progress.questionIndex < questions.length) {
        setCurrentIndex(progress.questionIndex)
        setAnswersMap(progress.answers || {})
        const savedAnswer = (progress.answers && progress.answers[questions[progress.questionIndex]?.id]) || []
        setUserAnswer(savedAnswer)
        message.info(`已恢复上次刷题进度，第 ${progress.questionIndex + 1} 题`)
      }
    }
    restoreProgress()
  }, [selectedCategoryId])

  useEffect(() => {
    setUserAnswer([])
    setSubmitted(false)
    setIsCorrect(false)
    setShowResult(false)
    setSelectedWrongType(null)
  }, [currentIndex])

  useEffect(() => {
    if (!selectedCategoryId || !currentQuestion) return
    const newAnswersMap = { ...answersMap, [currentQuestion.id]: userAnswer }
    setAnswersMap(newAnswersMap)
    savePracticeProgress(selectedCategoryId, currentIndex, newAnswersMap)
  }, [currentIndex, userAnswer, selectedCategoryId, currentQuestion])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (submitted) {
          handleNext()
        }
      } else if (['A', 'B', 'C', 'D'].includes(e.key.toUpperCase())) {
        if (!currentQuestion) return
        const questionType = currentQuestion.type
        if (questionType === 'single' || questionType === 'judge') {
          if (!submitted) {
            const key = e.key.toUpperCase()
            const optionIndex = key.charCodeAt(0) - 65
            if (currentQuestion.options && optionIndex < currentQuestion.options.length) {
              setUserAnswer([key])
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentIndex, submitted, currentQuestion])

  const handleCategoryChange = ({ key }) => {
    setSelectedCategory(key)
    setCurrentIndex(0)
    setUserAnswer([])
    setSubmitted(false)
    setIsCorrect(false)
    setAnswersMap({})
    setShowResult(false)
    setSelectedWrongType(null)
  }

  const handleSingleSelect = (e) => {
    if (submitted) return
    setUserAnswer([e.target.value])
  }

  const handleMultipleChange = (checkedValues) => {
    if (submitted) return
    setUserAnswer(checkedValues)
  }

  const handleSubmit = () => {
    if (userAnswer.length === 0) {
      message.warning('请先选择答案')
      return
    }

    const correctAnswer = currentQuestion.answer || []
    const correct = userAnswer.length === correctAnswer.length &&
      userAnswer.every(a => correctAnswer.includes(a))

    setIsCorrect(correct)
    setSubmitted(true)
    setShowResult(settings.showAnswerInstantly)

    if (!correct) {
      addWrongQuestion(currentQuestion.id, userAnswer)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleToggleWrong = () => {
    if (isWrongQuestion(currentQuestion.id)) {
      removeWrongQuestion(currentQuestion.id)
      message.success('已从错题本移除')
    } else {
      addWrongQuestion(currentQuestion.id, [])
      message.success('已加入错题本')
    }
  }

  const handleClearProgress = async () => {
    await clearPracticeProgress(selectedCategoryId)
    message.success('已清除刷题进度')
  }

  const handleWrongTypeSelect = (type) => {
    setSelectedWrongType(type)
    addWrongQuestion(currentQuestion.id, userAnswer, type)
    message.success('已记录错误类型')
  }

  const handleShowResult = () => {
    setShowResult(true)
    if (!isCorrect) {
      addWrongQuestion(currentQuestion.id, userAnswer)
    }
  }

  const menuItems = categories.map(cat => ({
    key: cat.id,
    icon: <BookOutlined />,
    label: cat.name
  }))

  const renderOptions = () => {
    if (!currentQuestion) return null

    const { type, options } = currentQuestion

    if (type === 'single' || type === 'judge') {
      return (
        <Radio.Group
          value={userAnswer[0]}
          onChange={handleSingleSelect}
          className={styles.optionsGroup}
          disabled={submitted}
        >
          {options.map((opt, idx) => {
            const optionLabel = String.fromCharCode(65 + idx)
            const isCorrectOption = currentQuestion.answer.includes(optionLabel)
            const isUserOption = userAnswer.includes(optionLabel)

            let optionClass = styles.optionItem
            if (submitted && showResult) {
              if (isCorrectOption) {
                optionClass += ' ' + styles.correctOption
              } else if (isUserOption && !isCorrectOption) {
                optionClass += ' ' + styles.wrongOption
              }
            }

            return (
              <Radio key={idx} value={optionLabel} className={optionClass}>
                <span className={styles.optionLabel} style={{ fontSize: fontSize.option }}>{optionLabel}.</span>
                <span className={styles.optionText} style={{ fontSize: fontSize.option }}>{opt}</span>
              </Radio>
            )
          })}
        </Radio.Group>
      )
    }

    return (
      <Checkbox.Group
        value={userAnswer}
        onChange={handleMultipleChange}
        className={styles.optionsGroup}
        disabled={submitted}
      >
        {options.map((opt, idx) => {
          const optionLabel = String.fromCharCode(65 + idx)
          const isCorrectOption = currentQuestion.answer.includes(optionLabel)
          const isUserOption = userAnswer.includes(optionLabel)

          let optionClass = styles.optionItem
          if (submitted && showResult) {
            if (isCorrectOption) {
              optionClass += ' ' + styles.correctOption
            } else if (isUserOption && !isCorrectOption) {
              optionClass += ' ' + styles.wrongOption
            }
          }

          return (
            <Checkbox key={idx} value={optionLabel} className={optionClass}>
              <span className={styles.optionLabel} style={{ fontSize: fontSize.option }}>{optionLabel}.</span>
              <span className={styles.optionText} style={{ fontSize: fontSize.option }}>{opt}</span>
            </Checkbox>
          )
        })}
      </Checkbox.Group>
    )
  }

  if (!selectedCategoryId || questions.length === 0) {
    return (
      <Layout className={styles.layout}>
        <Sider width={200} className={styles.sider}>
          <div className={styles.siderTitle}>题库分类</div>
          <Menu
            mode="inline"
            selectedKeys={[selectedCategoryId || '']}
            items={menuItems}
            onClick={handleCategoryChange}
            className={styles.menu}
          />
        </Sider>
        <Content className={styles.content}>
          <Empty
            description="该分类下暂无题目"
            className={styles.empty}
          />
        </Content>
      </Layout>
    )
  }

  return (
    <Layout className={styles.layout}>
      <Sider width={200} className={styles.sider}>
        <div className={styles.siderTitle}>题库分类</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedCategoryId]}
          items={menuItems}
          onClick={handleCategoryChange}
          className={styles.menu}
        />
      </Sider>
      <Layout className={styles.mainLayout}>
        <Content className={styles.content}>
          <Card className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  <Tag color={questionTypeMap[currentQuestion.type]?.color}>
                    {questionTypeMap[currentQuestion.type]?.label}
                  </Tag>
                  <Text type="secondary">
                    第 {currentIndex + 1} / {questions.length} 题
                  </Text>
                </Space>
                {highFrequencyWrong && (
                  <Alert
                    type="warning"
                    showIcon
                    message={`⚠️ 高频易错题目，请注意仔细作答！该题已做错 ${highFrequencyWrong.wrongCount} 次`}
                    style={{ marginTop: 8 }}
                  />
                )}
              </Space>
              <Button
                icon={isWrongQuestion(currentQuestion.id) ? <MinusOutlined /> : <PlusOutlined />}
                onClick={handleToggleWrong}
                size="small"
              >
                {isWrongQuestion(currentQuestion.id) ? '移出错题本' : '加入错题本'}
              </Button>
            </div>

            <Title level={4} className={styles.questionTitle} style={{ fontSize: fontSize.question }}>
              {currentQuestion.question}
            </Title>

            <div className={styles.optionsContainer}>
              {renderOptions()}
            </div>

            {submitted && !showResult && !settings.showAnswerInstantly && (
              <div className={styles.resultSection}>
                <Alert
                  type="info"
                  showIcon
                  message="答案已提交，可查看解析或继续下一题"
                  action={
                    <Button size="small" type="primary" onClick={handleShowResult}>
                      查看解析
                    </Button>
                  }
                />
              </div>
            )}

            {submitted && showResult && (
              <div className={styles.resultSection}>
                <Result
                  status={isCorrect ? 'success' : 'error'}
                  title={isCorrect ? '回答正确！' : '回答错误'}
                  className={styles.result}
                />
                {!isCorrect && (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                      请选择错误类型（可选）：
                    </Text>
                    <Segmented
                      value={selectedWrongType}
                      onChange={handleWrongTypeSelect}
                      options={Object.entries(wrongTypeLabels).map(([value, label]) => ({
                        label,
                        value
                      }))}
                    />
                  </div>
                )}
                <div className={styles.explanation}>
                  <Title level={5}>答案解析</Title>
                  <Paragraph className={styles.explanationText}>
                    正确答案：<Text strong>{currentQuestion.answer.join('、')}</Text>
                  </Paragraph>
                  <Paragraph className={styles.explanationText}>
                    {currentQuestion.explanation}
                  </Paragraph>
                </div>
              </div>
            )}
          </Card>
        </Content>

        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <Button
              icon={<LeftOutlined />}
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              上一题
            </Button>

            {!submitted ? (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleSubmit}
                size="large"
                className={styles.submitBtn}
              >
                提交答案
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<RightOutlined />}
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                size="large"
                className={styles.submitBtn}
              >
                下一题
              </Button>
            )}

            <Button
              icon={<RightOutlined />}
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
            >
              下一题
            </Button>

            <Button
              icon={<DeleteOutlined />}
              onClick={handleClearProgress}
              danger
            >
              清除进度
            </Button>
          </div>
        </div>
      </Layout>
    </Layout>
  )
}

export default Practice
