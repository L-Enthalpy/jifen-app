import { useState } from 'react'
import type { RecordWithMeta, Target } from '../types'

interface RecordModalProps {
  record: RecordWithMeta | null
  targets: Target[]
  onSave: (targetId: number, points: number, note: string) => void
  onClose: () => void
}

export function RecordModal({ record, targets, onSave, onClose }: RecordModalProps) {
  const [targetId, setTargetId] = useState(record?.targetId ?? targets[0]?.id ?? 0)
  const [points, setPoints] = useState(record?.points.toString() ?? '')
  const [note, setNote] = useState(record?.note ?? '')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const num = parseInt(points, 10)
    if (!targetId) {
      setError('请选择目标')
      return
    }
    if (!points || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      setError('请输入有效的正整数')
      return
    }
    onSave(targetId, num, note.trim())
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{record ? '编辑记录' : '新增记录'}</h3>
        <div className="form-group">
          <label>所属目标</label>
          <select value={targetId} onChange={(e) => setTargetId(Number(e.target.value))}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>积分数值</label>
          <input
            type="number"
            min="1"
            step="1"
            value={points}
            onChange={(e) => {
              setPoints(e.target.value)
              setError('')
            }}
            placeholder="请输入正整数"
          />
        </div>
        <div className="form-group">
          <label>备注（可选）</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加备注说明..."
            rows={3}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {record ? '保存修改' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}