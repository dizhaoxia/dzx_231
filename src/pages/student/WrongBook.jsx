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
  Result
} from 'antd'
import {
  FormOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  RedoOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore'
import styles from './WrongBook.module.css'

const { Title, Text } = Typography
const { Option } = Select

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function WrongBook() {
  const { categories } = useCategoryStore()
  const { getQuestionById } = useQuestionStore()
  const { wrongQuestions, removeWrongQuestion, clearAllWrong } = useWrongQuestionStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [filterCategory, setFilterCategory] = useState(null)
  const [viewMode, setViewMode] = useState('list')

  const filteredWrongQuestions = useMemo(() => {
    if (!filterCategory) return wrongQuestions
    return wrongQuestions.filter(w => {
      const q = getQuestionById(w.questionId)
      return q && q.categoryId === filterCategory
    })
  }, [wrongQuestions, filterCategory, getQuestionById])

  const currentWrong = filteredWrongQuestions[currentIndex]
  const currentQuestion = currentWrong ? getQuestionById(currentWrong.questionId) : null

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
          }
          handleRedo()
        }
      })
    }
  }

  const handleRemove = (questionId) => {
    removeWrongQuestion(questionId)
    message.success('已移除')
    if (currentIndex >= filteredWrongQuestions.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
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
        message.success('已清空错题本')
        setCurrentIndex(0)
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
            if (submitted) {
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
          if (submitted) {
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
            <Space>
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
            </Space>
          }
          className={styles.card}
        >
          <Empty
            description="暂无错题"
            className={styles.empty}
          />
        </Card>
      </div>
    )
  }

  if (viewMode === 'list') {
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
            <Space>
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
              <Button
                icon={<RedoOutlined />}
                onClick={() => {
                  setCurrentIndex(0)
                  setViewMode('practice')
                }}
                type="primary"
              >
                错题重做
              </Button>
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
          <div className={styles.wrongList}>
            {filteredWrongQuestions.map((w, idx) => {
              const q = getQuestionById(w.questionId)
              if (!q) return null
              const category = categories.find(c => c.id === q.categoryId)

              return (
                <div key={w.questionId} className={styles.wrongItem}>
                  <div className={styles.wrongItemHeader}>
                    <Space>
                      <Tag color={questionTypeMap[q.type]?.color}>
                        {questionTypeMap[q.type]?.label}
                      </Tag>
                      <Tag color="blue">{category?.name || '未分类'}</Tag>
                      <Text type="secondary">
                        错误 {w.wrongCount} 次
                      </Text>
                    </Space>
                    <Space>
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
                    <Text strong>第 {idx + 1} 题. </Text>
                    {q.question}
                  </div>
                  <div className={styles.wrongItemAnswer}>
                    <Text type="secondary">
                      正确答案：{q.answer.join('、')}
                    </Text>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
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
          </span>
        }
        extra={
          <Button onClick={() => setViewMode('list')}>
            返回列表
          </Button>
        }
        className={styles.card}
      >
        <div className={styles.practiceContainer}>
          <div className={styles.questionHeader}>
            <Space>
              <Tag color={questionTypeMap[currentQuestion?.type]?.color}>
                {questionTypeMap[currentQuestion?.type]?.label}
              </Tag>
              <Text type="secondary">
                第 {currentIndex + 1} / {filteredWrongQuestions.length} 题
              </Text>
              <Tag color="red">错题次数：{currentWrong?.wrongCount}</Tag>
            </Space>
            <Space>
              <Button
                icon={<RedoOutlined />}
                onClick={handleRedo}
                size="small"
              >
                重新作答
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

          <Title level={4} className={styles.questionTitle}>
            {currentQuestion?.question}
          </Title>

          <div className={styles.optionsContainer}>
            {renderOptions()}
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
              下一题
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default WrongBook
