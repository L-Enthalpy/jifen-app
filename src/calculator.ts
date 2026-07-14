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
 * 贪心算法：找到最佳退回方案，最大化保留的总和
 * 策略：每次移除最大的违规值，直到没有违规
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

  // 模拟当前状态
  let currentTotal = entries.reduce((s, e) => s + e.value, 0)
  let currentThreshold = calcThreshold(currentTotal)

  // 找出所有违规值
  const violating = entries.filter((e) => e.value > currentThreshold)
  if (violating.length === 0) return null

  // 贪心：每次移除最大的违规值
  const removed: CellEntry[] = []
  const remaining = new Set(entries.map((_, i) => i))

  while (true) {
    // 找出当前剩余值中最大的违规值
    let maxIdx = -1
    let maxVal = -1
    for (const idx of remaining) {
      const e = entries[idx]
      if (e.value > currentThreshold && e.value > maxVal) {
        maxVal = e.value
        maxIdx = idx
      }
    }

    if (maxIdx === -1) break // 没有违规了

    remaining.delete(maxIdx)
    removed.push(entries[maxIdx])
    currentTotal -= entries[maxIdx].value

    if (remaining.size === 0) break

    currentThreshold = calcThreshold(currentTotal)
  }

  // 计算最终状态
  const remainingEntries = Array.from(remaining).map((i) => entries[i])
  const remainingSum = remainingEntries.reduce((s, e) => s + e.value, 0)
  const finalThreshold = calcThreshold(remainingSum)
  const remainingViolations = remainingEntries.filter((e) => e.value > finalThreshold).length

  return {
    toRemove: removed,
    remainingSum,
    remainingViolations,
    removedCount: removed.length,
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