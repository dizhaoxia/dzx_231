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
  Form
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import styles from './QuestionManage.module.css'

const { TextArea } = Input
const { Option } = Select

const questionTypeMap = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'green' },
  judge: { label: '判断题', color: 'orange' }
}

function QuestionFormModal({ visible, editingQuestion, categories, onOk, onCancel }) {
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
      onOk={handleOk}
      onCancel={onCancel}
      okText="确定"
      cancelText="取消"
      width={700}
      destroyOnClose
      maskClosable={false}
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
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useQuestionStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [searchCategory, setSearchCategory] = useState(null)
  const [searchType, setSearchType] = useState(null)

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (searchCategory && q.categoryId !== searchCategory) return false
      if (searchType && q.type !== searchType) return false
      return true
    })
  }, [questions, searchCategory, searchType])

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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增题目
          </Button>
        }
        className={styles.card}
      >
        <div className={styles.filterBar}>
          <Space size="middle">
            <Select
              placeholder="选择分类"
              style={{ width: 160 }}
              allowClear
              value={searchCategory}
              onChange={setSearchCategory}
              prefix={<SearchOutlined />}
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
            <span className={styles.totalText}>共 {filteredQuestions.length} 道题目</span>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredQuestions}
          rowKey="id"
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
      />
    </div>
  )
}

export default QuestionManage
