import React, { useState, useMemo } from 'react'
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Checkbox,
  Popconfirm,
  message,
  Space,
  Tag
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

function QuestionForm({ form, categories, modalVisible }) {
  const type = Form.useWatch('type', form)
  const options = Form.useWatch('options', form) || []

  const handleOptionChange = (index, value) => {
    const currentOptions = form.getFieldValue('options') || []
    currentOptions[index] = value
    form.setFieldsValue({ options: currentOptions })
  }

  const handleTypeChange = (e) => {
    const newType = e.target.value
    if (newType === 'judge') {
      form.setFieldsValue({
        options: ['正确', '错误'],
        answer: []
      })
    } else {
      form.setFieldsValue({
        options: ['', '', '', ''],
        answer: []
      })
    }
  }

  const renderOptions = () => {
    if (type === 'judge') {
      return (
        <>
          <div className={styles.optionItem}>
            <span className={styles.optionLabel}>A.</span>
            <Input value="正确" disabled />
          </div>
          <div className={styles.optionItem}>
            <span className={styles.optionLabel}>B.</span>
            <Input value="错误" disabled />
          </div>
        </>
      )
    }

    return options.map((opt, idx) => (
      <div key={idx} className={styles.optionItem}>
        <span className={styles.optionLabel}>
          {String.fromCharCode(65 + idx)}.
        </span>
        <Input
          value={opt}
          onChange={(e) => handleOptionChange(idx, e.target.value)}
          placeholder={`请输入选项 ${String.fromCharCode(65 + idx)}`}
        />
      </div>
    ))
  }

  const renderAnswerSelect = () => {
    if (type === 'single') {
      return (
        <Radio.Group>
          {options.map((opt, idx) => (
            <Radio key={idx} value={String.fromCharCode(65 + idx)} disabled={!opt}>
              {String.fromCharCode(65 + idx)}. {opt || `选项${idx + 1}`}
            </Radio>
          ))}
        </Radio.Group>
      )
    } else if (type === 'multiple') {
      return (
        <Checkbox.Group>
          {options.map((opt, idx) => (
            <Checkbox key={idx} value={String.fromCharCode(65 + idx)} disabled={!opt}>
              {String.fromCharCode(65 + idx)}. {opt || `选项${idx + 1}`}
            </Checkbox>
          ))}
        </Checkbox.Group>
      )
    } else {
      return (
        <Radio.Group>
          <Radio value="A">正确</Radio>
          <Radio value="B">错误</Radio>
        </Radio.Group>
      )
    }
  }

  if (!modalVisible) return null

  return (
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

      <Form.Item
        name="type"
        label="题目类型"
        rules={[{ required: true, message: '请选择题目类型' }]}
      >
        <Radio.Group onChange={handleTypeChange}>
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
        />
      </Form.Item>

      <Form.Item label="选项">
        <div className={styles.optionsList}>
          {renderOptions()}
        </div>
      </Form.Item>

      <Form.Item
        name="answer"
        label="正确答案"
        rules={[{ required: true, message: '请选择正确答案' }]}
      >
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
        <TextArea
          rows={3}
          placeholder="请输入答案解析"
          maxLength={500}
          showCount
        />
      </Form.Item>
    </Form>
  )
}

function QuestionManage() {
  const { categories } = useCategoryStore()
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useQuestionStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [form] = Form.useForm()
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
    form.resetFields()
    form.setFieldsValue({
      type: 'single',
      categoryId: categories[0]?.id || null,
      options: ['', '', '', ''],
      answer: []
    })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingQuestion(record)
    form.setFieldsValue({
      ...record,
      options: [...record.options]
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    await deleteQuestion(id)
    message.success('删除成功')
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const { type, question, options, answer, explanation, categoryId } = values

      if (type !== 'judge') {
        const validOptions = options.filter(o => o && o.trim())
        if (validOptions.length < 2) {
          message.error('至少需要 2 个有效选项')
          return
        }
      }

      if (!answer || answer.length === 0) {
        message.error('请选择正确答案')
        return
      }

      const answerArray = Array.isArray(answer) ? answer : [answer]

      const questionData = {
        type,
        question: question.trim(),
        options: type === 'judge' ? ['正确', '错误'] : options.filter(o => o && o.trim()),
        answer: answerArray,
        explanation: explanation.trim(),
        categoryId
      }

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData)
        message.success('修改成功')
      } else {
        await addQuestion(questionData)
        message.success('添加成功')
      }

      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
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
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这道题目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
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
            <span className={styles.totalText}>
              共 {filteredQuestions.length} 道题目
            </span>
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

      <Modal
        title={editingQuestion ? '编辑题目' : '新增题目'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={700}
        destroyOnClose
        maskClosable={false}
      >
        <QuestionForm
          form={form}
          categories={categories}
          modalVisible={modalVisible}
        />
      </Modal>
    </div>
  )
}

export default QuestionManage
