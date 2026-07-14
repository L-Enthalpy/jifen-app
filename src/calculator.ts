const COEFFICIENT = 0.75
const DIVISOR = 47

export interface CalcResult {
  violations: boolean[][]
  totalSum: number
  threshold: number
  rowTotals: number[]
  colTotals: number[]
  violationCount: number
  filledCount: number
}

/** 单个填入值的位置信息 */
export interface CellEntry {
  row: number
  col: number
  value: number
}

/** 退回方案 */
export interface RemovalPlan {
  /** 需要退回（清空）的记录 */
  toRemove: CellEntry[]
  /** 退回后的剩余总和 */
  remainingSum: number
  /** 退回后的违规数 */
  remainingViolations: number
  /** 退回的记录数 */
  removedCount: number
}

function calcThreshold(total: number): number {
  return (total * COEFFICIENT) / DIVISOR
}

export function compute(cells: (number | null)[][]): CalcResult {
  const rows = cells.length
  const cols = rows > 0 ? cells[0].length : 0

  let totalSum = 0
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      totalSum += cells[i][j] ?? 0
    }
  }

  const threshold = calcThreshold(totalSum)

  const violations: boolean[][] = []
  const rowTotals: number[] = []
  const colTotals: number[] = Array(cols).fill(0)
  let violationCount = 0
  let filledCount = 0

  for (let i = 0; i < rows; i++) {
    const violationRow: boolean[] = []
    let rowSum = 0
    for (let j = 0; j < cols; j++) {
      const val = cells[i][j]
      if (val !== null) {
        rowSum += val
        colTotals[j] += val
        filledCount++
        if (val > threshold) {
          violationRow.push(true)
          violationCount++
        } else {
          violationRow.push(false)
        }
      } else {
        violationRow.push(false)
      }
    }
    violations.push(violationRow)
    rowTotals.push(rowSum)
  }

  return { violations, totalSum, threshold, rowTotals, colTotals, violationCount, filledCount }
}

/**
 * 最优退回方案算法：
 *
 * 约束：保留值 v 需满足 v ≤ (总积分 × 0.75) / 47
 * 即：总积分 ≥ v × 47 / 0.75 ≈ v × 62.67
 *
 * 策略：将所有值从大到小排序，依次尝试以每个值作为"最大保留值"，
 * 保留所有 ≤ 该值的记录，检查是否满足约束，取总积分最大的方案。
 */
export function computeRemovalPlan(cells: (number | null)[][]): RemovalPlan | null {
  // 收集所有有值的位置
  const entries: CellEntry[] = []
  for (let i = 0; i < cells.length; i++) {
    for (let j = 0; j < cells[i].length; j++) {
      const val = cells[i][j]
      if (val !== null) {
        entries.push({ row: i, col: j, value: val })
      }
    }
  }

  if (entries.length === 0) return null

  // 检查当前是否已有违规
  const currentTotal = entries.reduce((s, e) => s + e.value, 0)
  const currentThreshold = calcThreshold(currentTotal)
  const hasViolation = entries.some((e) => e.value > currentThreshold)
  if (!hasViolation) return null

  // 按值从大到小排序
  const sorted = [...entries].sort((a, b) => b.value - a.value)
  const n = sorted.length

  // 计算后缀和（从第 i 个开始到末尾的和）
  const suffixSum: number[] = new Array(n).fill(0)
  suffixSum[n - 1] = sorted[n - 1].value
  for (let i = n - 2; i >= 0; i--) {
    suffixSum[i] = suffixSum[i + 1] + sorted[i].value
  }

  // 遍历每个可能的"最大保留值"，找最优方案
  let bestI = -1
  let bestSum = 0

  for (let i = 0; i < n; i++) {
    const maxVal = sorted[i].value
    const total = suffixSum[i]
    // 约束：总积分 ≥ 最大值的 62.67 倍
    if (total >= maxVal * DIVISOR / COEFFICIENT) {
      if (total > bestSum) {
        bestSum = total
        bestI = i
      }
    }
  }

  // 没有找到任何有效方案
  if (bestI === -1) return null

  // 需要退回的是排序后索引 0 到 bestI-1 的记录（值大于 maxVal 的）
  const toRemove = sorted.slice(0, bestI)
  const remainingSum = suffixSum[bestI]
  const finalThreshold = calcThreshold(remainingSum)
  const remainingViolations = sorted.slice(bestI).filter((e) => e.value > finalThreshold).length

  return {
    toRemove,
    remainingSum,
    remainingViolations,
    removedCount: toRemove.length,
  }
}

export function exportToCSV(
  cells: (number | null)[][],
  result: CalcResult,
  zodiacNames: string[],
  getZodiacIndex: (col: number) => number,
): void {
  const rows = cells.length
  const cols = rows > 0 ? cells[0].length : 0

  const headers = ['序号', '生肖', '码数列', '填入数值', '是否违规']
  const csvRows: string[][] = [headers]

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const val = cells[i][j]
      if (val !== null) {
        csvRows.push([
          String(i + 1),
          zodiacNames[getZodiacIndex(j)] ?? '',
          String(j + 1),
          String(val),
          result.violations[i][j] ? '违规' : '',
        ])
      }
    }
  }

  const csvContent = csvRows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `生肖码数对照表_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}