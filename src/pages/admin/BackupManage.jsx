import React, { useState } from 'react'
import {
  Card,
  Button,
  Descriptions,
  Upload,
  Checkbox,
  Modal,
  Alert,
  message,
  Space,
  Popconfirm,
  Statistic,
  Row,
  Col
} from 'antd'
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  WarningOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useQuestionStore } from '../../stores/questionStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore'
import { useExamStore } from '../../stores/examStore'
import { useOperationLogStore, LOG_ACTIONS } from '../../stores/operationLogStore'
import styles from './BackupManage.module.css'

function BackupManage() {
  const { createBackup, restoreBackup, resetAllQuestions } = useQuestionStore()
  const { categories, getCategoryName } = useCategoryStore()
  const { wrongQuestions } = useWrongQuestionStore()
  const { examRecords } = useExamStore()
  const { addLog } = useOperationLogStore()

  const { questions } = useQuestionStore()

  const [restoreModalVisible, setRestoreModalVisible] = useState(false)
  const [restoreOptions, setRestoreOptions] = useState({
    restoreQuestions: true,
    restoreCategories: true,
    restoreWrongQuestions: false,
    restoreExamRecords: false
  })
  const [pendingBackupData, setPendingBackupData] = useState(null)
  const [backupFileInfo, setBackupFileInfo] = useState(null)

  const handleCreateBackup = async () => {
    try {
      const backupData = await createBackup()
      const jsonStr = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `题库备份_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      addLog(LOG_ACTIONS.BACKUP_CREATE, { stats: backupData.stats })
      message.success('备份成功，文件已下载')
    } catch (err) {
      console.error('Backup failed:', err)
      message.error('备份失败')
    }
  }

  const handleRestoreFileSelect = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result
        const parsed = JSON.parse(content)
        if (!parsed.data && !parsed.questions) {
          message.error('备份文件格式不正确')
          return
        }
        setPendingBackupData(parsed)
        setBackupFileInfo({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + ' KB',
          createdAt: parsed.createdAtStr || '未知',
          stats: parsed.stats || null
        })
        setRestoreOptions({
          restoreQuestions: true,
          restoreCategories: true,
          restoreWrongQuestions: false,
          restoreExamRecords: false
        })
        setRestoreModalVisible(true)
      } catch (err) {
        message.error('文件解析失败，请确保是有效的 JSON 备份文件')
      }
    }
    reader.readAsText(file)
    return false
  }

  const handleRestoreOptionChange = (key) => (e) => {
    setRestoreOptions(prev => ({
      ...prev,
      [key]: e.target.checked
    }))
  }

  const handleRestoreConfirm = async () => {
    if (!pendingBackupData) return
    const hasOption = Object.values(restoreOptions).some(v => v)
    if (!hasOption) {
      message.warning('请至少选择一项恢复内容')
      return
    }

    try {
      await restoreBackup(pendingBackupData, restoreOptions)
      addLog(LOG_ACTIONS.BACKUP_RESTORE, { options: restoreOptions })
      message.success('数据恢复成功，页面即将刷新')
      setRestoreModalVisible(false)
      setPendingBackupData(null)
      setBackupFileInfo(null)
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      console.error('Restore failed:', err)
      message.error('恢复失败')
    }
  }

  const handleResetAll = async () => {
    try {
      await resetAllQuestions()
      addLog(LOG_ACTIONS.BACKUP_RESET, {})
      message.success('题库已重置为默认数据')
    } catch (err) {
      console.error('Reset failed:', err)
      message.error('重置失败')
    }
  }

  return (
    <div className={styles.container}>
      <Card
        title={
          <span className={styles.cardTitle}>
            <DatabaseOutlined className={styles.titleIcon} />
            数据备份与恢复
          </span>
        }
        className={styles.card}
      >
        <div className={styles.section}>
          <Alert
            message="数据安全提示"
            description="建议定期备份数据，防止数据丢失。恢复和重置操作不可逆，请谨慎操作。"
            type="info"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 24 }}
          />
        </div>

        <div className={styles.section}>
          <Card
            size="small"
            title={
              <Space>
                <CloudDownloadOutlined style={{ color: '#52c41a' }} />
                <span>数据备份</span>
              </Space>
            }
            style={{ borderColor: '#b7eb8f' }}
          >
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={6}>
                <div className={styles.statCard}>
                  <Statistic title="题目总数" value={questions.length} />
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statCard}>
                  <Statistic title="分类数量" value={categories.length} />
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statCard}>
                  <Statistic title="错题数量" value={wrongQuestions.length} />
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statCard}>
                  <Statistic title="考试记录" value={examRecords.length} />
                </div>
              </Col>
            </Row>

            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="备份内容">
                题目数据、分类数据、错题本、考试记录、草稿箱、操作日志、用户设置
              </Descriptions.Item>
              <Descriptions.Item label="文件格式">
                JSON 格式，可用于跨设备迁移和数据恢复
              </Descriptions.Item>
            </Descriptions>

            <div className={styles.actionArea}>
              <Button
                type="primary"
                icon={<CloudDownloadOutlined />}
                onClick={handleCreateBackup}
              >
                一键备份并下载
              </Button>
            </div>
          </Card>
        </div>

        <div className={styles.section}>
          <Card
            size="small"
            title={
              <Space>
                <CloudUploadOutlined style={{ color: '#1890ff' }} />
                <span>数据恢复</span>
              </Space>
            }
            style={{ borderColor: '#91d5ff' }}
          >
            <div className={styles.actionArea} style={{ marginBottom: 16 }}>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleRestoreFileSelect}
              >
                <Button icon={<CloudUploadOutlined />}>
                  选择备份文件
                </Button>
              </Upload>
              <span style={{ color: '#666', fontSize: 12 }}>
                支持 JSON 格式的备份文件
              </span>
            </div>
            <Alert
              message="恢复说明"
              description="请选择需要恢复的数据项，未勾选的数据将不会被覆盖。恢复操作将覆盖当前数据，建议先备份现有数据。"
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />
          </Card>
        </div>

        <div className={styles.section}>
          <Card
            size="small"
            title={
              <Space>
                <ReloadOutlined style={{ color: '#ff4d4f' }} />
                <span>重置题库</span>
              </Space>
            }
            style={{ borderColor: '#ffa39e' }}
          >
            <div style={{ marginBottom: 16 }}>
              <p className={styles.warningText}>
                <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                危险操作！此操作将清空当前所有题目，并恢复为系统默认题库数据。
              </p>
              <p style={{ color: '#666', margin: 0 }}>
                分类、错题本、考试记录等其他数据不受影响。
              </p>
            </div>
            <div className={styles.actionArea}>
              <Popconfirm
                title="确认重置题库？"
                description={
                  <div>
                    <p>此操作将永久删除当前所有题目，不可撤销！</p>
                    <p>建议先进行数据备份。</p>
                  </div>
                }
                onConfirm={handleResetAll}
                okText="确认重置"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              >
                <Button
                  danger
                  type="primary"
                  icon={<ReloadOutlined />}
                >
                  重置为默认题库
                </Button>
              </Popconfirm>
            </div>
          </Card>
        </div>
      </Card>

      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            确认恢复数据
          </Space>
        }
        open={restoreModalVisible}
        onOk={handleRestoreConfirm}
        onCancel={() => {
          setRestoreModalVisible(false)
          setPendingBackupData(null)
          setBackupFileInfo(null)
        }}
        okText="确认恢复"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        width={520}
      >
        {backupFileInfo && (
          <div>
            <Alert
              message="即将恢复以下备份文件"
              description={
                <div>
                  <p style={{ margin: '4px 0' }}><strong>文件名：</strong>{backupFileInfo.name}</p>
                  <p style={{ margin: '4px 0' }}><strong>文件大小：</strong>{backupFileInfo.size}</p>
                  {backupFileInfo.createdAt && (
                    <p style={{ margin: '4px 0' }}><strong>备份时间：</strong>{backupFileInfo.createdAt}</p>
                  )}
                  {backupFileInfo.stats && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>数据统计：</strong>
                      题目 {backupFileInfo.stats.questionCount || 0} 道，
                      分类 {backupFileInfo.stats.categoryCount || 0} 个，
                      错题 {backupFileInfo.stats.wrongQuestionCount || 0} 道，
                      考试记录 {backupFileInfo.stats.examRecordCount || 0} 条
                    </p>
                  )}
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ padding: '8px 0' }}>
              <p style={{ marginBottom: 12, fontWeight: 500 }}>请选择需要恢复的数据项：</p>
              <Space direction="vertical">
                <Checkbox
                  checked={restoreOptions.restoreQuestions}
                  onChange={handleRestoreOptionChange('restoreQuestions')}
                >
                  恢复题库（题目数据）
                </Checkbox>
                <Checkbox
                  checked={restoreOptions.restoreCategories}
                  onChange={handleRestoreOptionChange('restoreCategories')}
                >
                  恢复分类数据
                </Checkbox>
                <Checkbox
                  checked={restoreOptions.restoreWrongQuestions}
                  onChange={handleRestoreOptionChange('restoreWrongQuestions')}
                >
                  恢复错题本
                </Checkbox>
                <Checkbox
                  checked={restoreOptions.restoreExamRecords}
                  onChange={handleRestoreOptionChange('restoreExamRecords')}
                >
                  恢复考试记录
                </Checkbox>
              </Space>
            </div>

            <Alert
              message="恢复操作将覆盖当前对应数据，请确保已备份重要数据。"
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BackupManage
