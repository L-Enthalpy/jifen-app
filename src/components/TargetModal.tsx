import { useState } from 'react'
import type { Target } from '../types'

interface TargetModalProps {
  targets: Target[]
  onRename: (id: number, name: string) => void
  onDelete: (id: number) => void
  onAdd: () => void
  onClose: () => void
}

export function TargetModal({ targets, onRename, onDelete, onAdd, onClose }: TargetModalProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const startEdit = (t: Target) => {
    setEditingId(t.id)
    setEditName(t.name)
  }

  const saveEdit = () => {
    if (editingId !== null && editName.trim()) {
      onRename(editingId, editName.trim())
      setEditingId(null)
      setEditName('')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>管理目标</h3>
        <ul className="target-manage-list">
          {targets.map((t) => (
            <li key={t.id} className="target-manage-item">
              {editingId === t.id ? (
                <>
                  <input
                    className="target-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <button className="btn btn-small btn-primary" onClick={saveEdit}>
                    保存
                  </button>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className="target-manage-name">{t.name}</span>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => startEdit(t)}
                  >
                    重命名
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      if (window.confirm(`确定要删除「${t.name}」及其所有关联记录吗？`)) {
                        onDelete(t.id)
                      }
                    }}
                  >
                    删除
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onAdd}>
            + 新增目标
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  )
}