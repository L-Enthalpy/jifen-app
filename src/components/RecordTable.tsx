import type { RecordWithMeta } from '../types'

interface RecordTableProps {
  records: RecordWithMeta[]
  onEdit: (record: RecordWithMeta) => void
  onDelete: (id: string) => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function RecordTable({ records, onEdit, onDelete }: RecordTableProps) {
  if (records.length === 0) {
    return (
      <main className="record-table-area">
        <div className="empty-state">暂无记录，点击「新增记录」开始录入</div>
      </main>
    )
  }

  return (
    <main className="record-table-area">
      <div className="table-wrapper">
        <table className="record-table">
          <thead>
            <tr>
              <th className="col-mark">标记</th>
              <th className="col-target">目标名称</th>
              <th className="col-points">积分</th>
              <th className="col-time">创建时间</th>
              <th className="col-note">备注</th>
              <th className="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className={r.isAnomaly ? 'row-anomaly' : ''}>
                <td className="col-mark">
                  {r.isAnomaly ? <span className="anomaly-icon">⚠️</span> : null}
                </td>
                <td className="col-target">{r.targetName}</td>
                <td className={`col-points ${r.isAnomaly ? 'points-anomaly' : ''}`}>
                  {r.points.toLocaleString()}
                </td>
                <td className="col-time">{formatTime(r.createdAt)}</td>
                <td className="col-note">{r.note || '-'}</td>
                <td className="col-actions">
                  <button className="btn btn-small btn-secondary" onClick={() => onEdit(r)}>
                    编辑
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      if (window.confirm('确定要删除这条记录吗？')) {
                        onDelete(r.id)
                      }
                    }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}