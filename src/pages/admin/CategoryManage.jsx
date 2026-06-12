import React, { useState } from 'react'
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  message,
  Space,
  Tag,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuestionStore } from '../../stores/questionStore'
import styles from './CategoryManage.module.css'

const { Option } = Select

function CategoryManage() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryEnabled,
    sortCategories,
    getCategoryTree
  } = useCategoryStore()
  const { getQuestionsByCategory, deleteQuestionsByCategory } = useQuestionStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [form] = Form.useForm()

  const categoryTree = getCategoryTree()

  const allCategoryIds = categories.map(c => c.id)

  const handleAdd = (parentId = null) => {
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ parentId, enabled: true })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingCategory(record)
    form.setFieldsValue({
      name: record.name,
      parentId: record.parentId || null,
      enabled: record.enabled !== false
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    const childIds = categories.filter(c => c.parentId === id).map(c => c.id)
    const allIds = [id, ...childIds]
    let totalQuestions = 0
    allIds.forEach(cid => {
      totalQuestions += getQuestionsByCategory(cid).length
    })

    if (totalQuestions > 0) {
      Modal.confirm({
        title: '确认删除',
        content: `该分类及其子分类下共有 ${totalQuestions} 道题目，删除分类将同时删除这些题目，是否继续？`,
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          for (const cid of allIds) {
            await deleteQuestionsByCategory(cid)
          }
          await deleteCategory(id)
          message.success('删除成功')
        }
      })
    } else {
      await deleteCategory(id)
      message.success('删除成功')
    }
  }

  const handleToggleEnabled = async (id) => {
    await toggleCategoryEnabled(id)
    const cat = categories.find(c => c.id === id)
    message.success(cat?.enabled !== false ? '已禁用分类' : '已启用分类')
  }

  const handleMoveUp = async (record) => {
    const siblings = categories
      .filter(c => c.parentId === record.parentId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const idx = siblings.findIndex(s => s.id === record.id)
    if (idx <= 0) return
    const sortedIds = siblings.map(s => s.id)
    ;[sortedIds[idx - 1], sortedIds[idx]] = [sortedIds[idx], sortedIds[idx - 1]]
    await sortCategories(sortedIds)
    message.success('排序已更新')
  }

  const handleMoveDown = async (record) => {
    const siblings = categories
      .filter(c => c.parentId === record.parentId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const idx = siblings.findIndex(s => s.id === record.id)
    if (idx >= siblings.length - 1) return
    const sortedIds = siblings.map(s => s.id)
    ;[sortedIds[idx], sortedIds[idx + 1]] = [sortedIds[idx + 1], sortedIds[idx]]
    await sortCategories(sortedIds)
    message.success('排序已更新')
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const name = values.name.trim()
      const parentId = values.parentId || null
      const enabled = values.enabled !== false

      if (editingCategory) {
        const result = await updateCategory(editingCategory.id, { name, parentId, enabled })
        if (!result.success) {
          message.error(result.message)
          return
        }
        message.success('修改成功')
      } else {
        const result = await addCategory(name, parentId)
        if (!result.success) {
          message.error(result.message)
          return
        }
        if (!enabled && result.category) {
          await updateCategory(result.category.id, { enabled: false })
        }
        message.success('添加成功')
      }

      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const getFlatTreeData = () => {
    const rows = []
    categoryTree.forEach(top => {
      rows.push(top)
      if (top.children && top.children.length > 0) {
        top.children.forEach(child => {
          rows.push({ ...child, isChild: true, parentName: top.name })
        })
      }
    })
    return rows
  }

  const flatData = getFlatTreeData()

  const columns = [
    {
      title: '排序',
      key: 'sort',
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="上移">
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => handleMoveUp(record)}
            />
          </Tooltip>
          <Tooltip title="下移">
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => handleMoveDown(record)}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span style={{ paddingLeft: record.isChild ? 24 : 0 }}>
          {record.isChild && <span style={{ color: '#999', marginRight: 4 }}>└</span>}
          <Tag color={record.isChild ? 'default' : 'blue'}>{text}</Tag>
          {record.parentName && (
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
              (父级: {record.parentName})
            </Text>
          )}
        </span>
      )
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
      title: '状态',
      key: 'enabled',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={record.enabled !== false}
          onChange={() => handleToggleEnabled(record.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          size="small"
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => handleAdd(record.id)}
            size="small"
          >
            添加子分类
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const Text = ({ type, style, children }) => (
    <span className={type === 'secondary' ? styles.secondaryText : ''} style={style}>
      {children}
    </span>
  )

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
            onClick={() => handleAdd(null)}
          >
            新增分类
          </Button>
        }
        className={styles.card}
      >
        <Table
          columns={columns}
          dataSource={flatData}
          rowKey="id"
          pagination={false}
          className={styles.table}
          rowClassName={(record) =>
            record.enabled === false ? styles.disabledRow : ''
          }
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
            name="parentId"
            label="父级分类"
          >
            <Select placeholder="无（顶级分类）" allowClear>
              {categories.filter(c => !c.parentId && c.id !== editingCategory?.id).map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Form.Item>
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
          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CategoryManage
