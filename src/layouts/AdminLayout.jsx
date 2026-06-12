import React from 'react'
import { Layout, Menu, Button, Typography, Badge } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppstoreOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  SettingOutlined,
  FileTextOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useOperationLogStore } from '../stores/operationLogStore'
import styles from './AdminLayout.module.css'

const { Sider, Header, Content } = Layout
const { Title } = Typography

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()
  const { logs } = useOperationLogStore()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const menuItems = [
    {
      key: '/admin/categories',
      icon: <AppstoreOutlined />,
      label: '分类管理'
    },
    {
      key: '/admin/questions',
      icon: <QuestionCircleOutlined />,
      label: '题目管理'
    },
    {
      key: '/admin/logs',
      icon: <FileTextOutlined />,
      label: logs.length > 0 ? `操作日志 (${logs.length})` : '操作日志'
    },
    {
      key: '/admin/backup',
      icon: <DatabaseOutlined />,
      label: '备份与恢复'
    }
  ]

  const getSelectedKey = () => {
    const path = location.pathname
    if (path.startsWith('/admin/categories')) return '/admin/categories'
    if (path.startsWith('/admin/questions')) return '/admin/questions'
    if (path.startsWith('/admin/logs')) return '/admin/logs'
    if (path.startsWith('/admin/backup')) return '/admin/backup'
    return '/admin/categories'
  }

  return (
    <Layout className={styles.layout}>
      <Sider width={220} className={styles.sider}>
        <div className={styles.logo}>
          <SettingOutlined className={styles.logoIcon} />
          <Title level={4} className={styles.logoText}>管理后台</Title>
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerTitle}>题库管理系统</div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className={styles.logoutBtn}
          >
            退出登录
          </Button>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout
