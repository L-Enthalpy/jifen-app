import type { Target, Record } from '../types'

interface TargetOverviewProps {
  targets: Target[]
  records: Record[]
  targetStats: Map<number, number>
  selectedTargetId: number | null
  onSelectTarget: (id: number | null) => void
}

interface TargetDetail {
  target: Target
  totalPoints: number
  recordCount: number
  anomalyCount: number
  latestRecord: string | null
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TargetOverview({
  targets,
  records,
  targetStats,
  selectedTargetId,
  onSelectTarget,
}: TargetOverviewProps) {
  if (targets.length === 0) {
    return null
  }

  // 构建每个目标的详细数据
  const details: TargetDetail[] = targets.map((target) => {
    const targetRecords = records.filter((r) => r.targetId === target.id)
    const totalPoints = targetStats.get(target.id) ?? 0
    const anomalyCount = targetRecords.filter((r) => {
      const totalAll = records.reduce((sum, rr) => sum + rr.points, 0)
      const threshold = (totalAll * 0.75) / 47
      return r.points > threshold
    }).length
    const sorted = [...targetRecords].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const latestRecord = sorted.length > 0 ? sorted[0].createdAt : null

    return {
      target,
      totalPoints,
      recordCount: targetRecords.length,
      anomalyCount,
      latestRecord,
    }
  })

  // 按积分降序排列
  details.sort((a, b) => b.totalPoints - a.totalPoints)

  const totalPoints = details.reduce((sum, d) => sum + d.totalPoints, 0)
  const totalRecords = details.reduce((sum, d) => sum + d.recordCount, 0)

  return (
    <div className="target-overview">
      <div className="target-overview-header">
        <h3>目标概况</h3>
        <div className="target-overview-summary">
          <span>{targets.length} 个目标</span>
          <span className="target-overview-sep">|</span>
          <span>共 {totalPoints.toLocaleString()} 积分</span>
          <span className="target-overview-sep">|</span>
          <span>{totalRecords} 条记录</span>
        </div>
      </div>
      <div className="target-overview-grid">
        {details.map((d) => (
          <div
            key={d.target.id}
            className={`target-overview-card ${selectedTargetId === d.target.id ? 'target-overview-card-active' : ''}`}
            onClick={() => onSelectTarget(selectedTargetId === d.target.id ? null : d.target.id)}
          >
            <div className="target-overview-card-header">
              <span className="target-overview-card-name">{d.target.name}</span>
              {d.anomalyCount > 0 && (
                <span className="target-overview-anomaly-badge">{d.anomalyCount} 条异常</span>
              )}
            </div>
            <div className="target-overview-card-body">
              <div className="target-overview-card-stat">
                <span className="target-overview-card-value">{d.totalPoints.toLocaleString()}</span>
                <span className="target-overview-card-label">总积分</span>
              </div>
              <div className="target-overview-card-stat">
                <span className="target-overview-card-value">{d.recordCount}</span>
                <span className="target-overview-card-label">记录数</span>
              </div>
              <div className="target-overview-card-stat">
                <span className="target-overview-card-value">
                  {d.recordCount > 0 ? Math.round(d.totalPoints / d.recordCount) : 0}
                </span>
                <span className="target-overview-card-label">平均积分</span>
              </div>
            </div>
            {d.latestRecord && (
              <div className="target-overview-card-footer">
                最近记录: {formatTime(d.latestRecord)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
