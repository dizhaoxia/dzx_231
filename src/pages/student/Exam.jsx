import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Card,
  Button,
  Radio,
  Checkbox,
  Tag,
  Typography,
  Form,
  Select,
  InputNumber,
  Statistic,
  Row,
  Col,
  Progress,
  Result,
  Modal,
  message,
  Space,
  Empty,
  Tooltip,
  Divider,
  Alert,
  Spin,
  Switch
} from 'antd'
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined,
  FlagOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ArrowUpOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useExamStore } from '../../stores/examStore'
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import styles from './Exam.module.css'

const { Title, Text } = Typography
const { Option } = Select

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function Exam() {
  const { categories, getEnabledCategories } = useCategoryStore()
  const { getRandomQuestions, getQuestionById, getActiveQuestionsByCategory } = useQuestionStore()
  const {
    currentExam,
    startExam,
    setAnswer,
    toggleMark,
    submitExam,
    clearCurrentExam,
    setHalfTimeAlerted,
    setFiveMinAlerted,
    saveAnswerCache,
    hasCachedExam,
    recoverCachedExam,
    getShuffledOptions
  } = useExamStore()
  const { addWrongQuestion } = useWrongQuestionStore()
  const { settings, getFontSize } = useSettingsStore()

  const [examStarted, setExamStarted] = useState(false)
  const [examFinished, setExamFinished] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [form] = Form.useForm()
  const timerRef = useRef(null)
  const debounceRef = useRef(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveredExam, setRecoveredExam] = useState(null)
  const [checkingCache, setCheckingCache] = useState(true)

  const enabledCategories = getEnabledCategories()

  const fontSize = getFontSize()

  const examQuestions = useMemo(() => {
    if (!currentExam) return []
    return currentExam.questionIds.map(id => getQuestionById(id)).filter(Boolean)
  }, [currentExam, getQuestionById])

  const currentQuestion = examQuestions[currentIndex]

  useEffect(() => {
    const checkCache = async () => {
      try {
        if (currentExam && !currentExam.submitted) {
          const elapsed = Date.now() - currentExam.startTime
          const remaining = Math.max(0, currentExam.duration - elapsed)
          if (remaining <= 0) {
            message.warning('考试已超时，自动交卷')
            const questions = currentExam.questionIds.map(id => getQuestionById(id)).filter(Boolean)
            await submitExam(questions)
            setExamFinished(true)
            setExamStarted(true)
            setCheckingCache(false)
            return
          }
          setRecoveredExam(currentExam)
          setShowRecovery(true)
          setCheckingCache(false)
          return
        }
        const exists = await hasCachedExam()
        if (exists) {
          const cached = await recoverCachedExam()
          if (cached) {
            const elapsed = Date.now() - cached.startTime
            const remaining = Math.max(0, cached.duration - elapsed)
            if (remaining <= 0) {
              message.warning('考试已超时，自动交卷')
              const questions = cached.questionIds.map(id => getQuestionById(id)).filter(Boolean)
              await submitExam(questions)
              setExamFinished(true)
              setExamStarted(true)
              setCheckingCache(false)
              return
            }
            setRecoveredExam(cached)
            setShowRecovery(true)
          }
        }
      } catch (e) {
        console.error('Check cache error:', e)
      }
      setCheckingCache(false)
    }
    checkCache()
  }, [])

  useEffect(() => {
    if (examStarted && timeLeft > 0 && !examFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleAutoSubmit()
            return 0
          }

          const newTime = prev - 1

          if (currentExam && !currentExam.halfTimeAlerted) {
            const totalSeconds = currentExam.duration / 1000
            if (newTime <= totalSeconds / 2) {
              setHalfTimeAlerted()
              Modal.info({
                title: '时间过半提醒',
                icon: <ClockCircleOutlined style={{ color: '#faad14' }} />,
                content: `考试时间已过半，还剩 ${formatTime(newTime)}，请注意答题速度。`,
                okText: '我知道了'
              })
            }
          }

          if (currentExam && !currentExam.fiveMinAlerted) {
            if (newTime <= 300 && newTime > 299) {
              setFiveMinAlerted()
              Modal.warning({
                title: '最后 5 分钟提醒',
                icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
                content: '距离考试结束还有 5 分钟，请抓紧时间作答并准备交卷。',
                okText: '我知道了'
              })
            }
          }

          return newTime
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [examStarted, examFinished, currentExam, setHalfTimeAlerted, setFiveMinAlerted])

  const debouncedSaveCache = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      saveAnswerCache()
    }, 500)
  }, [saveAnswerCache])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!examStarted || examFinished) return

      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      )

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex(prev => Math.min(examQuestions.length - 1, prev + 1))
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        handleToggleMark()
      } else if (e.key === 'Enter' && !isInputFocused) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [examStarted, examFinished, examQuestions.length, currentExam])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartExam = async () => {
    try {
      const values = await form.validateFields()
      const { categoryIds, questionTypes, questionCount, duration, shuffleQuestions, shuffleOptions } = values

      const effectiveCategoryIds = categoryIds && categoryIds.length > 0
        ? categoryIds
        : enabledCategories.map(c => c.id)

      let totalAvailable = 0
      if (effectiveCategoryIds.length > 0 && questionTypes && questionTypes.length > 0) {
        const pool = getRandomQuestions({
          categoryIds: effectiveCategoryIds,
          types: questionTypes,
          count: 9999
        })
        totalAvailable = pool.length
      } else if (effectiveCategoryIds.length > 0) {
        effectiveCategoryIds.forEach(cid => {
          totalAvailable += getActiveQuestionsByCategory(cid).length
        })
      }

      if (totalAvailable === 0) {
        message.warning('当前筛选条件下没有可用题目，请调整条件后重试')
        return
      }

      const effectiveCount = Math.min(questionCount, totalAvailable)
      const questions = getRandomQuestions({
        categoryIds: effectiveCategoryIds,
        types: questionTypes && questionTypes.length > 0 ? questionTypes : null,
        count: effectiveCount
      })

      if (questions.length === 0) {
        message.warning('没有找到符合条件的题目')
        return
      }

      await startExam(questions, duration, { shuffleQuestions, shuffleOptions })
      setTimeLeft(duration * 60)
      setExamStarted(true)
      setExamFinished(false)
      setCurrentIndex(0)
      setShowRecovery(false)
      message.success(`开始考试，共 ${questions.length} 道题，时长 ${duration} 分钟`)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleRecoverExam = () => {
    if (recoveredExam) {
      const elapsed = Date.now() - recoveredExam.startTime
      const remaining = Math.max(0, recoveredExam.duration - elapsed)
      if (remaining <= 0) {
        message.warning('考试已超时，自动交卷')
        const questions = recoveredExam.questionIds.map(id => getQuestionById(id)).filter(Boolean)
        submitExam(questions)
        setExamFinished(true)
        setExamStarted(true)
        setShowRecovery(false)
        return
      }
      setTimeLeft(Math.floor(remaining / 1000))
      setExamStarted(true)
      setExamFinished(false)
      setShowRecovery(false)
      message.success('已恢复上次未完成的考试')
    }
  }

  const handleDiscardRecovery = async () => {
    Modal.confirm({
      title: '确认放弃',
      content: '确定要放弃上次未完成的考试吗？所有答题记录将被清除。',
      okText: '确认放弃',
      cancelText: '继续恢复',
      okButtonProps: { danger: true },
      onOk: async () => {
        await clearCurrentExam()
        setShowRecovery(false)
        setRecoveredExam(null)
        message.info('已清除未完成的考试记录')
      }
    })
  }

  const handleAutoSubmit = async () => {
    if (!currentExam || examFinished) return
    message.info('考试时间到，自动交卷')
    await doSubmit()
  }

  const handleSubmit = () => {
    const unanswered = examQuestions.filter(q => {
      const ans = currentExam?.answers[q.id] || []
      return ans.length === 0
    })

    const content = unanswered.length > 0
      ? `您还有 ${unanswered.length} 道题未作答，确定要提交试卷吗？提交后无法修改答案。`
      : '确定要提交试卷吗？提交后无法修改答案。'

    Modal.confirm({
      title: '确认交卷',
      content,
      okText: '确认交卷',
      cancelText: '继续答题',
      onOk: doSubmit
    })
  }

  const doSubmit = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const result = await submitExam(examQuestions)
    setExamFinished(true)

    examQuestions.forEach(q => {
      const userAnswer = currentExam?.answers[q.id] || []
      const correctAnswer = q.answer || []
      const isCorrect = userAnswer.length === correctAnswer.length &&
        userAnswer.every(a => correctAnswer.includes(a))
      if (!isCorrect) {
        addWrongQuestion(q.id, userAnswer)
      }
    })
  }

  const handleAnswerChange = (questionId, answer) => {
    if (examFinished) return
    setAnswer(questionId, answer)
    debouncedSaveCache()
  }

  const handleSingleSelect = (e) => {
    handleAnswerChange(currentQuestion.id, [e.target.value])
  }

  const handleMultipleChange = (checkedValues) => {
    handleAnswerChange(currentQuestion.id, checkedValues)
  }

  const handleToggleMark = () => {
    if (examFinished) return
    toggleMark(currentQuestion.id)
  }

  const handleBackToStart = () => {
    clearCurrentExam()
    setExamStarted(false)
    setExamFinished(false)
    setCurrentIndex(0)
    setTimeLeft(0)
  }

  const scrollToTop = () => {
    const card = document.querySelector(`.${styles.questionCard}`)
    if (card) {
      card.scrollTop = 0
    }
  }

  const currentAnswer = currentExam?.answers[currentQuestion?.id] || []
  const currentMarked = currentExam?.marked?.[currentQuestion?.id] || false

  const answeredCount = useMemo(() => {
    if (!currentExam) return 0
    return Object.values(currentExam.answers).filter(a => a && a.length > 0).length
  }, [currentExam])

  const markedCount = useMemo(() => {
    if (!currentExam || !currentExam.marked) return 0
    return Object.values(currentExam.marked).filter(Boolean).length
  }, [currentExam])

  const unansweredIndices = useMemo(() => {
    const indices = []
    examQuestions.forEach((q, idx) => {
      const ans = currentExam?.answers[q.id] || []
      if (ans.length === 0) indices.push(idx)
    })
    return indices
  }, [examQuestions, currentExam])

  const goToNextUnanswered = () => {
    if (unansweredIndices.length === 0) {
      message.info('所有题目都已作答')
      return
    }
    const nextIdx = unansweredIndices.find(i => i > currentIndex)
    setCurrentIndex(nextIdx !== undefined ? nextIdx : unansweredIndices[0])
  }

  const renderOptions = () => {
    if (!currentQuestion) return null

    const { type, options } = currentQuestion
    const shuffledOptions = currentExam?.shuffleOptions
      ? getShuffledOptions(currentQuestion.id, currentQuestion)
      : null
    const isShuffled = shuffledOptions && Array.isArray(shuffledOptions[0]) === false && typeof shuffledOptions[0] === 'object'

    if (type === 'single' || type === 'judge') {
      return (
        <Radio.Group
          value={currentAnswer[0]}
          onChange={handleSingleSelect}
          className={styles.optionsGroup}
          disabled={examFinished}
        >
          {(isShuffled ? shuffledOptions : options).map((opt, idx) => {
            const optionLabel = String.fromCharCode(65 + idx)
            const originalLabel = isShuffled ? opt.originalLabel : optionLabel
            const optionText = isShuffled ? opt.text : opt
            const isCorrectOption = currentQuestion.answer.includes(originalLabel)
            const isUserOption = currentAnswer.includes(optionLabel)

            let optionClass = styles.optionItem
            if (examFinished) {
              if (isCorrectOption) {
                optionClass += ' ' + styles.correctOption
              } else if (isUserOption && !isCorrectOption) {
                optionClass += ' ' + styles.wrongOption
              }
            }

            return (
              <Radio key={idx} value={optionLabel} className={optionClass}>
                <span className={styles.optionLabel} style={{ fontSize: fontSize.option }}>{optionLabel}.</span>
                <span className={styles.optionText} style={{ fontSize: fontSize.option }}>{optionText}</span>
              </Radio>
            )
          })}
        </Radio.Group>
      )
    }

    return (
      <Checkbox.Group
        value={currentAnswer}
        onChange={handleMultipleChange}
        className={styles.optionsGroup}
        disabled={examFinished}
      >
        {(isShuffled ? shuffledOptions : options).map((opt, idx) => {
          const optionLabel = String.fromCharCode(65 + idx)
          const originalLabel = isShuffled ? opt.originalLabel : optionLabel
          const optionText = isShuffled ? opt.text : opt
          const isCorrectOption = currentQuestion.answer.includes(originalLabel)
          const isUserOption = currentAnswer.includes(optionLabel)

          let optionClass = styles.optionItem
          if (examFinished) {
            if (isCorrectOption) {
              optionClass += ' ' + styles.correctOption
            } else if (isUserOption && !isCorrectOption) {
              optionClass += ' ' + styles.wrongOption
            }
          }

          return (
            <Checkbox key={idx} value={optionLabel} className={optionClass}>
              <span className={styles.optionLabel} style={{ fontSize: fontSize.option }}>{optionLabel}.</span>
              <span className={styles.optionText} style={{ fontSize: fontSize.option }}>{optionText}</span>
            </Checkbox>
          )
        })}
      </Checkbox.Group>
    )
  }

  const renderAnswerCard = () => {
    return (
      <div className={styles.answerCard}>
        <div className={styles.answerCardTitle}>答题卡</div>
        <div className={styles.answerGrid}>
          {examQuestions.map((q, idx) => {
            const answered = currentExam?.answers[q.id]?.length > 0
            const marked = currentExam?.marked?.[q.id]
            let status = 'unanswered'
            if (examFinished) {
              const userAnswer = currentExam?.answers[q.id] || []
              const correctAnswer = q.answer || []
              const isCorrect = userAnswer.length === correctAnswer.length &&
                userAnswer.every(a => correctAnswer.includes(a))
              status = isCorrect ? 'correct' : 'wrong'
            } else if (answered) {
              status = 'answered'
            }

            let dotClass = styles.answerDot
            if (status === 'answered') dotClass += ' ' + styles.answeredDot
            if (status === 'correct') dotClass += ' ' + styles.correctDot
            if (status === 'wrong') dotClass += ' ' + styles.wrongDot
            if (idx === currentIndex) dotClass += ' ' + styles.currentDot
            if (marked) dotClass += ' ' + styles.markedDot

            return (
              <Tooltip
                key={q.id}
                title={
                  <span>
                    第 {idx + 1} 题
                    {marked && ' ⚑ 已标记'}
                    {!answered && !examFinished && ' (未作答)'}
                  </span>
                }
              >
                <div
                  className={dotClass}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                  {marked && <span className={styles.markBadge}>⚑</span>}
                </div>
              </Tooltip>
            )
          })}
        </div>
        <div className={styles.answerLegend}>
          <span><i className={styles.legendDot + ' ' + styles.answeredDot}></i>已答</span>
          <span><i className={styles.legendDot}></i>未答</span>
          <span><i className={styles.legendDot + ' ' + styles.markedDot}></i>标记</span>
          {examFinished && (
            <>
              <span><i className={styles.legendDot + ' ' + styles.correctDot}></i>正确</span>
              <span><i className={styles.legendDot + ' ' + styles.wrongDot}></i>错误</span>
            </>
          )}
        </div>
      </div>
    )
  }

  if (checkingCache) {
    return (
      <div className={styles.container} style={{ fontSize: fontSize.question }}>
        <Card className={styles.startCard}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="检查考试记录..." />
          </div>
        </Card>
      </div>
    )
  }

  if (!examStarted) {
    if (showRecovery && recoveredExam) {
      const elapsed = Date.now() - recoveredExam.startTime
      const remaining = Math.max(0, recoveredExam.duration - elapsed)
      return (
        <div className={styles.container} style={{ fontSize: fontSize.question }}>
          <Card className={styles.startCard}>
            <Alert
              message="检测到未完成的考试"
              description={`您有一场未完成的考试，剩余时间约 ${formatTime(Math.floor(remaining / 1000))}，共 ${recoveredExam.questionIds.length} 道题目。是否继续？`}
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleRecoverExam}
                size="large"
              >
                继续上次考试
              </Button>
              <Button onClick={handleDiscardRecovery} size="large">
                放弃并重新开始
              </Button>
            </Space>
          </Card>
        </div>
      )
    }

    return (
      <div className={styles.container} style={{ fontSize: fontSize.question }}>
        <Card
          title={
            <span className={styles.cardTitle}>
              <FileTextOutlined className={styles.titleIcon} />
              智能组卷考试
            </span>
          }
          className={styles.startCard}
        >
          <Form form={form} layout="vertical" className={styles.startForm}>
            <Form.Item
              name="categoryIds"
              label="题库分类（可多选，不选则包含全部）"
            >
              <Select
                mode="multiple"
                placeholder="选择分类（默认全部）"
                allowClear
                optionFilterProp="children"
              >
                {enabledCategories.map(cat => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name} ({getActiveQuestionsByCategory(cat.id).length} 题)
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="questionTypes"
              label="题目类型（可多选，不选则包含全部）"
            >
              <Select
                mode="multiple"
                placeholder="选择题型（默认全部）"
                allowClear
              >
                <Option value="single">单选题</Option>
                <Option value="multiple">多选题</Option>
                <Option value="judge">判断题</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="questionCount"
              label="题目数量"
              rules={[{ required: true, message: '请输入题目数量' }]}
              initialValue={10}
            >
              <InputNumber
                min={1}
                max={200}
                style={{ width: '100%' }}
                placeholder="请输入题目数量"
              />
            </Form.Item>

            <Form.Item
              name="duration"
              label="考试时长（分钟）"
              rules={[{ required: true, message: '请输入考试时长' }]}
              initialValue={30}
            >
              <InputNumber
                min={5}
                max={180}
                style={{ width: '100%' }}
                placeholder="请输入考试时长"
              />
            </Form.Item>

            <Form.Item
              name="shuffleQuestions"
              label="随机打乱题目顺序"
              valuePropName="checked"
              initialValue={settings.shuffleQuestions}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="shuffleOptions"
              label="随机打乱选项顺序"
              valuePropName="checked"
              initialValue={settings.shuffleOptions}
            >
              <Switch />
            </Form.Item>

            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartExam}
              block
              className={styles.startBtn}
            >
              开始随机组卷考试
            </Button>
          </Form>
        </Card>
      </div>
    )
  }

  if (examFinished && currentExam) {
    const accuracy = currentExam.accuracy || 0
    const correctCount = currentExam.correctCount || 0
    const wrongCount = currentExam.wrongCount || 0
    const totalCount = currentExam.totalCount || 0

    return (
      <div className={styles.container} style={{ fontSize: fontSize.question }}>
        <Card className={styles.resultCard}>
          <Result
            status={accuracy >= 60 ? 'success' : 'warning'}
            title={`考试结束，得分 ${accuracy} 分`}
            subTitle={`共 ${totalCount} 道题，正确 ${correctCount} 道，错误 ${wrongCount} 道`}
          />

          <Row gutter={16} className={styles.statsRow}>
            <Col span={8}>
              <Statistic
                title="正确率"
                value={accuracy}
                suffix="%"
                valueStyle={{ color: accuracy >= 60 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="正确题数"
                value={correctCount}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="错误题数"
                value={wrongCount}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseOutlined />}
              />
            </Col>
          </Row>

          <div className={styles.resultQuestions}>
            <Title level={5}>
              答题详情（逐题复盘）
              <Tooltip title="回到顶部">
                <Button
                  type="text"
                  icon={<ArrowUpOutlined />}
                  onClick={scrollToTop}
                  size="small"
                  style={{ marginLeft: 12 }}
                >
                  顶部
                </Button>
              </Tooltip>
            </Title>
            {examQuestions.map((q, idx) => {
              const userAnswer = currentExam.answers[q.id] || []
              const correctAnswer = q.answer || []
              const isCorrect = userAnswer.length === correctAnswer.length &&
                userAnswer.every(a => correctAnswer.includes(a))

              return (
                <div
                  key={q.id}
                  className={`${styles.resultQuestionItem} ${!isCorrect ? styles.resultWrongItem : ''}`}
                  id={`question-${idx}`}
                >
                  <div className={styles.resultQuestionHeader}>
                    <Space>
                      <Tag color={isCorrect ? 'green' : 'red'}>
                        {isCorrect ? '✓ 正确' : '✗ 错误'}
                      </Tag>
                      <Tag color={questionTypeMap[q.type]?.color}>
                        {questionTypeMap[q.type]?.label}
                      </Tag>
                      <Text type="secondary">第 {idx + 1} 题</Text>
                    </Space>
                  </div>
                  <div className={styles.resultQuestionText}>
                    <Text strong style={{ fontSize: fontSize.question }}>{q.question}</Text>
                  </div>
                  <div className={styles.resultOptions}>
                    {q.options.map((opt, oIdx) => {
                      const label = String.fromCharCode(65 + oIdx)
                      const isCorrectOpt = correctAnswer.includes(label)
                      const isUserOpt = userAnswer.includes(label)
                      let optClass = styles.resultOptionItem
                      if (isCorrectOpt) optClass += ' ' + styles.resultCorrectOption
                      if (isUserOpt && !isCorrectOpt) optClass += ' ' + styles.resultWrongOption
                      return (
                        <div key={oIdx} className={optClass}>
                          <Text style={{ fontSize: fontSize.option }}>
                            <strong>{label}.</strong> {opt}
                            {isCorrectOpt && <Tag color="green" style={{ marginLeft: 8 }}>正确答案</Tag>}
                            {isUserOpt && !isCorrectOpt && <Tag color="red" style={{ marginLeft: 8 }}>你的选择</Tag>}
                            {isUserOpt && isCorrectOpt && <Tag color="blue" style={{ marginLeft: 8 }}>你选对了</Tag>}
                          </Text>
                        </div>
                      )
                    })}
                  </div>
                  <div className={styles.resultAnswer}>
                    <div>
                      <Text type="secondary">你的答案：</Text>
                      <Text strong style={{ color: isCorrect ? '#3f8600' : '#cf1322' }}>
                        {userAnswer.length > 0 ? userAnswer.join('、') : '未作答'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">正确答案：</Text>
                      <Text strong style={{ color: '#3f8600' }}>
                        {correctAnswer.join('、')}
                      </Text>
                    </div>
                  </div>
                  <div className={styles.resultExplanation}>
                    <Text strong>💡 答案解析：</Text>
                    <Text style={{ marginLeft: 4 }}>{q.explanation}</Text>
                  </div>
                </div>
              )
            })}
          </div>

          <Button
            type="primary"
            onClick={handleBackToStart}
            block
            size="large"
            className={styles.backBtn}
          >
            返回考试首页
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.container} style={{ fontSize: fontSize.question }}>
      <div className={styles.examLayout}>
        <div className={styles.questionArea}>
          <Card className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <Space>
                <Tag color={questionTypeMap[currentQuestion?.type]?.color}>
                  {questionTypeMap[currentQuestion?.type]?.label}
                </Tag>
                <Text type="secondary">
                  第 {currentIndex + 1} / {examQuestions.length} 题
                </Text>
                {currentMarked && (
                  <Tag color="orange" icon={<FlagOutlined />}>已标记</Tag>
                )}
              </Space>
              <div className={styles.timer}>
                <ClockCircleOutlined className={styles.timerIcon} />
                <span className={timeLeft <= 300 ? styles.timerWarning : ''}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <Title level={4} className={styles.questionTitle} style={{ fontSize: fontSize.title }}>
              {currentQuestion?.question}
            </Title>

            <div className={styles.optionsContainer}>
              {renderOptions()}
            </div>

            {examFinished && currentQuestion && (
              <div className={styles.explanationSection}>
                <Title level={5}>答案解析</Title>
                <Text type="secondary">
                  正确答案：{currentQuestion.answer.join('、')}
                </Text>
                <p className={styles.explanationText}>
                  {currentQuestion.explanation}
                </p>
              </div>
            )}
          </Card>

          <div className={styles.actionBar}>
            <Space>
              <Button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                上一题
              </Button>
              <Button
                onClick={goToNextUnanswered}
                icon={<ExclamationCircleOutlined />}
              >
                下一题未答 ({unansweredIndices.length})
              </Button>
              <Button
                onClick={handleToggleMark}
                icon={<FlagOutlined />}
                type={currentMarked ? 'primary' : 'default'}
                disabled={examFinished}
              >
                {currentMarked ? '取消标记' : '标记此题'}
              </Button>
            </Space>
            <Button
              type="primary"
              onClick={handleSubmit}
              size="large"
              className={styles.submitBtn}
            >
              交卷
            </Button>
            <Button
              onClick={() => setCurrentIndex(Math.min(examQuestions.length - 1, currentIndex + 1))}
              disabled={currentIndex === examQuestions.length - 1}
            >
              下一题
            </Button>
          </div>
        </div>

        <div className={styles.sidebar}>
          {renderAnswerCard()}
          <div className={styles.progressCard}>
            <Text type="secondary">答题进度</Text>
            <Progress
              percent={Math.round((answeredCount / examQuestions.length) * 100)}
              size="small"
              className={styles.progress}
            />
            <Space className={styles.progressDetail}>
              <Text type="secondary">
                已答 {answeredCount} / {examQuestions.length} 题
              </Text>
              {markedCount > 0 && (
                <Text type="secondary">
                  <FlagOutlined style={{ color: '#faad14' }} /> 标记 {markedCount}
                </Text>
              )}
            </Space>
          </div>
          <Alert
            message="自动保存已开启"
            description="作答实时保存，意外退出可恢复"
            type="success"
            showIcon
            icon={<ReloadOutlined />}
          />
        </div>
      </div>
    </div>
  )
}

export default Exam
