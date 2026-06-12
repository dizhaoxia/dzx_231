import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Typography } from 'antd'
import { UserOutlined, SettingOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import styles from './RoleSelect.module.css'

const { Title, Paragraph } = Typography

function RoleSelect() {
  const navigate = useNavigate()
  const { setRole } = useAuthStore()

  const handleSelectRole = async (role) => {
    await setRole(role)
    if (role === 'admin') {
      navigate('/admin/categories')
    } else {
      navigate('/student/practice')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Title level={1} className={styles.title}>题库刷题软件</Title>
        <Paragraph className={styles.subtitle}>请选择您的身份进入系统</Paragraph>
        
        <div className={styles.cardContainer}>
          <Card
            hoverable
            className={styles.roleCard}
            onClick={() => handleSelectRole('student')}
          >
            <div className={styles.cardContent}>
              <UserOutlined className={styles.icon} />
              <Title level={3}>学员</Title>
              <Paragraph type="secondary">
                分类刷题、模拟考试<br />
                错题本、数据统计
              </Paragraph>
            </div>
          </Card>

          <Card
            hoverable
            className={styles.roleCard}
            onClick={() => handleSelectRole('admin')}
          >
            <div className={styles.cardContent}>
              <SettingOutlined className={styles.icon} />
              <Title level={3}>管理员</Title>
              <Paragraph type="secondary">
                题库分类管理<br />
                题目录入与维护
              </Paragraph>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default RoleSelect
