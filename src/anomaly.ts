import type { Record, RecordWithMeta, Target } from './types'

const COEFFICIENT = 0.75
const DIVISOR = 47

export function computeAnomalyThreshold(totalPoints: number): number {
  return (totalPoints * COEFFICIENT) / DIVISOR
}

export function computeAnomalyStatus(
  records: Record[],
  targets: Target[],
): RecordWithMeta[] {
  const totalPoints = records.reduce((sum, r) => sum + r.points, 0)
  const threshold = computeAnomalyThreshold(totalPoints)

  const targetById = new Map(targets.map((t) => [t.id, t]))

  return records.map((r) => ({
    ...r,
    targetName: targetById.get(r.targetId)?.name ?? `目标 ${r.targetId}`,
    isAnomaly: r.points > threshold,
  }))
}

export function getStats(records: RecordWithMeta[]): {
  totalPoints: number
  totalRecords: number
  anomalyCount: number
} {
  const totalPoints = records.reduce((sum, r) => sum + r.points, 0)
  const anomalyCount = records.filter((r) => r.isAnomaly).length
  return {
    totalPoints,
    totalRecords: records.length,
    anomalyCount,
  }
}