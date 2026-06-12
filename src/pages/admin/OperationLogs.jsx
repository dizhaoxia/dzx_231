import React, { useState, useMemo } from 'react'
import {
  Card,
  Button,
  Table,
  Select,
  DatePicker,
  Input,
  Modal,
  Tag,
  Space,
  message,
  Popconfirm
} from 'antd'
import {
  SearchOutlined,
  ClearOutlined,
  DeleteOutlined,
  ExportOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useOperationLogStore, LOG_ACTIONS } from '../../stores/operationLogStore'
import styles from './OperationLogs.module.css'

const { Option } = Select
const { RangePicker } = DatePicker

const actionColorMap = {
  [LOG_ACTIONS.QUESTION_ADD]: 'green',
  [LOG_ACTIONS.QUESTION_EDIT]: 'blue',
  [LOG_ACTIONS.QUESTION_DELETE]: 'red',
  [LOG_ACTIONS.QUESTION_BATCH_DELETE]: 'red',
  [LOG_ACTIONS.QUESTION_BATCH_MOVE]: 'purple',
  [LOG_ACTIONS.QUESTION_TOGGLE_STATUS]: 'orange',
  [LOG_ACTIONS.QUESTION_BATCH_TOGGLE_STATUS]: 'orange',
  [LOG_ACTIONS.QUESTION_IMPORT]: 'cyan',
  [LOG_ACTIONS.QUESTION_EXPORT]: 'cyan',
  [LOG_ACTIONS.QUESTION_DUPLICATE_CHECK]: 'gold',
  [LOG_ACTIONS.CATEGORY_ADD]: 'green',
  [LOG_ACTIONS.CATEGORY_EDIT]: 'blue',
  [LOG_ACTIONS.CATEGORY_DELETE]: 'red',
  [LOG_ACTIONS.CATEGORY_TOGGLE]: 'orange',
  [LOG_ACTIONS.CATEGORY_SORT]: 'purple',
  [LOG_ACTIONS.BACKUP_CREATE]: 'cyan',
  [LOG_ACTIONS.BACKUP_RESTORE]: 'geekblue',
  [LOG_ACTIONS.BACKUP_RESET]: 'red',
  [LOG_ACTIONS.EXAM_START]: 'green',
  [LOG_ACTIONS.EXAM_SUBMIT]: 'blue',
  [LOG_ACTIONS.EXAM_RECOVER]: 'purple',
  [LOG_ACTIONS.SETTINGS_CHANGE]: 'orange',
  [LOG_ACTIONS.WRONG_QUESTION_REMOVE]: 'red',
  [LOG_ACTIONS.WRONG_QUESTION_MASTERED]: 'green',
  [LOG_ACTIONS.WRONG_QUESTION_EXPORT]: 'cyan'
}

function OperationLogs() {
  const {
    logs,
    getLogs,
    getLogActionLabels,
    clearLogs,
    exportLogs
  } = useOperationLogStore()

  const [searchAction, setSearchAction] = useState(null)
  const [searchDateRange, setSearchDateRange] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentDetail, setCurrentDetail] = useState(null)

  const actionLabels = useMemo(() => getLogActionLabels(), [getLogActionLabels])

  const filteredLogs = useMemo(() => {
    return getLogs({
      action: searchAction,
      startTime: searchDateRange?.[0]?.valueOf(),
      endTime: searchDateRange?.[1]?.valueOf(),
      keyword: searchKeyword
    })
  }, [logs, searchAction, searchDateRange, searchKeyword, getLogs])

  const handleResetSearch = () => {
    setSearchAction(null)
    setSearchDateRange(null)
    setSearchKeyword('')
  }

  const handleClearLogs = async () => {
    await clearLogs()
    message.success('日志已清空')
  }

  const handleExportLogs = () => {
    const exportData = exportLogs({
      action: searchAction,
      startTime: searchDateRange?.[0]?.valueOf(),
      endTime: searchDateRange?.[1]?.valueOf(),
      keyword: searchKeyword
    })
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `操作日志_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${exportData.length} 条日志`)
  }

  const handleViewDetail = (log) => {
    setCurrentDetail(log)
    setDetailModalVisible(true)
  }

  const truncateDetail = (detail, maxLen = 50) => {
    const str = JSON.stringify(detail || {})
    if (str.length <= maxLen) return str
    return str.substring(0, maxLen) + '...'
  }

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => index + 1
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (timestamp) => timestamp ? new Date(timestamp).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action, record) => (
        <Tag color={actionColorMap[action] || 'default'} className={styles.actionTag}>
          {record.actionLabel || actionLabels[action] || action}
        </Tag>
      )
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (detail, record) => (
        <span
          style={{ cursor: 'pointer', color: '#1890ff' }}
          onClick={() => handleViewDetail(record)}
        >
          {truncateDetail(detail)}
        </span>
      )
    }
  ]

  return (
    <div className={styles.container}>
      <Card
        title={
          <span className={styles.cardTitle}>
            <FileTextOutlined className={styles.titleIcon} />
            操作日志
          </span>
        }
        extra={
          <Space wrap>
            <Popconfirm
              title="确定要清空所有操作日志吗？"
              onConfirm={handleClearLogs}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                清空日志
              </Button>
            </Popconfirm>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportLogs}
            >
              导出日志
            </Button>
          </Space>
        }
        className={styles.card}
      >
        <div className={styles.filterBar}>
          <Space size="middle" wrap>
            <Select
              placeholder="选择操作类型"
              style={{ width: 180 }}
              allowClear
              value={searchAction}
              onChange={setSearchAction}
            >
              {Object.entries(actionLabels).map(([action, label]) => (
                <Option key={action} value={action}>{label}</Option>
              ))}
            </Select>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={searchDateRange}
              onChange={setSearchDateRange}
              style={{ width: 260 }}
            />
            <Input
              placeholder="搜索关键词"
              style={{ width: 200 }}
              allowClear
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Button icon={<ClearOutlined />} onClick={handleResetSearch}>
              重置
            </Button>
            <span className={styles.totalText}>共 {filteredLogs.length} 条日志</span>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条日志`
          }}
          className={styles.table}
        />
      </Card>

      <Modal
        title="日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {currentDetail && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Tag color={actionColorMap[currentDetail.action] || 'default'}>
                {currentDetail.actionLabel || actionLabels[currentDetail.action] || currentDetail.action}
              </Tag>
              <span style={{ color: '#666', marginLeft: 8 }}>
                {new Date(currentDetail.timestamp).toLocaleString('zh-CN')}
              </span>
            </div>
            <pre style={{
              background: '#f5f5f5',
              padding: 16,
              borderRadius: 6,
              overflow: 'auto',
              maxHeight: 400,
              margin: 0
            }}>
              {JSON.stringify(currentDetail.detail || {}, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OperationLogs
