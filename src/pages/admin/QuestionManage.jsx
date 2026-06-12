import React, { useState, useMemo } from 'react'
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
  Dropdown
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
  SwapOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import styles from './QuestionManage.module.css'

const { TextArea } = Input
const { Option } = Select
const { RangePicker } = DatePicker

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function QuestionFormModal({ visible, editingQuestion, categories, onOk, onCancel, onSaveDraft, drafts }) {
  const [form] = Form.useForm()
  const [qType, setQType] = useState('single')
  const [optionList, setOptionList] = useState(['', '', '', ''])
  const [answerList, setAnswerList] = useState([])

  React.useEffect(() => {
    if (visible) {
      if (editingQuestion) {
        form.setFieldsValue({
          categoryId: editingQuestion.categoryId,
          question: editingQuestion.question,
          explanation: editingQuestion.explanation
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
          categoryId: categories[0]?.id || null
        })
        setQType('single')
        setOptionList(['', '', '', ''])
        setAnswerList([])
      }
    }
  }, [visible, editingQuestion, categories, form])

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
      categoryId: values.categoryId
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

      onOk({
        type: qType,
        question: values.question.trim(),
        options: validOptions,
        answer: answerList,
        explanation: values.explanation.trim(),
        categoryId: values.categoryId
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
          <TextArea rows={3} placeholder="请输入题目内容" maxLength={500} showCount />
        </Form.Item>

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
    getDraft
  } = useQuestionStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchCategory, setSearchCategory] = useState(null)
  const [searchType, setSearchType] = useState(null)
  const [searchDateRange, setSearchDateRange] = useState(null)
  const [moveModalVisible, setMoveModalVisible] = useState(false)
  const [moveTargetCategory, setMoveTargetCategory] = useState(null)
  const [draftModalVisible, setDraftModalVisible] = useState(false)
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false)

  const filteredQuestions = useMemo(() => {
    if (!searchKeyword && !searchCategory && !searchType && !searchDateRange) {
      return questions
    }
    return searchQuestions({
      keyword: searchKeyword,
      type: searchType,
      categoryId: searchCategory,
      startTime: searchDateRange?.[0]?.valueOf(),
      endTime: searchDateRange?.[1]?.valueOf()
    })
  }, [questions, searchKeyword, searchCategory, searchType, searchDateRange, searchQuestions])

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
    message.success('删除成功')
  }

  const handleSubmit = async (data) => {
    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, data)
      message.success('修改成功')
    } else {
      await addQuestion(data)
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
    setSelectedRowKeys([])
    setMoveModalVisible(false)
    setMoveTargetCategory(null)
    message.success('分类迁移成功')
  }

  const handleResetSearch = () => {
    setSearchKeyword('')
    setSearchCategory(null)
    setSearchType(null)
    setSearchDateRange(null)
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
      width: 80,
      render: (status) => (
        <Tag color={status === 'disabled' ? 'default' : 'green'}>
          {status === 'disabled' ? '已禁用' : '正常'}
        </Tag>
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
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
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
          <Space>
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
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
                size="small"
              >
                批量删除
              </Button>
              <Button
                icon={<SwapOutlined />}
                onClick={handleBatchMove}
                size="small"
              >
                批量迁移分类
              </Button>
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
    </div>
  )
}

export default QuestionManage
