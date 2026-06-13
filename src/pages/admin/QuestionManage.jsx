import React, { useState, useMemo, useRef } from 'react'
import {
  Card,
  Button,
  Table,
  Modal,
  Input,
  Select,
  Radio,
  Checkbox,
  Popconfirm,
  message,
  Space,
  Tag,
  Form,
  DatePicker,
  Badge,
  Dropdown,
  Upload,
  Switch,
  Tooltip,
  Alert,
  List
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SaveOutlined,
  FileTextOutlined,
  ClearOutlined,
  MoreOutlined,
  SwapOutlined,
  ImportOutlined,
  ExportOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import { useOperationLogStore, LOG_ACTIONS } from '../../stores/operationLogStore'
import styles from './QuestionManage.module.css'

const { TextArea } = Input
const { Option } = Select
const { RangePicker } = DatePicker

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function QuestionFormModal({ visible, editingQuestion, categories, onOk, onCancel, onSaveDraft, drafts, checkDuplicate }) {
  const [form] = Form.useForm()
  const [qType, setQType] = useState('single')
  const [optionList, setOptionList] = useState(['', '', '', ''])
  const [answerList, setAnswerList] = useState([])
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  React.useEffect(() => {
    if (visible) {
      if (editingQuestion) {
        form.setFieldsValue({
          categoryId: editingQuestion.categoryId,
          question: editingQuestion.question,
          explanation: editingQuestion.explanation,
          status: editingQuestion.status
        })
        setQType(editingQuestion.type)
        setAnswerList([...(editingQuestion.answer || [])])
        const opts = editingQuestion.options || []
        if (editingQuestion.type === 'judge') {
          setOptionList(['正确', '错误'])
        } else {
          const padded = [...opts]
          while (padded.length < 4) padded.push('')
          setOptionList(padded.slice(0, 4))
        }
      } else {
        form.resetFields()
        form.setFieldsValue({
          categoryId: categories[0]?.id || null,
          status: 'active'
        })
        setQType('single')
        setOptionList(['', '', '', ''])
        setAnswerList([])
      }
      setDuplicateWarning(null)
    }
  }, [visible, editingQuestion, categories, form])

  const handleQuestionChange = (e) => {
    const value = e.target.value
    if (value && value.trim()) {
      const duplicate = checkDuplicate(value.trim(), editingQuestion?.id)
      if (duplicate) {
        setDuplicateWarning(duplicate)
      } else {
        setDuplicateWarning(null)
      }
    } else {
      setDuplicateWarning(null)
    }
  }

  const handleTypeChange = (e) => {
    const newType = e.target.value
    setQType(newType)
    setAnswerList([])
    if (newType === 'judge') {
      setOptionList(['正确', '错误'])
    } else {
      setOptionList(['', '', '', ''])
    }
  }

  const handleOptionInput = (index, value) => {
    const newList = [...optionList]
    newList[index] = value
    setOptionList(newList)
  }

  const handleSingleAnswer = (e) => {
    setAnswerList([e.target.value])
  }

  const handleMultipleAnswer = (vals) => {
    setAnswerList(vals)
  }

  const getFormData = () => {
    const values = form.getFieldsValue()
    const validOptions = qType === 'judge'
      ? ['正确', '错误']
      : optionList.filter(o => o && o.trim())

    return {
      type: qType,
      question: values.question?.trim() || '',
      options: validOptions,
      answer: answerList,
      explanation: values.explanation?.trim() || '',
      categoryId: values.categoryId,
      status: values.status || 'active'
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()

      const validOptions = qType === 'judge'
        ? ['正确', '错误']
        : optionList.filter(o => o && o.trim())

      if (qType !== 'judge' && validOptions.length < 2) {
        message.error('至少需要 2 个有效选项')
        return
      }

      if (answerList.length === 0) {
        message.error('请选择正确答案')
        return
      }

      const questionText = values.question.trim()
      const duplicate = checkDuplicate(questionText, editingQuestion?.id)
      if (duplicate) {
        message.error('题目已存在，请修改题干内容后再提交')
        return
      }

      onOk({
        type: qType,
        question: questionText,
        options: validOptions,
        answer: answerList,
        explanation: values.explanation.trim(),
        categoryId: values.categoryId,
        status: values.status || 'active'
      })
    } catch (err) {
      console.error('Validation error:', err)
    }
  }

  const handleDraft = () => {
    const data = getFormData()
    if (!data.question) {
      message.warning('请至少填写题干内容再保存草稿')
      return
    }
    onSaveDraft(data)
  }

  const renderOptions = () => {
    if (qType === 'judge') {
      return (
        <div className={styles.optionsList}>
          <div className={styles.optionItem}>
            <span className={styles.optionLabel}>A.</span>
            <Input value="正确" disabled />
          </div>
          <div className={styles.optionItem}>
            <span className={styles.optionLabel}>B.</span>
            <Input value="错误" disabled />
          </div>
        </div>
      )
    }

    return (
      <div className={styles.optionsList}>
        {optionList.map((opt, idx) => (
          <div key={idx} className={styles.optionItem}>
            <span className={styles.optionLabel}>
              {String.fromCharCode(65 + idx)}.
            </span>
            <Input
              value={opt}
              onChange={(e) => handleOptionInput(idx, e.target.value)}
              placeholder={`请输入选项 ${String.fromCharCode(65 + idx)}`}
            />
          </div>
        ))}
      </div>
    )
  }

  const renderAnswerSelect = () => {
    const options = qType === 'judge' ? ['正确', '错误'] : optionList

    if (qType === 'single' || qType === 'judge') {
      return (
        <Radio.Group value={answerList[0]} onChange={handleSingleAnswer}>
          {options.map((opt, idx) => {
            const label = String.fromCharCode(65 + idx)
            const disabled = qType !== 'judge' && !opt
            return (
              <Radio key={idx} value={label} disabled={disabled}>
                {label}. {opt || `选项${idx + 1}`}
              </Radio>
            )
          })}
        </Radio.Group>
      )
    }

    return (
      <Checkbox.Group value={answerList} onChange={handleMultipleAnswer}>
        {options.map((opt, idx) => {
          const label = String.fromCharCode(65 + idx)
          return (
            <Checkbox key={idx} value={label} disabled={!opt}>
              {label}. {opt || `选项${idx + 1}`}
            </Checkbox>
          )
        })}
      </Checkbox.Group>
    )
  }

  return (
    <Modal
      title={editingQuestion ? '编辑题目' : '新增题目'}
      open={visible}
      onCancel={onCancel}
      width={700}
      destroyOnClose
      maskClosable={false}
      footer={[
        <Button key="draft" icon={<SaveOutlined />} onClick={handleDraft}>
          保存草稿
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="ok" type="primary" onClick={handleOk}>
          确定
        </Button>
      ]}
    >
      <Form form={form} layout="vertical" className={styles.form}>
        <Form.Item
          name="categoryId"
          label="所属分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select placeholder="请选择分类">
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="题目类型" required>
          <Radio.Group value={qType} onChange={handleTypeChange}>
            <Radio value="single">单选题</Radio>
            <Radio value="multiple">多选题</Radio>
            <Radio value="judge">判断题</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="question"
          label="题干"
          rules={[
            { required: true, message: '请输入题干' },
            { min: 1, message: '题干不能为空' }
          ]}
        >
          <TextArea
            rows={3}
            placeholder="请输入题目内容"
            maxLength={500}
            showCount
            onChange={handleQuestionChange}
          />
        </Form.Item>

        {duplicateWarning && (
          <Alert
            message="题目重复警告"
            description={`发现相似题目："${duplicateWarning.question.substring(0, 50)}${duplicateWarning.question.length > 50 ? '...' : ''}"`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item label="选项" required>
          {renderOptions()}
        </Form.Item>

        <Form.Item label="正确答案" required>
          {renderAnswerSelect()}
        </Form.Item>

        <Form.Item
          name="explanation"
          label="答案解析"
          rules={[
            { required: true, message: '请输入答案解析' },
            { min: 1, message: '解析不能为空' }
          ]}
        >
          <TextArea rows={3} placeholder="请输入答案解析" maxLength={500} showCount />
        </Form.Item>

        <Form.Item
          name="status"
          label="题目状态"
        >
          <Select>
            <Option value="active">启用</Option>
            <Option value="disabled">禁用</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  )
}

function QuestionManage() {
  const { categories } = useCategoryStore()
  const {
    questions,
    drafts,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    batchDeleteQuestions,
    batchMoveCategory,
    searchQuestions,
    saveDraft,
    deleteDraft,
    clearAllDrafts,
    getDraft,
    toggleQuestionStatus,
    batchToggleStatus,
    checkDuplicateQuestions,
    checkQuestionDuplicate,
    exportQuestions,
    importQuestions
  } = useQuestionStore()
  const { addLog } = useOperationLogStore()

  const fileInputRef = useRef(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchCategory, setSearchCategory] = useState(null)
  const [searchType, setSearchType] = useState(null)
  const [searchDateRange, setSearchDateRange] = useState(null)
  const [searchStatus, setSearchStatus] = useState(null)
  const [moveModalVisible, setMoveModalVisible] = useState(false)
  const [moveTargetCategory, setMoveTargetCategory] = useState(null)
  const [draftModalVisible, setDraftModalVisible] = useState(false)
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importSkipDuplicates, setImportSkipDuplicates] = useState(true)
  const [importDefaultCategory, setImportDefaultCategory] = useState(null)

  const filteredQuestions = useMemo(() => {
    if (!searchKeyword && !searchCategory && !searchType && !searchDateRange && !searchStatus) {
      return questions
    }
    return searchQuestions({
      keyword: searchKeyword,
      type: searchType,
      categoryId: searchCategory,
      startTime: searchDateRange?.[0]?.valueOf(),
      endTime: searchDateRange?.[1]?.valueOf(),
      status: searchStatus
    })
  }, [questions, searchKeyword, searchCategory, searchType, searchDateRange, searchStatus, searchQuestions])

  const duplicateQuestions = useMemo(() => checkDuplicateQuestions(), [questions, checkDuplicateQuestions])

  const handleAdd = () => {
    setEditingQuestion(null)
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingQuestion(record)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    await deleteQuestion(id)
    addLog(LOG_ACTIONS.QUESTION_DELETE, { questionId: id })
    message.success('删除成功')
  }

  const handleSubmit = async (data) => {
    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, data)
      addLog(LOG_ACTIONS.QUESTION_EDIT, { questionId: editingQuestion.id })
      message.success('修改成功')
    } else {
      const q = await addQuestion(data)
      addLog(LOG_ACTIONS.QUESTION_ADD, { questionId: q.id })
      message.success('添加成功')
    }
    setModalVisible(false)
  }

  const handleSaveDraft = async (data) => {
    await saveDraft(data)
    message.success('草稿已保存')
  }

  const handleLoadDraft = (draft) => {
    setEditingQuestion({
      ...draft,
      id: null
    })
    setDraftModalVisible(false)
    setModalVisible(true)
    message.info('已加载草稿内容')
  }

  const handleDeleteDraft = async (id) => {
    await deleteDraft(id)
    message.success('草稿已删除')
  }

  const handleClearAllDrafts = async () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有草稿吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await clearAllDrafts()
        message.success('已清空所有草稿')
      }
    })
  }

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的题目')
      return
    }
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 道题目吗？`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await batchDeleteQuestions(selectedRowKeys)
        addLog(LOG_ACTIONS.QUESTION_BATCH_DELETE, { count: selectedRowKeys.length, ids: selectedRowKeys })
        setSelectedRowKeys([])
        message.success(`已删除 ${selectedRowKeys.length} 道题目`)
      }
    })
  }

  const handleBatchMove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要迁移的题目')
      return
    }
    setMoveModalVisible(true)
  }

  const handleBatchMoveConfirm = async () => {
    if (!moveTargetCategory) {
      message.warning('请选择目标分类')
      return
    }
    await batchMoveCategory(selectedRowKeys, moveTargetCategory)
    addLog(LOG_ACTIONS.QUESTION_BATCH_MOVE, { count: selectedRowKeys.length, targetCategoryId: moveTargetCategory })
    setSelectedRowKeys([])
    setMoveModalVisible(false)
    setMoveTargetCategory(null)
    message.success('分类迁移成功')
  }

  const handleToggleStatus = async (record) => {
    const newStatus = await toggleQuestionStatus(record.id)
    addLog(LOG_ACTIONS.QUESTION_TOGGLE_STATUS, { questionId: record.id, status: newStatus })
    message.success(newStatus === 'disabled' ? '已禁用题目' : '已启用题目')
  }

  const handleBatchEnable = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择题目')
      return
    }
    await batchToggleStatus(selectedRowKeys, 'active')
    addLog(LOG_ACTIONS.QUESTION_BATCH_TOGGLE_STATUS, { count: selectedRowKeys.length, status: 'active' })
    message.success(`已启用 ${selectedRowKeys.length} 道题目`)
  }

  const handleBatchDisable = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择题目')
      return
    }
    await batchToggleStatus(selectedRowKeys, 'disabled')
    addLog(LOG_ACTIONS.QUESTION_BATCH_TOGGLE_STATUS, { count: selectedRowKeys.length, status: 'disabled' })
    message.success(`已禁用 ${selectedRowKeys.length} 道题目`)
  }

  const handleResetSearch = () => {
    setSearchKeyword('')
    setSearchCategory(null)
    setSearchType(null)
    setSearchDateRange(null)
    setSearchStatus(null)
  }

  const handleExport = () => {
    const jsonStr = exportQuestions({
      categoryIds: searchCategory ? [searchCategory] : null,
      status: searchStatus
    })
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `题库导出_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    addLog(LOG_ACTIONS.QUESTION_EXPORT, { count: filteredQuestions.length })
    message.success(`已导出 ${filteredQuestions.length} 道题目`)
  }

  const handleImportClick = () => {
    setImportResult(null)
    setImportModalVisible(true)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const content = ev.target?.result
        const result = await importQuestions(content, {
          skipDuplicates: importSkipDuplicates,
          defaultCategoryId: importDefaultCategory
        })
        setImportResult(result)
        addLog(LOG_ACTIONS.QUESTION_IMPORT, result)
        if (result.success) {
          message.success(`导入完成：成功 ${result.imported} 道，跳过 ${result.skipped} 道，重复 ${result.duplicates} 道`)
        } else {
          message.error(result.error || '导入失败')
        }
      } catch (err) {
        message.error('文件读取失败')
      }
    }
    reader.readAsText(file)
  }

  const handleCheckDuplicates = () => {
    const duplicates = checkDuplicateQuestions()
    addLog(LOG_ACTIONS.QUESTION_DUPLICATE_CHECK, { count: duplicates.length })
    setDuplicateModalVisible(true)
    if (duplicates.length === 0) {
      message.success('未发现重复题目')
    } else {
      message.warning(`发现 ${Math.ceil(duplicates.length / 2)} 组重复题目`)
    }
  }

  const hasSelected = selectedRowKeys.length > 0

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => index + 1
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={questionTypeMap[type]?.color}>
          {questionTypeMap[type]?.label}
        </Tag>
      )
    },
    {
      title: '题目',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      key: 'categoryId',
      width: 120,
      render: (categoryId) => {
        const category = categories.find(c => c.id === categoryId)
        return category ? <Tag color="blue">{category.name}</Tag> : '未分类'
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => (
        <Tooltip title={status === 'disabled' ? '点击启用' : '点击禁用'}>
          <Tag
            color={status === 'disabled' ? 'default' : 'green'}
            style={{ cursor: 'pointer' }}
            onClick={() => handleToggleStatus(record)}
          >
            {status === 'disabled' ? '已禁用' : '正常'}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: '录入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            icon={record.status === 'disabled' ? <CheckOutlined /> : <CloseOutlined />}
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 'disabled' ? '启用' : '禁用'}
          </Button>
          <Popconfirm
            title="确定要删除这道题目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const batchMenuItems = {
    items: [
      {
        key: 'enable',
        label: '批量启用',
        icon: <CheckOutlined />,
        onClick: handleBatchEnable
      },
      {
        key: 'disable',
        label: '批量禁用',
        icon: <CloseOutlined />,
        onClick: handleBatchDisable
      },
      { type: 'divider' },
      {
        key: 'delete',
        label: '批量删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: handleBatchDelete
      },
      {
        key: 'move',
        label: '批量迁移分类',
        icon: <SwapOutlined />,
        onClick: handleBatchMove
      }
    ]
  }

  return (
    <div className={styles.container}>
      <Card
        title={
          <span className={styles.cardTitle}>
            <QuestionCircleOutlined className={styles.titleIcon} />
            题目管理
          </span>
        }
        extra={
          <Space wrap>
            {drafts.length > 0 && (
              <Badge count={drafts.length} size="small">
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => setDraftModalVisible(true)}
                >
                  草稿箱
                </Button>
              </Badge>
            )}
            <Button
              icon={<ExclamationCircleOutlined />}
              onClick={handleCheckDuplicates}
            >
              重复校验
              {duplicateQuestions.length > 0 && (
                <Badge count={Math.ceil(duplicateQuestions.length / 2)} size="small" style={{ marginLeft: 4 }} />
              )}
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={handleImportClick}
            >
              导入题库
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              导出题库
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增题目
            </Button>
          </Space>
        }
        className={styles.card}
      >
        <div className={styles.filterBar}>
          <Space size="middle" wrap>
            <Input
              placeholder="搜索题干关键词"
              style={{ width: 200 }}
              allowClear
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="选择分类"
              style={{ width: 160 }}
              allowClear
              value={searchCategory}
              onChange={setSearchCategory}
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
            <Select
              placeholder="选择题型"
              style={{ width: 140 }}
              allowClear
              value={searchType}
              onChange={setSearchType}
            >
              <Option value="single">单选题</Option>
              <Option value="multiple">多选题</Option>
              <Option value="judge">判断题</Option>
            </Select>
            <Select
              placeholder="选择状态"
              style={{ width: 120 }}
              allowClear
              value={searchStatus}
              onChange={setSearchStatus}
            >
              <Option value="active">正常</Option>
              <Option value="disabled">已禁用</Option>
            </Select>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={searchDateRange}
              onChange={setSearchDateRange}
              style={{ width: 260 }}
            />
            <Button icon={<ClearOutlined />} onClick={handleResetSearch}>
              重置
            </Button>
            <span className={styles.totalText}>共 {filteredQuestions.length} 道题目</span>
          </Space>
        </div>

        {hasSelected && (
          <div className={styles.batchBar}>
            <Space>
              <span>已选择 {selectedRowKeys.length} 项</span>
              <Dropdown menu={batchMenuItems}>
                <Button type="primary" size="small">
                  批量操作 <MoreOutlined />
                </Button>
              </Dropdown>
              <Button
                type="link"
                onClick={() => setSelectedRowKeys([])}
                size="small"
              >
                取消选择
              </Button>
            </Space>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={filteredQuestions}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 道题目`
          }}
          className={styles.table}
        />
      </Card>

      <QuestionFormModal
        visible={modalVisible}
        editingQuestion={editingQuestion}
        categories={categories}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        onSaveDraft={handleSaveDraft}
        drafts={drafts}
        checkDuplicate={checkQuestionDuplicate}
      />

      <Modal
        title="批量迁移分类"
        open={moveModalVisible}
        onOk={handleBatchMoveConfirm}
        onCancel={() => { setMoveModalVisible(false); setMoveTargetCategory(null) }}
        okText="确认迁移"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <p>将选中的 {selectedRowKeys.length} 道题目迁移到：</p>
          <Select
            placeholder="请选择目标分类"
            style={{ width: '100%' }}
            value={moveTargetCategory}
            onChange={setMoveTargetCategory}
          >
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8 }} />
            草稿箱
            <Tag color="blue" style={{ marginLeft: 8 }}>{drafts.length}</Tag>
          </span>
        }
        open={draftModalVisible}
        onCancel={() => setDraftModalVisible(false)}
        footer={
          drafts.length > 0 ? [
            <Button key="clear" danger icon={<DeleteOutlined />} onClick={handleClearAllDrafts}>
              清空草稿
            </Button>,
            <Button key="close" onClick={() => setDraftModalVisible(false)}>
              关闭
            </Button>
          ] : [
            <Button key="close" onClick={() => setDraftModalVisible(false)}>
              关闭
            </Button>
          ]
        }
        width={600}
      >
        {drafts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            暂无草稿
          </div>
        ) : (
          <div className={styles.draftList}>
            {drafts.map((draft) => (
              <div key={draft.id} className={styles.draftItem}>
                <div className={styles.draftContent}>
                  <div className={styles.draftQuestion}>
                    <Tag color={questionTypeMap[draft.type]?.color}>
                      {questionTypeMap[draft.type]?.label}
                    </Tag>
                    <span>{draft.question || '未填写题干'}</span>
                  </div>
                  <div className={styles.draftTime}>
                    {new Date(draft.updatedAt || draft.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <Space>
                  <Button type="link" size="small" onClick={() => handleLoadDraft(draft)}>
                    加载
                  </Button>
                  <Popconfirm
                    title="确定删除此草稿？"
                    onConfirm={() => handleDeleteDraft(draft.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" danger size="small">删除</Button>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        title={
          <span>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            重复题目检测结果
          </span>
        }
        open={duplicateModalVisible}
        onCancel={() => setDuplicateModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDuplicateModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {duplicateQuestions.length === 0 ? (
          <Alert
            message="检测通过"
            description="未发现重复题目，题库质量良好！"
            type="success"
            showIcon
            icon={<CheckOutlined />}
          />
        ) : (
          <div>
            <Alert
              message={`发现 ${Math.ceil(duplicateQuestions.length / 2)} 组重复题目`}
              description="以下题干内容高度相似，建议合并或删除重复项"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <List
              dataSource={duplicateQuestions}
              renderItem={(item) => {
                const category = categories.find(c => c.id === item.categoryId)
                return (
                  <List.Item
                    actions={[
                      <Button type="link" size="small" onClick={() => { handleEdit(item); setDuplicateModalVisible(false) }}>
                        编辑
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Tag color={questionTypeMap[item.type]?.color}>{questionTypeMap[item.type]?.label}</Tag>}
                      title={item.question}
                      description={
                        <Space>
                          <Tag color="blue">{category?.name || '未分类'}</Tag>
                          <span style={{ color: '#999' }}>
                            创建于 {new Date(item.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </Space>
                      }
                    />
                  </List.Item>
                )
              }}
            />
          </div>
        )}
      </Modal>

      <Modal
        title={
          <span>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            导入题库
          </span>
        }
        open={importModalVisible}
        onCancel={() => { setImportModalVisible(false); setImportResult(null) }}
        footer={[
          <Button key="close" onClick={() => { setImportModalVisible(false); setImportResult(null) }}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description="支持 JSON 格式题库文件，可选择是否跳过重复题目。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form layout="vertical">
            <Form.Item label="默认分类（导入题目无分类时使用）">
              <Select
                placeholder="请选择分类"
                allowClear
                style={{ width: '100%' }}
                value={importDefaultCategory}
                onChange={setImportDefaultCategory}
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="导入选项">
              <Checkbox
                checked={importSkipDuplicates}
                onChange={e => setImportSkipDuplicates(e.target.checked)}
              >
                跳过重复题目（题干相同视为重复）
              </Checkbox>
            </Form.Item>
            <Form.Item label="选择文件">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button
                icon={<ImportOutlined />}
                onClick={() => fileInputRef.current?.click()}
              >
                选择 JSON 文件
              </Button>
            </Form.Item>
          </Form>
        </div>

        {importResult && (
          <Alert
            type={importResult.success ? 'success' : 'error'}
            showIcon
            message={importResult.success ? '导入完成' : '导入失败'}
            description={
              importResult.success ? (
                <div>
                  <p>成功导入：<strong>{importResult.imported}</strong> 道</p>
                  <p>跳过：<strong>{importResult.skipped}</strong> 道</p>
                  <p>检测到重复：<strong>{importResult.duplicates}</strong> 道</p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div>
                      <p>错误详情：</p>
                      <ul style={{ maxHeight: 120, overflow: 'auto' }}>
                        {importResult.errors.map((err, idx) => (
                          <li key={idx} style={{ color: '#ff4d4f' }}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : importResult.error
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Modal>
    </div>
  )
}

export default QuestionManage
