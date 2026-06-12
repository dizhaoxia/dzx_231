import React, { useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Typography,
  Empty,
  Progress,
  Divider,
  Space
} from 'antd'
import {
  BarChartOutlined,
  FileTextOutlined,
  FormOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useExamStore } from '../../stores/examStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore'
import { useCategoryStore } from '../../stores/categoryStore'
import styles from './Statistics.module.css'

const { Title, Text } = Typography

function Statistics() {
  const { examRecords } = useExamStore()
  const { questions } = useQuestionStore()
  const { wrongQuestions, getWrongCount } = useWrongQuestionStore()
  const { categories, getCategoryName } = useCategoryStore()

  const totalExams = examRecords.length
  const latestRecord = examRecords[0]

  const avgAccuracy = useMemo(() => {
    if (examRecords.length === 0) return 0
    const total = examRecords.reduce((sum, r) => sum + (r.accuracy || 0), 0)
    return Math.round(total / examRecords.length)
  }, [examRecords])

  const totalQuestions = questions.length

  const wrongCount = getWrongCount()

  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const catQuestions = questions.filter(q => q.categoryId === cat.id)
      const catWrong = wrongQuestions.filter(w => {
        const q = questions.find(qq => qq.id === w.questionId)
        return q && q.categoryId === cat.id
      })
      return {
        id: cat.id,
        name: cat.name,
        total: catQuestions.length,
        wrong: catWrong.length,
        accuracy: catQuestions.length > 0
          ? Math.round(((catQuestions.length - catWrong.length) / catQuestions.length) * 100)
          : 100
      }
    })
  }, [categories, questions, wrongQuestions])

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (ms) => {
    if (!ms) return '-'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}分${seconds}秒`
  }

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="题库总数"
              value={totalQuestions}
              suffix="道"
              prefix={<FileTextOutlined className={styles.statIcon} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="错题数量"
              value={wrongCount}
              suffix="道"
              prefix={<FormOutlined className={styles.statIcon} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="考试次数"
              value={totalExams}
              suffix="次"
              prefix={<BarChartOutlined className={styles.statIcon} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="平均正确率"
              value={avgAccuracy}
              suffix="%"
              prefix={<CheckCircleOutlined className={styles.statIcon} />}
              valueStyle={{ color: avgAccuracy >= 60 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.contentRow}>
        <Col xs={24} md={12}>
          <Card
            title={
              <span className={styles.cardTitle}>
                <BarChartOutlined className={styles.titleIcon} />
                各分类掌握情况
              </span>
            }
            className={styles.card}
          >
            <List
              dataSource={categoryStats}
              locale={{ emptyText: '暂无数据' }}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <div className={styles.categoryItem}>
                    <div className={styles.categoryHeader}>
                      <span className={styles.categoryName}>{item.name}</span>
                      <span className={styles.categoryCount}>
                        {item.total} 题 / {item.wrong} 错题
                      </span>
                    </div>
                    <Progress
                      percent={item.accuracy}
                      size="small"
                      status={item.accuracy >= 80 ? 'success' : item.accuracy >= 60 ? 'active' : 'exception'}
                      className={styles.categoryProgress}
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={
              <span className={styles.cardTitle}>
                <ClockCircleOutlined className={styles.titleIcon} />
                最近考试记录
              </span>
            }
            className={styles.card}
          >
            {examRecords.length === 0 ? (
              <Empty description="暂无考试记录" className={styles.empty} />
            ) : (
              <List
                dataSource={examRecords.slice(0, 5)}
                locale={{ emptyText: '暂无数据' }}
                renderItem={(record, index) => (
                  <List.Item key={record.id}>
                    <div className={styles.examItem}>
                      <div className={styles.examHeader}>
                        <Tag color={index === 0 ? 'blue' : 'default'}>
                          {index === 0 ? '最新' : `第 ${examRecords.length - index} 次`}
                        </Tag>
                        <Text type="secondary" className={styles.examTime}>
                          {formatDate(record.startTime)}
                        </Text>
                      </div>
                      <div className={styles.examStats}>
                        <Space className={styles.examStat}>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <span>正确 {record.correctCount} 题</span>
                        </Space>
                        <Space className={styles.examStat}>
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          <span>错误 {record.wrongCount} 题</span>
                        </Space>
                        <Space className={styles.examStat}>
                          <span className={styles.accuracy}>
                            正确率 {record.accuracy}%
                          </span>
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {latestRecord && (
        <Card
          title={
            <span className={styles.cardTitle}>
              <FileTextOutlined className={styles.titleIcon} />
              最近一次考试详情
            </span>
          }
          className={styles.card}
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <div className={styles.detailItem}>
                <Text type="secondary">考试时间</Text>
                <Text strong className={styles.detailValue}>
                  {formatDate(latestRecord.startTime)}
                </Text>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className={styles.detailItem}>
                <Text type="secondary">考试时长</Text>
                <Text strong className={styles.detailValue}>
                  {formatDuration(latestRecord.endTime - latestRecord.startTime)}
                </Text>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className={styles.detailItem}>
                <Text type="secondary">题目总数</Text>
                <Text strong className={styles.detailValue}>
                  {latestRecord.totalCount} 题
                </Text>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className={styles.detailItem}>
                <Text type="secondary">正确率</Text>
                <Text
                  strong
                  className={styles.detailValue}
                  style={{
                    color: latestRecord.accuracy >= 60 ? '#52c41a' : '#ff4d4f'
                  }}
                >
                  {latestRecord.accuracy}%
                </Text>
              </div>
            </Col>
          </Row>
          <Divider />
          <Progress
            percent={latestRecord.accuracy}
            status={latestRecord.accuracy >= 60 ? 'success' : 'exception'}
            strokeWidth={12}
          />
        </Card>
      )}
    </div>
  )
}

export default Statistics
