import React from 'react'
import { Layout, Menu, Button, Typography } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  BookOutlined,
  FileTextOutlined,
  FormOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useWrongQuestionStore } from '../stores/wrongQuestionStore'
import styles from './StudentLayout.module.css'

const { Sider, Header, Content } = Layout
const { Title } = Typography

function StudentLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()
  const { wrongQuestions } = useWrongQuestionStore()
  const pendingWrongCount = wrongQuestions.filter(w => !w.mastered).length

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const menuItems = [
    {
      key: '/student/practice',
      icon: <BookOutlined />,
      label: '分类刷题'
    },
    {
      key: '/student/exam',
      icon: <FileTextOutlined />,
      label: '模拟考试'
    },
    {
      key: '/student/wrong',
      icon: <FormOutlined />,
      label: pendingWrongCount > 0 ? `错题本 (${pendingWrongCount})` : '错题本'
    },
    {
      key: '/student/statistics',
      icon: <BarChartOutlined />,
      label: '数据统计'
    },
    {
      key: '/student/settings',
      icon: <SettingOutlined />,
      label: '偏好设置'
    }
  ]

  const getSelectedKey = () => {
    const path = location.pathname
    if (path.startsWith('/student/practice')) return '/student/practice'
    if (path.startsWith('/student/exam')) return '/student/exam'
    if (path.startsWith('/student/wrong')) return '/student/wrong'
    if (path.startsWith('/student/statistics')) return '/student/statistics'
    if (path.startsWith('/student/settings')) return '/student/settings'
    return '/student/practice'
  }

  return (
    <Layout className={styles.layout}>
      <Sider width={220} className={styles.sider}>
        <div className={styles.logo}>
          <UserOutlined className={styles.logoIcon} />
          <Title level={4} className={styles.logoText}>学员中心</Title>
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
          <div className={styles.headerTitle}>题库刷题系统</div>
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

export default StudentLayout
