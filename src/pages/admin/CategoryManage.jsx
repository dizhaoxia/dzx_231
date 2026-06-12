import React, { useState } from 'react'
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Popconfirm,
  message,
  Space,
  Tag
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import styles from './CategoryManage.module.css'

function CategoryManage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore()
  const { getQuestionsByCategory, deleteQuestionsByCategory } = useQuestionStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingCategory(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingCategory(record)
    form.setFieldsValue({ name: record.name })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    const questions = getQuestionsByCategory(id)
    if (questions.length > 0) {
      Modal.confirm({
        title: '确认删除',
        content: `该分类下有 ${questions.length} 道题目，删除分类将同时删除这些题目，是否继续？`,
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          await deleteQuestionsByCategory(id)
          await deleteCategory(id)
          message.success('删除成功')
        }
      })
    } else {
      await deleteCategory(id)
      message.success('删除成功')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const name = values.name.trim()

      if (editingCategory) {
        const result = await updateCategory(editingCategory.id, name)
        if (!result.success) {
          message.error(result.message)
          return
        }
        message.success('修改成功')
      } else {
        const result = await addCategory(name)
        if (!result.success) {
          message.error(result.message)
          return
        }
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
      width: 80,
      render: (_, __, index) => index + 1
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '题目数量',
      key: 'count',
      width: 120,
      render: (_, record) => {
        const count = getQuestionsByCategory(record.id).length
        return <span>{count} 道</span>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
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
            title="确定要删除这个分类吗？"
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
            <AppstoreOutlined className={styles.titleIcon} />
            题库分类管理
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增分类
          </Button>
        }
        className={styles.card}
      >
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          pagination={false}
          className={styles.table}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" className={styles.form}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { min: 1, max: 20, message: '分类名称长度在 1 到 20 个字符之间' }
            ]}
          >
            <Input placeholder="请输入分类名称" maxLength={20} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CategoryManage
