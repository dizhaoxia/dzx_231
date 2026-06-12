import React from 'react'
import {
  Card,
  Button,
  Radio,
  Switch,
  Tag,
  Alert,
  Modal,
  message,
  Space,
  Divider,
  Typography,
  List
} from 'antd'
import {
  SettingOutlined,
  FontSizeOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  CheckOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '../../stores/settingsStore'
import { useOperationLogStore, LOG_ACTIONS } from '../../stores/operationLogStore'
import styles from './Settings.module.css'

const { Title, Text } = Typography

function Settings() {
  const { settings, updateSetting, resetSettings, getShortcutDisplay } = useSettingsStore()
  const { addLog } = useOperationLogStore()

  const fontSizeMap = {
    small: { label: '小', size: '14px' },
    medium: { label: '中', size: '16px' },
    large: { label: '大', size: '18px' },
    xlarge: { label: '特大', size: '20px' }
  }

  const shortcutList = [
    { key: 'prevQuestion', label: '上一题' },
    { key: 'nextQuestion', label: '下一题' },
    { key: 'submit', label: '提交答案' },
    { key: 'toggleMark', label: '标记题目' }
  ]

  const handleFontSizeChange = async (e) => {
    const value = e.target.value
    await updateSetting('fontSize', value)
    await addLog(LOG_ACTIONS.SETTINGS_CHANGE, { key: 'fontSize', value })
    message.success('字体大小已更新')
  }

  const handleSwitchChange = async (key, checked, label) => {
    await updateSetting(key, checked)
    await addLog(LOG_ACTIONS.SETTINGS_CHANGE, { key, value: checked })
    message.success(`${label}已${checked ? '开启' : '关闭'}`)
  }

  const handleClearProgress = () => {
    Modal.confirm({
      title: '确认清除练习进度',
      icon: <SettingOutlined />,
      content: '确定要清除所有练习进度吗？此操作不可恢复。',
      okText: '确认清除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await addLog(LOG_ACTIONS.SETTINGS_CHANGE, { key: 'clearProgress' })
        message.success('练习进度已清除')
      }
    })
  }

  const handleResetSettings = () => {
    Modal.confirm({
      title: '确认恢复默认设置',
      icon: <ReloadOutlined />,
      content: '确定要恢复所有默认设置吗？此操作不可恢复。',
      okText: '确认恢复',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await resetSettings()
        await addLog(LOG_ACTIONS.SETTINGS_CHANGE, { key: 'resetSettings' })
        message.success('已恢复默认设置')
      }
    })
  }

  return (
    <div className={styles.container}>
      <Card
        title={
          <span className={styles.cardTitle}>
            <SettingOutlined className={styles.titleIcon} />
            系统设置
          </span>
        }
        className={styles.card}
      >
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <FontSizeOutlined style={{ color: '#1890ff' }} />
            显示设置
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>字体大小</span>
            <Radio.Group
              value={settings.fontSize}
              onChange={handleFontSizeChange}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio value="small">小</Radio>
              <Radio value="medium">中</Radio>
              <Radio value="large">大</Radio>
              <Radio value="xlarge">特大</Radio>
            </Radio.Group>
          </div>
          <div className={styles.previewArea}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>字体预览</Text>
            <Title
              level={5}
              style={{ fontSize: fontSizeMap[settings.fontSize]?.size || '16px', margin: '0 0 8px 0' }}
            >
              示例题目标题：关于深度学习的描述，下列说法正确的是？
            </Title>
            <Text style={{ fontSize: fontSizeMap[settings.fontSize]?.size || '16px' }}>
              示例选项内容：这是一段用于预览字体效果的示例文本
            </Text>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>
              <BulbOutlined style={{ color: '#faad14' }} />
              界面主题
            </span>
            <Tag color="default">
              <CheckOutlined /> 浅色模式
              <Text type="secondary" style={{ marginLeft: 8 }}>（深色模式开发中）</Text>
            </Tag>
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            答题设置
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>随机打乱题目顺序</span>
            <Switch
              checked={settings.shuffleQuestions}
              onChange={(checked) => handleSwitchChange('shuffleQuestions', checked, '随机打乱题目顺序')}
            />
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>随机打乱选项顺序</span>
            <Switch
              checked={settings.shuffleOptions}
              onChange={(checked) => handleSwitchChange('shuffleOptions', checked, '随机打乱选项顺序')}
            />
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>答错即时提示</span>
            <Switch
              checked={settings.showAnswerInstantly}
              onChange={(checked) => handleSwitchChange('showAnswerInstantly', checked, '答错即时提示')}
            />
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>高频易错提醒</span>
            <Switch
              checked={settings.showHighFrequencyTips}
              onChange={(checked) => handleSwitchChange('showHighFrequencyTips', checked, '高频易错提醒')}
            />
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <ApiOutlined style={{ color: '#52c41a' }} />
            快捷操作
          </div>
          <Alert
            message="快捷键说明"
            description="在答题过程中可使用以下快捷键提高操作效率，自定义快捷键功能即将上线。"
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <List
            size="small"
            dataSource={shortcutList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Tag color="blue" className={styles.shortcutKey} key="shortcut">
                    {getShortcutDisplay(item.key)}
                  </Tag>
                ]}
              >
                <Text>{item.label}</Text>
              </List.Item>
            )}
          />
        </div>

        <Divider />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <DatabaseOutlined style={{ color: '#722ed1' }} />
            数据管理
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>清除练习进度</span>
            <Button
              danger
              onClick={handleClearProgress}
            >
              清除进度
            </Button>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>恢复默认设置</span>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetSettings}
            >
              恢复默认
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Settings
