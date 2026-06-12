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
  Result
} from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  BookOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore'
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
  const { addWrongQuestion, removeWrongQuestion, isWrongQuestion } = useWrongQuestionStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const questions = useMemo(() => {
    if (!selectedCategoryId) return []
    return getQuestionsByCategory(selectedCategoryId)
  }, [selectedCategoryId, getQuestionsByCategory])

  const currentQuestion = questions[currentIndex]

  useEffect(() => {
    setCurrentIndex(0)
    setUserAnswer([])
    setSubmitted(false)
    setIsCorrect(false)
  }, [selectedCategoryId])

  useEffect(() => {
    setUserAnswer([])
    setSubmitted(false)
    setIsCorrect(false)
  }, [currentIndex])

  const handleCategoryChange = ({ key }) => {
    setSelectedCategory(key)
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
              <Space>
                <Tag color={questionTypeMap[currentQuestion.type]?.color}>
                  {questionTypeMap[currentQuestion.type]?.label}
                </Tag>
                <Text type="secondary">
                  第 {currentIndex + 1} / {questions.length} 题
                </Text>
              </Space>
              <Button
                icon={isWrongQuestion(currentQuestion.id) ? <MinusOutlined /> : <PlusOutlined />}
                onClick={handleToggleWrong}
                size="small"
              >
                {isWrongQuestion(currentQuestion.id) ? '移出错题本' : '加入错题本'}
              </Button>
            </div>

            <Title level={4} className={styles.questionTitle}>
              {currentQuestion.question}
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
          </div>
        </div>
      </Layout>
    </Layout>
  )
}

export default Practice
