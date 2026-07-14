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
  /** 退回后的违规行数 */
  remainingViolations: number
  /** 退回的记录数 */
  removedCount: number
  /** 违规超标量之和（损失函数值） */
  loss: number
  /** 目标函数值 = remainingSum - loss */
  objective: number
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
 * 固定阈值退回方案算法：
 *
 * 问题：阈值 = 总积分×0.75/47 会随移除动态变化，导致数学悖论
 * （49行时，任何移除都让目标值下降；或惩罚系数过高导致全部移除）。
 *
 * 方案：用原始总积分计算固定阈值 T₀，只从违规行中移除最小数量的
 * 最大值单元格，使该行降到 T₀ 以下。保留总积分最大化。
 */

/** 计算损失函数值：所有违规行的超标量之和 */
function calcLoss(rowTotals: number[], threshold: number): number {
  return rowTotals.reduce((sum, rt) => sum + Math.max(0, rt - threshold), 0)
}

export function computeRemovalPlan(cells: (number | null)[][]): RemovalPlan | null {
  const rows = cells.length
  const cols = rows > 0 ? cells[0].length : 0

  // 计算原始总积分和固定阈值
  let originalTotal = 0
  const originalRowTotals: number[] = Array(rows).fill(0)
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const val = cells[i][j]
      if (val !== null) {
        originalTotal += val
        originalRowTotals[i] += val
      }
    }
  }

  if (originalTotal === 0) return null

  const fixedThreshold = calcThreshold(originalTotal)

  // 检查是否有违规行
  const hasViolation = originalRowTotals.some((rt) => rt > 0 && rt > fixedThreshold)
  if (!hasViolation) return null

  // 深拷贝用于移除
  const working: (number | null)[][] = cells.map((r) => [...r])
  const removed: CellEntry[] = []

  // 对每个违规行，从大到小移除单元格直到行总积分 ≤ 固定阈值
  for (let r = 0; r < rows; r++) {
    if (originalRowTotals[r] <= 0 || originalRowTotals[r] <= fixedThreshold) continue

    // 收集该行所有有值的单元格，按值从大到小排序
    const rowCells: CellEntry[] = []
    for (let j = 0; j < cols; j++) {
      const val = working[r][j]
      if (val !== null) {
        rowCells.push({ row: r, col: j, value: val })
      }
    }
    rowCells.sort((a, b) => b.value - a.value)

    // 逐个移除最大值，直到行总积分 ≤ 固定阈值
    let rowTotal = originalRowTotals[r]
    for (const cell of rowCells) {
      if (rowTotal <= fixedThreshold) break
      working[cell.row][cell.col] = null
      removed.push(cell)
      rowTotal -= cell.value
    }
  }

  if (removed.length === 0) return null

  // 计算最终状态
  let remainingSum = 0
  const finalRowTotals: number[] = Array(rows).fill(0)
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const val = working[i][j]
      if (val !== null) {
        remainingSum += val
        finalRowTotals[i] += val
      }
    }
  }
  const finalThreshold = calcThreshold(remainingSum)
  const loss = calcLoss(finalRowTotals, finalThreshold)
  const remainingViolations = finalRowTotals.filter((rt) => rt > 0 && rt > finalThreshold).length

  return {
    toRemove: removed,
    remainingSum,
    remainingViolations,
    removedCount: removed.length,
    loss,
    objective: remainingSum - loss,
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

// ===== 模拟数据测试 =====

export interface TestReport {
  totalCases: number
  improvedCount: number
  allObjectiveImproved: boolean
  details: {
    case: number
    totalCells: number
    originalObjective: number
    finalObjective: number
    originalLoss: number
    finalLoss: number
    improved: boolean
  }[]
}

/** 生成模拟数据并测试损失函数驱动算法 */
export function testAlgorithms(): TestReport {
  const ROWS = 49
  const COLS = 30
  const report: TestReport = { totalCases: 50, improvedCount: 0, allObjectiveImproved: true, details: [] }

  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

  for (let c = 0; c < 50; c++) {
    const cells: (number | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null) as (number | null)[])

    const scenario = c % 5
    let cellCount: number
    let valueRange: [number, number]

    switch (scenario) {
      case 0: cellCount = rand(10, 50); valueRange = [1, 1000]; break
      case 1: cellCount = rand(50, 200); valueRange = [1, 500]; break
      case 2: cellCount = rand(200, 500); valueRange = [1, 200]; break
      case 3: cellCount = rand(30, 100); valueRange = [50, 150]; break
      case 4: cellCount = rand(20, 80); valueRange = [1, 5000]; break
      default: cellCount = 50; valueRange = [1, 1000]
    }

    for (let k = 0; k < cellCount; k++) {
      const row = rand(0, ROWS - 1)
      const col = rand(0, COLS - 1)
      if (cells[row][col] === null) {
        cells[row][col] = rand(valueRange[0], valueRange[1])
      }
    }

    // 计算原始状态的 objective 和 loss
    let origTotal = 0
    const origRowTotals: number[] = Array(ROWS).fill(0)
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        const val = cells[i][j]
        if (val !== null) { origTotal += val; origRowTotals[i] += val }
      }
    }
    const origThreshold = calcThreshold(origTotal)
    const origLoss = calcLoss(origRowTotals, origThreshold)
    const origObjective = origTotal - origLoss

    // 运行算法
    const plan = computeRemovalPlan(cells)
    const finalObjective = plan?.objective ?? origObjective
    const finalLoss = plan?.loss ?? origLoss
    const improved = plan !== null && finalObjective > origObjective

    if (improved) report.improvedCount++
    else report.allObjectiveImproved = false

    report.details.push({
      case: c + 1,
      totalCells: cellCount,
      originalObjective: origObjective,
      finalObjective,
      originalLoss: origLoss,
      finalLoss,
      improved,
    })
  }

  return report
}

