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
  violatingRows: number[]
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
  const violatingRows: number[] = []
  let violationCount = 0
  let filledCount = 0

  // 第一遍：计算每行的总积分
  for (let i = 0; i < rows; i++) {
    let rowSum = 0
    for (let j = 0; j < cols; j++) {
      const val = cells[i][j]
      if (val !== null) {
        rowSum += val
        colTotals[j] += val
        filledCount++
      }
    }
    rowTotals.push(rowSum)
  }

  // 第二遍：行级判定 —— 每行总积分 > 阈值则该行整行违规
  for (let i = 0; i < rows; i++) {
    const violationRow: boolean[] = []
    const rowViolates = rowTotals[i] > 0 && rowTotals[i] > threshold
    if (rowViolates) {
      violatingRows.push(i)
      violationCount++
    }
    for (let j = 0; j < cols; j++) {
      if (rowViolates && cells[i][j] !== null) {
        violationRow.push(true)
      } else {
        violationRow.push(false)
      }
    }
    violations.push(violationRow)
  }

  return { violations, totalSum, threshold, rowTotals, colTotals, violationCount, filledCount, violatingRows }
}

/**
 * 最优退回方案算法（行级约束）：
 *
 * 约束：每行总积分 ≤ (总积分 × 0.75) / 47
 * 即：max(行总积分) ≤ grand_total × 0.75 / 47
 *
 * 策略：将所有单元格值从大到小排序，依次尝试以每个位置作为 cutoff，
 * 保留 cutoff 及之后的所有单元格，检查行级约束是否满足，取总积分最大的方案。
 */
export function computeRemovalPlan(cells: (number | null)[][]): RemovalPlan | null {
  const rows = cells.length
  const cols = rows > 0 ? cells[0].length : 0

  // 收集所有有值的位置
  const entries: CellEntry[] = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
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
  const rowTotals: number[] = Array(rows).fill(0)
  for (const e of entries) {
    rowTotals[e.row] += e.value
  }
  const hasViolation = rowTotals.some((rt) => rt > 0 && rt > currentThreshold)
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

  // 遍历每个可能的 cutoff，找最优方案
  let bestI = -1
  let bestSum = 0

  for (let i = 0; i < n; i++) {
    const grandTotal = suffixSum[i]
    const threshold = calcThreshold(grandTotal)

    // 计算保留的 cells 每行的行总积分
    const retainedRowTotals: number[] = Array(rows).fill(0)
    for (let k = i; k < n; k++) {
      retainedRowTotals[sorted[k].row] += sorted[k].value
    }

    // 检查行级约束：每行总积分 ≤ 阈值
    const maxRowTotal = Math.max(...retainedRowTotals)
    if (maxRowTotal <= threshold) {
      if (grandTotal > bestSum) {
        bestSum = grandTotal
        bestI = i
      }
    }
  }

  // 没有找到任何有效方案
  if (bestI === -1) return null

  // 需要退回的是排序后索引 0 到 bestI-1 的记录
  const toRemove = sorted.slice(0, bestI)
  const remainingSum = suffixSum[bestI]
  const finalThreshold = calcThreshold(remainingSum)

  // 计算退回后的违规行数
  const finalRowTotals: number[] = Array(rows).fill(0)
  for (let k = bestI; k < n; k++) {
    finalRowTotals[sorted[k].row] += sorted[k].value
  }
  const remainingViolations = finalRowTotals.filter((rt) => rt > 0 && rt > finalThreshold).length

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
  rowLabels: { zodiac: string; code: number }[],
): void {
  const rows = cells.length
  const cols = rows > 0 ? cells[0].length : 0

  const headers = ['生肖', '码数', '序号', '填入数值', '是否违规']
  const csvRows: string[][] = [headers]

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const val = cells[i][j]
      if (val !== null) {
        csvRows.push([
          rowLabels[i]?.zodiac ?? '',
          String(rowLabels[i]?.code ?? ''),
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