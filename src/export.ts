import type { RecordWithMeta, Target } from './types'

export function exportToCSV(records: RecordWithMeta[], targets: Target[]): void {
  const targetById = new Map(targets.map((t) => [t.id, t]))

  const headers = ['目标名称', '积分数值', '创建时间', '备注', '是否异常']
  const rows = records.map((r) => [
    targetById.get(r.targetId)?.name ?? `目标 ${r.targetId}`,
    String(r.points),
    r.createdAt,
    r.note,
    r.isAnomaly ? '是' : '否',
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `积分记录_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}