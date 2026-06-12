import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  Empty
} from 'antd'
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useExamStore } from '../../stores/examStore'
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore'
import styles from './Exam.module.css'

const { Title, Text } = Typography
const { Option } = Select

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function Exam() {
  const { categories } = useCategoryStore()
  const { getQuestionsByCategory, getQuestionById } = useQuestionStore()
  const { currentExam, startExam, setAnswer, submitExam, clearCurrentExam } = useExamStore()
  const { addWrongQuestion } = useWrongQuestionStore()

  const [examStarted, setExamStarted] = useState(false)
  const [examFinished, setExamFinished] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [form] = Form.useForm()
  const timerRef = useRef(null)

  const examQuestions = useMemo(() => {
    if (!currentExam) return []
    return currentExam.questionIds.map(id => getQuestionById(id)).filter(Boolean)
  }, [currentExam, getQuestionById])

  const currentQuestion = examQuestions[currentIndex]

  useEffect(() => {
    if (examStarted && timeLeft > 0 && !examFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [examStarted, examFinished])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartExam = async () => {
    try {
      const values = await form.validateFields()
      const { categoryId, duration } = values

      const questions = getQuestionsByCategory(categoryId)
      if (questions.length === 0) {
        message.warning('该分类下没有题目')
        return
      }

      startExam(questions, duration)
      setTimeLeft(duration * 60)
      setExamStarted(true)
      setExamFinished(false)
      setCurrentIndex(0)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleAutoSubmit = async () => {
    if (!currentExam || examFinished) return

    message.info('考试时间到，自动交卷')
    await doSubmit()
  }

  const handleSubmit = () => {
    Modal.confirm({
      title: '确认交卷',
      content: '确定要提交试卷吗？提交后无法修改答案。',
      okText: '确认交卷',
      cancelText: '继续答题',
      onOk: doSubmit
    })
  }

  const doSubmit = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
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
  }

  const handleSingleSelect = (e) => {
    handleAnswerChange(currentQuestion.id, [e.target.value])
  }

  const handleMultipleChange = (checkedValues) => {
    handleAnswerChange(currentQuestion.id, checkedValues)
  }

  const handleBackToStart = () => {
    clearCurrentExam()
    setExamStarted(false)
    setExamFinished(false)
    setCurrentIndex(0)
    setTimeLeft(0)
  }

  const currentAnswer = currentExam?.answers[currentQuestion?.id] || []

  const answeredCount = useMemo(() => {
    if (!currentExam) return 0
    return Object.values(currentExam.answers).filter(a => a && a.length > 0).length
  }, [currentExam])

  const renderOptions = () => {
    if (!currentQuestion) return null

    const { type, options } = currentQuestion

    if (type === 'single' || type === 'judge') {
      return (
        <Radio.Group
          value={currentAnswer[0]}
          onChange={handleSingleSelect}
          className={styles.optionsGroup}
          disabled={examFinished}
        >
          {options.map((opt, idx) => {
            const optionLabel = String.fromCharCode(65 + idx)
            const isCorrectOption = currentQuestion.answer.includes(optionLabel)
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
                <span className={styles.optionLabel}>{optionLabel}.</span>
                <span className={styles.optionText}>{opt}</span>
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
        {options.map((opt, idx) => {
          const optionLabel = String.fromCharCode(65 + idx)
          const isCorrectOption = currentQuestion.answer.includes(optionLabel)
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
              <span className={styles.optionLabel}>{optionLabel}.</span>
              <span className={styles.optionText}>{opt}</span>
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

            return (
              <div
                key={q.id}
                className={dotClass}
                onClick={() => setCurrentIndex(idx)}
              >
                {idx + 1}
              </div>
            )
          })}
        </div>
        <div className={styles.answerLegend}>
          <span><i className={styles.legendDot + ' ' + styles.answeredDot}></i>已答</span>
          <span><i className={styles.legendDot}></i>未答</span>
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

  if (!examStarted) {
    return (
      <div className={styles.container}>
        <Card
          title={
            <span className={styles.cardTitle}>
              <FileTextOutlined className={styles.titleIcon} />
              模拟考试
            </span>
          }
          className={styles.startCard}
        >
          <Form form={form} layout="vertical" className={styles.startForm}>
            <Form.Item
              name="categoryId"
              label="考试分类"
              rules={[{ required: true, message: '请选择考试分类' }]}
              initialValue={categories[0]?.id}
            >
              <Select placeholder="请选择分类">
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name} ({getQuestionsByCategory(cat.id).length} 题)
                  </Option>
                ))}
              </Select>
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

            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartExam}
              block
              className={styles.startBtn}
            >
              开始考试
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
      <div className={styles.container}>
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
            <Title level={5}>答题详情</Title>
            {examQuestions.map((q, idx) => {
              const userAnswer = currentExam.answers[q.id] || []
              const correctAnswer = q.answer || []
              const isCorrect = userAnswer.length === correctAnswer.length &&
                userAnswer.every(a => correctAnswer.includes(a))

              return (
                <div key={q.id} className={styles.resultQuestionItem}>
                  <div className={styles.resultQuestionHeader}>
                    <Tag color={isCorrect ? 'green' : 'red'}>
                      {isCorrect ? '正确' : '错误'}
                    </Tag>
                    <Text type="secondary">第 {idx + 1} 题</Text>
                  </div>
                  <div className={styles.resultQuestionText}>
                    <Text strong>{q.question}</Text>
                  </div>
                  <div className={styles.resultAnswer}>
                    <Text type="secondary">你的答案：{userAnswer.join('、') || '未作答'}</Text>
                    <Text type="secondary">正确答案：{correctAnswer.join('、')}</Text>
                  </div>
                  {!isCorrect && (
                    <div className={styles.resultExplanation}>
                      <Text type="secondary">解析：{q.explanation}</Text>
                    </div>
                  )}
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
    <div className={styles.container}>
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
              </Space>
              <div className={styles.timer}>
                <ClockCircleOutlined className={styles.timerIcon} />
                <span className={timeLeft <= 60 ? styles.timerWarning : ''}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <Title level={4} className={styles.questionTitle}>
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
            <Button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              上一题
            </Button>
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
            <Text type="secondary">
              已答 {answeredCount} / {examQuestions.length} 题
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Exam
