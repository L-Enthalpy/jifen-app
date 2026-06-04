import type { Target } from '../types'

interface TargetSidebarProps {
  targets: Target[]
  selectedTargetId: number | null
  onSelect: (id: number | null) => void
  targetStats: Map<number, number>
  onAddTarget: () => void
}

export function TargetSidebar({
  targets,
  selectedTargetId,
  onSelect,
  targetStats,
  onAddTarget,
}: TargetSidebarProps) {
  return (
    <aside className="target-sidebar">
      <div className="sidebar-header">
        <h3>目标筛选</h3>
        <button className="btn btn-small btn-secondary" onClick={onAddTarget}>
          + 新增目标
        </button>
      </div>
      <ul className="target-list">
        <li
          className={`target-item ${selectedTargetId === null ? 'active' : ''}`}
          onClick={() => onSelect(null)}
        >
          <span className="target-name">全部记录</span>
        </li>
        {targets.map((t) => (
          <li
            key={t.id}
            className={`target-item ${selectedTargetId === t.id ? 'active' : ''}`}
            onClick={() => onSelect(t.id)}
          >
            <span className="target-name">{t.name}</span>
            <span className="target-points">
              {targetStats.get(t.id)?.toLocaleString() ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}