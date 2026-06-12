import React, { useState, useMemo } from 'react'
import {
  Card,
  Button,
  Radio,
  Checkbox,
  Tag,
  Typography,
  Empty,
  message,
  Space,
  Select,
  Popconfirm,
  Modal,
  Result,
  InputNumber,
  Form,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Divider
} from 'antd'
import {
  FormOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  RedoOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  UnorderedListOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useWrongQuestionStore, WRONG_TYPES, wrongTypeLabels } from '../../stores/wrongQuestionStore'
import { useExamStore } from '../../stores/examStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useOperationLogStore, LOG_ACTIONS } from '../../stores/operationLogStore'
import styles from './WrongBook.module.css'

const { Title, Text } = Typography
const { Option } = Select

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function WrongBook() {
  const { categories, getCategoryName } = useCategoryStore()
  const { getQuestionById, getRandomQuestions } = useQuestionStore()
  const {
    wrongQuestions,
    removeWrongQuestion,
    clearAllWrong,
    batchRemoveWrongQuestions,
    getWrongCount,
    getWrongTypeStats,
    getWeakPointReport,
    markAsMastered,
    unmarkMastered,
    isMastered,
    getMasteredCount,
    getTotalWrongCount,
    exportWrongQuestions,
    setWrongType
  } = useWrongQuestionStore()
  const { startWrongExam, currentExam, submitExam, clearCurrentExam, setAnswer, toggleMark } = useExamStore()
  const { getFontSize } = useSettingsStore()
  const { addLog } = useOperationLogStore()

  const [viewMode, setViewMode] = useState('list')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [filterCategory, setFilterCategory] = useState(null)
  const [filterType, setFilterType] = useState(null)
  const [filterMinCount, setFilterMinCount] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [showExamSetup, setShowExamSetup] = useState(false)
  const [examForm] = Form.useForm()
  const [examStarted, setExamStarted] = useState(false)
  const [examFinished, setExamFinished] = useState(false)
  const [examCurrentIndex, setExamCurrentIndex] = useState(0)
  const [showMastered, setShowMastered] = useState(false)

  const filteredWrongQuestions = useMemo(() => {
    let result = [...wrongQuestions]

    if (!showMastered) {
      result = result.filter(w => !w.mastered)
    }

    if (filterCategory) {
      result = result.filter(w => {
        const q = getQuestionById(w.questionId)
        return q && q.categoryId === filterCategory
      })
    }

    if (filterType) {
      result = result.filter(w => {
        const q = getQuestionById(w.questionId)
        return q && q.type === filterType
      })
    }

    if (filterMinCount !== null && filterMinCount !== undefined) {
      result = result.filter(w => (w.wrongCount || 1) >= filterMinCount)
    }

    return result.sort((a, b) => (b.wrongCount || 1) - (a.wrongCount || 1))
  }, [wrongQuestions, showMastered, filterCategory, filterType, filterMinCount, getQuestionById])

  const fontSize = useMemo(() => getFontSize(), [getFontSize])

  const wrongTypeStats = useMemo(() => getWrongTypeStats(), [getWrongTypeStats])

  const weakPointReport = useMemo(() => getWeakPointReport(getQuestionById, getCategoryName), [getWeakPointReport, getQuestionById, getCategoryName])

  const examQuestions = useMemo(() => {
    if (!currentExam || !currentExam.isWrongExam) return []
    return currentExam.questionIds.map(id => getQuestionById(id)).filter(Boolean)
  }, [currentExam, getQuestionById])

  const currentWrong = filteredWrongQuestions[currentIndex]
  const currentQuestion = currentWrong ? getQuestionById(currentWrong.questionId) : null
  const currentExamQuestion = examQuestions[examCurrentIndex]
  const currentExamAnswer = currentExam?.answers?.[currentExamQuestion?.id] || []

  const stats = useMemo(() => {
    const typeCount = { single: 0, multiple: 0, judge: 0 }
    const categoryCount = {}
    let totalWrongTimes = 0
    wrongQuestions.forEach(w => {
      const q = getQuestionById(w.questionId)
      if (q) {
        typeCount[q.type] = (typeCount[q.type] || 0) + 1
        categoryCount[q.categoryId] = (categoryCount[q.categoryId] || 0) + 1
      }
      totalWrongTimes += w.wrongCount || 1
    })
    return { typeCount, categoryCount, totalWrongTimes }
  }, [wrongQuestions, getQuestionById])

  const handleRedo = () => {
    setUserAnswer([])
    setSubmitted(false)
    setIsCorrect(false)
  }

  const handleSingleSelect = (e) => {
    if (submitted) return
    setUserAnswer([e.target.value])
  }

  const handleMultipleChange = (checkedValues) => {
    if (submitted) return
    setUserAnswer(checkedValues)
  }

  const handleExamSingleSelect = (e) => {
    if (examFinished) return
    setAnswer(currentExamQuestion.id, [e.target.value])
  }

  const handleExamMultipleChange = (checkedValues) => {
    if (examFinished) return
    setAnswer(currentExamQuestion.id, checkedValues)
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

    if (correct) {
      Modal.confirm({
        title: '答对了！',
        icon: <ExclamationCircleOutlined style={{ color: '#52c41a' }} />,
        content: '这道题你已经答对了，是否从错题本中移除？',
        okText: '移出错题本',
        cancelText: '保留',
        onOk: () => {
          removeWrongQuestion(currentQuestion.id)
          message.success('已从错题本移除')
          if (currentIndex >= filteredWrongQuestions.length - 1 && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
          } else if (filteredWrongQuestions.length === 1) {
            setCurrentIndex(0)
          }
          handleRedo()
        }
      })
    }
  }

  const handleRemove = (questionId) => {
    removeWrongQuestion(questionId)
    setSelectedIds(prev => prev.filter(id => id !== questionId))
    message.success('已移除')
    if (currentIndex >= filteredWrongQuestions.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleToggleMastered = async (questionId) => {
    const mastered = isMastered(questionId)
    if (mastered) {
      await unmarkMastered(questionId)
      message.success('已取消掌握')
    } else {
      await markAsMastered(questionId)
      message.success('已标记为掌握')
      await addLog(LOG_ACTIONS.WRONG_QUESTION_MASTERED, { questionId })
    }
  }

  const handleWrongTypeChange = async (questionId, wrongType) => {
    await setWrongType(questionId, wrongType)
    message.success('错误类型已更新')
  }

  const handleExportWrongQuestions = () => {
    const jsonData = exportWrongQuestions(getQuestionById, getCategoryName, 'json')
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `错题本_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    addLog(LOG_ACTIONS.WRONG_QUESTION_EXPORT, { count: wrongQuestions.length })
    message.success('错题导出成功')
  }

  const handleBatchRemove = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要移除的错题')
      return
    }
    Modal.confirm({
      title: '批量移除',
      content: `确定要移除选中的 ${selectedIds.length} 道错题吗？`,
      okText: '确认移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await batchRemoveWrongQuestions(selectedIds)
        setSelectedIds([])
        message.success('已批量移除')
      }
    })
  }

  const handleClearAll = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有错题吗？此操作不可恢复。',
      okText: '确认清空',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        clearAllWrong()
        setSelectedIds([])
        setCurrentIndex(0)
        message.success('已清空错题本')
      }
    })
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setUserAnswer([])
      setSubmitted(false)
      setIsCorrect(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < filteredWrongQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setUserAnswer([])
      setSubmitted(false)
      setIsCorrect(false)
    }
  }

  const handleStartWrongExam = async () => {
    try {
      const values = await examForm.validateFields()
      const { questionCount, duration } = values

      if (filteredWrongQuestions.length === 0) {
        message.warning('当前筛选条件下没有错题')
        return
      }

      const availableIds = filteredWrongQuestions.map(w => w.questionId)
      const effectiveCount = Math.min(questionCount, availableIds.length)

      const questionPool = availableIds
        .sort(() => Math.random() - 0.5)
        .slice(0, effectiveCount)
        .map(id => getQuestionById(id))
        .filter(Boolean)

      if (questionPool.length === 0) {
        message.warning('没有可用的错题')
        return
      }

      await startWrongExam(questionPool, duration)
      setExamStarted(true)
      setExamFinished(false)
      setExamCurrentIndex(0)
      setShowExamSetup(false)
      message.success(`开始错题专项考试，共 ${questionPool.length} 道题`)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleSubmitExam = () => {
    Modal.confirm({
      title: '确认交卷',
      content: '确定要提交试卷吗？提交后无法修改答案。',
      okText: '确认交卷',
      cancelText: '继续答题',
      onOk: async () => {
        await submitExam(examQuestions)
        setExamFinished(true)
      }
    })
  }

  const handleExitExam = () => {
    Modal.confirm({
      title: '退出考试',
      content: '确定要退出本次错题专项考试吗？',
      okText: '确定退出',
      cancelText: '继续答题',
      onOk: () => {
        clearCurrentExam()
        setExamStarted(false)
        setExamFinished(false)
        setExamCurrentIndex(0)
        setViewMode('list')
      }
    })
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const renderOptions = (question, answer, disabled, onChangeSingle, onChangeMultiple) => {
    if (!question) return null

    const { type, options } = question

    if (type === 'single' || type === 'judge') {
      return (
        <Radio.Group
          value={answer[0]}
          onChange={onChangeSingle}
          className={styles.optionsGroup}
          disabled={disabled}
        >
          {options.map((opt, idx) => {
            const optionLabel = String.fromCharCode(65 + idx)
            const isCorrectOption = question.answer.includes(optionLabel)
            const isUserOption = answer.includes(optionLabel)

            let optionClass = styles.optionItem
            if (disabled && isCorrectOption) {
              optionClass += ' ' + styles.correctOption
            } else if (disabled && isUserOption && !isCorrectOption) {
              optionClass += ' ' + styles.wrongOption
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
        value={answer}
        onChange={onChangeMultiple}
        className={styles.optionsGroup}
        disabled={disabled}
      >
        {options.map((opt, idx) => {
          const optionLabel = String.fromCharCode(65 + idx)
          const isCorrectOption = question.answer.includes(optionLabel)
          const isUserOption = answer.includes(optionLabel)

          let optionClass = styles.optionItem
          if (disabled && isCorrectOption) {
            optionClass += ' ' + styles.correctOption
          } else if (disabled && isUserOption && !isCorrectOption) {
            optionClass += ' ' + styles.wrongOption
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

  if (examStarted) {
    if (examFinished && currentExam) {
      const accuracy = currentExam.accuracy || 0
      const correctCount = currentExam.correctCount || 0
      const wrongCount = currentExam.wrongCount || 0
      const totalCount = currentExam.totalCount || 0

      return (
        <div className={styles.container}>
          <Card className={styles.examResultCard}>
            <Result
              status={accuracy >= 60 ? 'success' : 'warning'}
              title={`错题专项考试结束，得分 ${accuracy} 分`}
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
                  prefix={<CheckOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="错误题数"
                  value={wrongCount}
                  prefix={<CloseOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>
            <div className={styles.resultQuestions}>
              <Title level={5}>答题详情</Title>
              {examQuestions.map((q, idx) => {
                const userAnswer = currentExam.answers[q.id] || []
                const correctAnswer = q.answer || []
                const isCorrect = userAnswer.length === correctAnswer.length &&
                  userAnswer.every(a => correctAnswer.includes(a))
                return (
                  <div
                    key={q.id}
                    className={`${styles.resultQuestionItem} ${!isCorrect ? styles.resultWrongItem : ''}`}
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
              block
              size="large"
              onClick={() => {
                clearCurrentExam()
                setExamStarted(false)
                setExamFinished(false)
                setExamCurrentIndex(0)
                setViewMode('list')
              }}
              style={{ marginTop: 16 }}
            >
              返回错题本
            </Button>
          </Card>
        </div>
      )
    }

    return (
      <div className={styles.container}>
        <div className={styles.examLayout}>
          <div className={styles.questionArea}>
            <Card className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <Space>
                  <Tag color="red">错题专项考试</Tag>
                  <Tag color={questionTypeMap[currentExamQuestion?.type]?.color}>
                    {questionTypeMap[currentExamQuestion?.type]?.label}
                  </Tag>
                  <Text type="secondary">
                    第 {examCurrentIndex + 1} / {examQuestions.length} 题
                  </Text>
                </Space>
              </div>
              <Title level={4} className={styles.questionTitle} style={{ fontSize: fontSize.question }}>
                {currentExamQuestion?.question}
              </Title>
              <div className={styles.optionsContainer}>
                {renderOptions(
                  currentExamQuestion,
                  currentExamAnswer,
                  examFinished,
                  handleExamSingleSelect,
                  handleExamMultipleChange
                )}
              </div>
            </Card>
            <div className={styles.actionBar}>
              <Button
                onClick={() => setExamCurrentIndex(Math.max(0, examCurrentIndex - 1))}
                disabled={examCurrentIndex === 0}
                icon={<LeftOutlined />}
              >
                上一题
              </Button>
              <Button
                type="primary"
                onClick={handleSubmitExam}
                size="large"
                icon={<FileTextOutlined />}
              >
                交卷
              </Button>
              <Button
                onClick={() => setExamCurrentIndex(Math.min(examQuestions.length - 1, examCurrentIndex + 1))}
                disabled={examCurrentIndex === examQuestions.length - 1}
                icon={<RightOutlined />}
              >
                下一题
              </Button>
            </div>
          </div>
          <div className={styles.sidebar}>
            <div className={styles.answerCard}>
              <div className={styles.answerCardTitle}>答题卡</div>
              <div className={styles.answerGrid}>
                {examQuestions.map((q, idx) => {
                  const answered = currentExam?.answers[q.id]?.length > 0
                  let dotClass = styles.answerDot
                  if (answered) dotClass += ' ' + styles.answeredDot
                  if (idx === examCurrentIndex) dotClass += ' ' + styles.currentDot
                  return (
                    <div
                      key={q.id}
                      className={dotClass}
                      onClick={() => setExamCurrentIndex(idx)}
                    >
                      {idx + 1}
                    </div>
                  )
                })}
              </div>
              <div className={styles.answerLegend}>
                <span><i className={styles.legendDot + ' ' + styles.answeredDot}></i>已答</span>
                <span><i className={styles.legendDot}></i>未答</span>
              </div>
            </div>
            <Button danger block onClick={handleExitExam}>
              退出考试
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (filteredWrongQuestions.length === 0) {
    return (
      <div className={styles.container}>
        <Card
          title={
            <span className={styles.cardTitle}>
              <FormOutlined className={styles.titleIcon} />
              错题本
            </span>
          }
          extra={
            <Space wrap>
              <Select
                placeholder="筛选分类"
                style={{ width: 140 }}
                allowClear
                value={filterCategory}
                onChange={setFilterCategory}
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
              <Select
                placeholder="筛选题型"
                style={{ width: 140 }}
                allowClear
                value={filterType}
                onChange={setFilterType}
              >
                <Option value="single">单选题</Option>
                <Option value="multiple">多选题</Option>
                <Option value="judge">判断题</Option>
              </Select>
              <Checkbox
                checked={showMastered}
                onChange={(e) => setShowMastered(e.target.checked)}
              >
                显示已掌握
              </Checkbox>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleExportWrongQuestions}
                disabled={wrongQuestions.length === 0}
              >
                导出错题
              </Button>
            </Space>
          }
          className={styles.card}
        >
          <Empty
            description={wrongQuestions.length === 0 ? "暂无错题，继续保持！" : "当前筛选条件下没有错题"}
            className={styles.empty}
          />
        </Card>
      </div>
    )
  }

  if (viewMode === 'list') {
    const hasSelected = selectedIds.length > 0

    return (
      <div className={styles.container}>
        <Card
          title={
            <span className={styles.cardTitle}>
              <FormOutlined className={styles.titleIcon} />
              错题本
              <Tag color="red" style={{ marginLeft: 8 }}>
                共 {filteredWrongQuestions.length} 道
              </Tag>
            </span>
          }
          extra={
            <Space wrap>
              <Select
                placeholder="筛选分类"
                style={{ width: 140 }}
                allowClear
                value={filterCategory}
                onChange={setFilterCategory}
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
              <Select
                placeholder="筛选题型"
                style={{ width: 140 }}
                allowClear
                value={filterType}
                onChange={setFilterType}
              >
                <Option value="single">单选题</Option>
                <Option value="multiple">多选题</Option>
                <Option value="judge">判断题</Option>
              </Select>
              <Select
                placeholder="最少做错次数"
                style={{ width: 140 }}
                allowClear
                value={filterMinCount}
                onChange={setFilterMinCount}
                suffixIcon={<FilterOutlined />}
              >
                <Option value={1}>≥ 1 次</Option>
                <Option value={2}>≥ 2 次</Option>
                <Option value={3}>≥ 3 次</Option>
                <Option value={5}>≥ 5 次</Option>
              </Select>
              <Checkbox
                checked={showMastered}
                onChange={(e) => setShowMastered(e.target.checked)}
              >
                显示已掌握
              </Checkbox>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleExportWrongQuestions}
                disabled={wrongQuestions.length === 0}
              >
                导出错题
              </Button>
              <Button
                icon={<RedoOutlined />}
                onClick={() => {
                  setCurrentIndex(0)
                  setUserAnswer([])
                  setSubmitted(false)
                  setIsCorrect(false)
                  setViewMode('practice')
                }}
              >
                逐题重做
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => setShowExamSetup(true)}
                disabled={filteredWrongQuestions.length === 0}
              >
                专项考试
              </Button>
              <Popconfirm
                title={`确定移除选中的 ${selectedIds.length} 道错题？`}
                onConfirm={handleBatchRemove}
                okText="确定"
                cancelText="取消"
                disabled={selectedIds.length === 0}
              >
                <Button
                  icon={<DeleteOutlined />}
                  disabled={selectedIds.length === 0}
                >
                  批量移除
                </Button>
              </Popconfirm>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleClearAll}
              >
                清空错题
              </Button>
            </Space>
          }
          className={styles.card}
        >
          {wrongQuestions.length > 0 && (
            <Row gutter={16} className={styles.statsOverview}>
              <Col xs={12} sm={6}>
                <Card size="small" className={styles.statCard}>
                  <Statistic
                    title="错题总数"
                    value={getTotalWrongCount()}
                    suffix="道"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" className={styles.statCard}>
                  <Statistic
                    title="已掌握"
                    value={getMasteredCount()}
                    suffix="道"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" className={styles.statCard}>
                  <Statistic
                    title="累计做错"
                    value={stats.totalWrongTimes}
                    suffix="次"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" className={styles.statCard}>
                  <Statistic
                    title="未掌握"
                    value={getWrongCount()}
                    suffix="道"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {wrongQuestions.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                  <span>薄弱点分析</span>
                </Space>
              }
              style={{ marginTop: 16 }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Title level={5} style={{ marginTop: 0 }}>错误类型分布</Title>
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary">总错题数：{weakPointReport.totalWrong} 道，累计做错 {weakPointReport.totalWrongTimes} 次</Text>
                  </div>
                  {Object.values(WRONG_TYPES).map(type => {
                    const stat = wrongTypeStats[type]
                    const percent = weakPointReport.totalWrong > 0 ? Math.round((stat?.count || 0) / weakPointReport.totalWrong * 100) : 0
                    return (
                      <div key={type} style={{ marginBottom: 8 }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text>{wrongTypeLabels[type]}</Text>
                          <Text type="secondary">{stat?.count || 0} 道 ({percent}%)</Text>
                        </Space>
                        <Progress
                          percent={percent}
                          showInfo={false}
                          size="small"
                          strokeColor={
                            type === WRONG_TYPES.CONCEPT ? '#ff4d4f' :
                            type === WRONG_TYPES.READING ? '#faad14' :
                            type === WRONG_TYPES.KNOWLEDGE_GAP ? '#722ed1' :
                            type === WRONG_TYPES.CARELESS ? '#1890ff' : '#8c8c8c'
                          }
                        />
                      </div>
                    )
                  })}
                </Col>
                <Col xs={24} md={12}>
                  <Title level={5} style={{ marginTop: 0 }}>Top 3 薄弱分类</Title>
                  {weakPointReport.topWeakCategories.length > 0 ? (
                    weakPointReport.topWeakCategories.map((cat, idx) => (
                      <div key={cat.category} style={{ marginBottom: 12, padding: 8, background: idx === 0 ? '#fff1f0' : idx === 1 ? '#fff7e6' : '#e6f7ff', borderRadius: 4 }}>
                        <Space>
                          <Tag color={idx === 0 ? 'red' : idx === 1 ? 'orange' : 'blue'}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} 第{idx + 1}名
                          </Tag>
                          <Text strong>{cat.category}</Text>
                        </Space>
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary">错题 {cat.count} 道，累计做错 {cat.wrongCount} 次</Text>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Text type="secondary">暂无数据</Text>
                  )}
                </Col>
              </Row>
            </Card>
          )}

          {hasSelected && (
            <div className={styles.batchBar}>
              <Space>
                <span>已选择 {selectedIds.length} 道错题</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setSelectedIds([])}
                >
                  取消选择
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={handleBatchRemove}
                >
                  批量移除
                </Button>
              </Space>
            </div>
          )}

          <div className={styles.wrongList}>
            {filteredWrongQuestions.map((w, idx) => {
              const q = getQuestionById(w.questionId)
              if (!q) return null
              const category = categories.find(c => c.id === q.categoryId)
              const isSelected = selectedIds.includes(w.questionId)
              const mastered = isMastered(w.questionId)

              return (
                <div key={w.questionId} className={`${styles.wrongItem} ${isSelected ? styles.selectedItem : ''}`}>
                  <div className={styles.wrongItemHeader}>
                    <Space wrap>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, w.questionId])
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== w.questionId))
                          }
                        }}
                      />
                      <Tag color={questionTypeMap[q.type]?.color}>
                        {questionTypeMap[q.type]?.label}
                      </Tag>
                      <Tag color="blue">{category?.name || '未分类'}</Tag>
                      {mastered && (
                        <Tag color="green">
                          <CheckOutlined /> 已掌握
                        </Tag>
                      )}
                      <Tooltip title="做错次数">
                        <Tag color="red">
                          <ExclamationCircleOutlined /> 做错 {w.wrongCount || 1} 次
                        </Tag>
                      </Tooltip>
                      <Tooltip title="首次出错时间">
                        <Text type="secondary" className={styles.wrongTime}>
                          <ClockCircleOutlined /> 首次：{formatDate(w.firstWrongTime || w.addTime)}
                        </Text>
                      </Tooltip>
                      {w.lastWrongTime && (
                        <Tooltip title="最近做错时间">
                          <Text type="secondary" className={styles.wrongTime}>
                            最近：{formatDate(w.lastWrongTime)}
                          </Text>
                        </Tooltip>
                      )}
                    </Space>
                    <Space wrap>
                      <Select
                        size="small"
                        style={{ width: 120 }}
                        value={w.wrongType || WRONG_TYPES.OTHER}
                        onChange={(value) => handleWrongTypeChange(w.questionId, value)}
                      >
                        {Object.values(WRONG_TYPES).map(type => (
                          <Option key={type} value={type}>{wrongTypeLabels[type]}</Option>
                        ))}
                      </Select>
                      <Button
                        type="link"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => handleToggleMastered(w.questionId)}
                      >
                        {mastered ? '取消掌握' : '标记已掌握'}
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        icon={<RedoOutlined />}
                        onClick={() => {
                          setCurrentIndex(idx)
                          setUserAnswer([])
                          setSubmitted(false)
                          setIsCorrect(false)
                          setViewMode('practice')
                        }}
                      >
                        重做
                      </Button>
                      <Popconfirm
                        title="确定移除此题？"
                        onConfirm={() => handleRemove(w.questionId)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        >
                          移除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                  <div className={styles.wrongItemQuestion}>
                    <Text strong style={{ fontSize: fontSize.question }}>第 {idx + 1} 题. </Text>
                    <span style={{ fontSize: fontSize.question }}>{q.question}</span>
                  </div>
                  <div className={styles.wrongItemAnswer}>
                    <Text type="secondary">
                      正确答案：<Text strong>{q.answer.join('、')}</Text>
                    </Text>
                    {w.lastWrongAnswer && w.lastWrongAnswer.length > 0 && (
                      <Text type="secondary" style={{ marginLeft: 16 }}>
                        最近错误答案：<Text strong style={{ color: '#ff4d4f' }}>{w.lastWrongAnswer.join('、')}</Text>
                      </Text>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Modal
          title={
            <span>
              <PlayCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              错题专项考试设置
            </span>
          }
          open={showExamSetup}
          onCancel={() => setShowExamSetup(false)}
          footer={null}
          destroyOnClose
        >
          <Form form={examForm} layout="vertical">
            <div className={styles.examSetupTip}>
              当前筛选条件下共有 <strong>{filteredWrongQuestions.length}</strong> 道错题可用
            </div>
            <Form.Item
              name="questionCount"
              label="题目数量"
              rules={[{ required: true, message: '请输入题目数量' }]}
              initialValue={Math.min(10, filteredWrongQuestions.length)}
            >
              <InputNumber
                min={1}
                max={filteredWrongQuestions.length}
                style={{ width: '100%' }}
                placeholder={`请输入题目数量（最多 ${filteredWrongQuestions.length} 道）`}
              />
            </Form.Item>
            <Form.Item
              name="duration"
              label="考试时长（分钟）"
              rules={[{ required: true, message: '请输入考试时长' }]}
              initialValue={Math.max(10, Math.min(30, filteredWrongQuestions.length * 2))}
            >
              <InputNumber
                min={5}
                max={180}
                style={{ width: '100%' }}
                placeholder="请输入考试时长"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowExamSetup(false)}>
                  取消
                </Button>
                <Button type="primary" onClick={handleStartWrongExam}>
                  开始考试
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Card
        title={
          <span className={styles.cardTitle}>
            <FormOutlined className={styles.titleIcon} />
            错题重做
            <Tag color="red" style={{ marginLeft: 8 }}>
              剩余 {filteredWrongQuestions.length} 道
            </Tag>
          </span>
        }
        extra={
          <Space>
            <Button icon={<UnorderedListOutlined />} onClick={() => setViewMode('list')}>
              返回列表
            </Button>
          </Space>
        }
        className={styles.card}
      >
        <div className={styles.practiceContainer}>
          <div className={styles.questionHeader}>
            <Space wrap>
              <Tag color={questionTypeMap[currentQuestion?.type]?.color}>
                {questionTypeMap[currentQuestion?.type]?.label}
              </Tag>
              <Tag color="blue">
                {categories.find(c => c.id === currentQuestion?.categoryId)?.name || '未分类'}
              </Tag>
              <Text type="secondary">
                第 {currentIndex + 1} / {filteredWrongQuestions.length} 题
              </Text>
              <Tooltip title="做错次数">
                <Tag color="red">
                  <ExclamationCircleOutlined /> 做错 {currentWrong?.wrongCount || 1} 次
                </Tag>
              </Tooltip>
              <Tooltip title="首次出错">
                <Text type="secondary">
                  <ClockCircleOutlined /> {formatDate(currentWrong?.firstWrongTime || currentWrong?.addTime)}
                </Text>
              </Tooltip>
            </Space>
            <Space>
              <Button
                icon={<RedoOutlined />}
                onClick={handleRedo}
                size="small"
              >
                重置答案
              </Button>
              <Popconfirm
                title="确定移除此题？"
                onConfirm={() => handleRemove(currentQuestion.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                >
                  移出错题本
                </Button>
              </Popconfirm>
            </Space>
          </div>

          <Title level={4} className={styles.questionTitle} style={{ fontSize: fontSize.question }}>
            {currentQuestion?.question}
          </Title>

          <div className={styles.optionsContainer}>
            {renderOptions(
              currentQuestion,
              userAnswer,
              submitted,
              handleSingleSelect,
              handleMultipleChange
            )}
          </div>

          {submitted && (
            <div className={styles.resultSection}>
              <Result
                status={isCorrect ? 'success' : 'error'}
                title={isCorrect ? '回答正确！' : '回答错误'}
                className={styles.result}
              />
              <div className={styles.explanation}>
                <Title level={5}>答案解析</Title>
                <p>
                  正确答案：<Text strong>{currentQuestion.answer.join('、')}</Text>
                </p>
                <p>
                  你的答案：
                  <Text strong style={{ color: isCorrect ? '#3f8600' : '#cf1322' }}>
                    {userAnswer.length > 0 ? userAnswer.join('、') : '未作答'}
                  </Text>
                </p>
                <p className={styles.explanationText}>
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          )}

          <div className={styles.actionBar}>
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
                disabled={currentIndex === filteredWrongQuestions.length - 1}
                size="large"
                className={styles.submitBtn}
              >
                下一题
              </Button>
            )}

            <Button
              icon={<RightOutlined />}
              onClick={handleNext}
              disabled={currentIndex === filteredWrongQuestions.length - 1}
            >
              跳过
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default WrongBook