// ===== CSV 导入 =====

export interface ImportResult {
  success: boolean
  cells: (number | null)[][]
  message: string
  format: 'grid' | 'long'
}

/** 解析 CSV 行，处理引号包裹的字段 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

/** 解析 CSV 文本，自动识别网格格式或长格式，返回填充好的 cells */
export function parseCSV(csvText: string): ImportResult {
  const ROWS = 49
  const COLS = 30

  // 按行分割
  const rawLines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (rawLines.length === 0) {
    return { success: false, cells: [], message: 'CSV 文件为空', format: 'grid' }
  }

  const parsedRows = rawLines.map(parseCSVLine)

  // 判断格式
  const firstRow = parsedRows[0]
  const isLongFormat =
    firstRow.some((h) => h === '生肖' || h === '码数' || h === '序号') ||
    (parsedRows.length !== ROWS && parsedRows.length > 0)

  if (isLongFormat) {
    return parseLongFormat(parsedRows, ROWS, COLS)
  }
  return parseGridFormat(parsedRows, ROWS, COLS)
}

/** 解析网格格式：49行×30列矩阵 */
function parseGridFormat(rows: string[][], ROWS: number, COLS: number): ImportResult {
  const cells: (number | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null) as (number | null)[])
  let filledCount = 0

  for (let i = 0; i < Math.min(rows.length, ROWS); i++) {
    for (let j = 0; j < Math.min(rows[i].length, COLS); j++) {
      const val = rows[i][j]
      if (val !== '') {
        const num = parseInt(val, 10)
        if (!isNaN(num) && num >= 0) {
          cells[i][j] = num
          filledCount++
        }
      }
    }
  }

  return {
    success: true,
    cells,
    message: `成功导入网格格式数据，共 ${filledCount} 条记录`,
    format: 'grid',
  }
}

/** 解析长格式：生肖,码数,序号,填入数值 */
function parseLongFormat(rows: string[][], ROWS: number, COLS: number): ImportResult {
  const cells: (number | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null) as (number | null)[])

  // 构建生肖+码数 → 行索引的映射
  const rowMap: Map<string, number> = new Map()
  const ZODIAC_NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
  const ZODIAC_CODES: Record<string, number[]> = {
    '鼠': [7, 19, 31, 43],
    '牛': [6, 18, 30, 42],
    '虎': [5, 17, 29, 41],
    '兔': [4, 16, 28, 40],
    '龙': [3, 15, 27, 39],
    '蛇': [2, 14, 26, 38],
    '马': [1, 13, 25, 37, 49],
    '羊': [12, 24, 36, 48],
    '猴': [11, 23, 35, 47],
    '鸡': [10, 22, 34, 46],
    '狗': [9, 21, 33, 45],
    '猪': [8, 20, 32, 44],
  }

  let rowIdx = 0
  for (const name of ZODIAC_NAMES) {
    for (const code of ZODIAC_CODES[name]) {
      rowMap.set(`${name}:${code}`, rowIdx)
      rowIdx++
    }
  }

  // 找到表头行，确定列索引
  let headerIdx = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((h) => h === '生肖' || h === '码数')) {
      headerIdx = i
      break
    }
  }

  const dataStart = headerIdx >= 0 ? headerIdx + 1 : 0
  const header = headerIdx >= 0 ? rows[headerIdx] : []
  const zodiacCol = header.indexOf('生肖')
  const codeCol = header.indexOf('码数')
  const seqCol = header.indexOf('序号')
  const valCol = header.indexOf('填入数值')

  // 如果找不到表头列，尝试按位置推断
  const zCol = zodiacCol >= 0 ? zodiacCol : 0
  const cCol = codeCol >= 0 ? codeCol : 1
  const sCol = seqCol >= 0 ? seqCol : 2
  const vCol = valCol >= 0 ? valCol : 3

  let filledCount = 0
  let skippedCount = 0

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 4) { skippedCount++; continue }

    const zodiac = row[zCol]
    const codeStr = row[cCol]
    const seqStr = row[sCol]
    const valStr = row[vCol]

    const code = parseInt(codeStr, 10)
    const seq = parseInt(seqStr, 10)
    const val = parseInt(valStr, 10)

    if (isNaN(code) || isNaN(seq) || isNaN(val) || val < 0) { skippedCount++; continue }

    const key = `${zodiac}:${code}`
    const r = rowMap.get(key)
    if (r === undefined) { skippedCount++; continue }

    const col = seq - 1
    if (col < 0 || col >= COLS) { skippedCount++; continue }

    cells[r][col] = val
    filledCount++
  }

  return {
    success: true,
    cells,
    message: `成功导入长格式数据，共 ${filledCount} 条记录` + (skippedCount > 0 ? `，跳过 ${skippedCount} 条无效记录` : ''),
    format: 'long',
  }
}

// 暴露到 window 以便控制台测试
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).testAlgorithms = testAlgorithms
}