import { useState } from 'react'
import type { RecordWithMeta, Target } from '../types'
import { exportToCSV } from '../export'

interface OverviewBarProps {
  stats: { totalPoints: number; totalRecords: number; anomalyCount: number }
  onRecalculate: () => void
  onAddRecord: () => void
  onManageTargets: () => void
  onClearAll: () => void
  onClearTargets: () => void
  onClearRecords: () => void
  onLogout: () => void
  onDeleteAccount: () => void
  records: RecordWithMeta[]
  targets: Target[]
  currentUser: string | null
}

export function OverviewBar({
  stats,
  onRecalculate,
  onAddRecord,
  onManageTargets,
  onClearAll,
  onClearTargets,
  onClearRecords,
  onLogout,
  onDeleteAccount,
  records,
  targets,
  currentUser,
}: OverviewBarProps) {
  const [showClearMenu, setShowClearMenu] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const handleRecalculate = () => {
    onRecalculate()
    showNotification('异常值判定完成！')
  }

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 3000)
  }

  return (
    <>
      {notification && (
        <div className="notification-toast">{notification}</div>
      )}
      <header className="overview-bar">
        <div className="overview-stats">
          <div className="stat-item">
            <span className="stat-label">全局总积分</span>
            <span className="stat-value">{stats.totalPoints.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">记录总条数</span>
            <span className="stat-value">{stats.totalRecords}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">异常记录</span>
            <span className="stat-value anomaly-count">{stats.anomalyCount}</span>
          </div>
        </div>
        <div className="overview-actions">
          <button className="btn btn-secondary" onClick={handleRecalculate}>
            重新判定异常值
          </button>
          <button className="btn btn-secondary" onClick={onManageTargets}>
            管理目标
          </button>
          <button className="btn btn-secondary" onClick={() => exportToCSV(records, targets)}>
            导出 CSV
          </button>
          <div className="clear-menu-container">
            <button
              className="btn btn-danger"
              onClick={() => setShowClearMenu(!showClearMenu)}
            >
              清空数据 ▾
            </button>
            {showClearMenu && (
              <div className="clear-menu">
                <button
                  className="clear-menu-item"
                  onClick={() => {
                    if (window.confirm('确定要清空所有数据吗？此操作不可恢复！')) {
                      onClearAll()
                      showNotification('已清空全部数据')
                    }
                    setShowClearMenu(false)
                  }}
                >
                  清空全部数据
                </button>
                <button
                  className="clear-menu-item"
                  onClick={() => {
                    if (window.confirm('确定要清空所有目标及其关联记录吗？此操作不可恢复！')) {
                      onClearTargets()
                      showNotification('已清空所有目标及记录')
                    }
                    setShowClearMenu(false)
                  }}
                >
                  清空目标数据
                </button>
                <button
                  className="clear-menu-item"
                  onClick={() => {
                    if (window.confirm('确定要清空所有记录吗？此操作不可恢复！')) {
                      onClearRecords()
                      showNotification('已清空所有记录')
                    }
                    setShowClearMenu(false)
                  }}
                >
                  清空记录数据
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={onAddRecord}>
            + 新增记录
          </button>
          <span className="current-user">{currentUser}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            登出
          </button>
          <button className="btn btn-danger" onClick={onDeleteAccount}>
            注销账号
          </button>
        </div>
      </header>
    </>
  )
}