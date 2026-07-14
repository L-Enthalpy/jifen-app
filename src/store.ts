import type { ZodiacInfo, RowLabel } from './types'

const STORAGE_KEY = 'zodiac-table:v2'
const ROWS = 49
const COLS = 30

export const ZODIACS: ZodiacInfo[] = [
  { name: '鼠', codeNumbers: [7, 19, 31, 43] },
  { name: '牛', codeNumbers: [6, 18, 30, 42] },
  { name: '虎', codeNumbers: [5, 17, 29, 41] },
  { name: '兔', codeNumbers: [4, 16, 28, 40] },
  { name: '龙', codeNumbers: [3, 15, 27, 39] },
  { name: '蛇', codeNumbers: [2, 14, 26, 38] },
  { name: '马', codeNumbers: [1, 13, 25, 37, 49] },
  { name: '羊', codeNumbers: [12, 24, 36, 48] },
  { name: '猴', codeNumbers: [11, 23, 35, 47] },
  { name: '鸡', codeNumbers: [10, 22, 34, 46] },
  { name: '狗', codeNumbers: [9, 21, 33, 45] },
  { name: '猪', codeNumbers: [8, 20, 32, 44] },
]

/** 生成 49 行标签：生肖 + 码数 */
export function getRowLabels(): RowLabel[] {
  const labels: RowLabel[] = []
  for (let zi = 0; zi < ZODIACS.length; zi++) {
    for (const code of ZODIACS[zi].codeNumbers) {
      labels.push({ zodiac: ZODIACS[zi].name, code, zodiacIndex: zi })
    }
  }
  return labels
}

export function createEmptyCells(): (number | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

export function loadData(): (number | null)[][] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length === ROWS) {
        return parsed.map((row: (number | null)[]) => {
          if (row.length < COLS) {
            return [...row, ...Array(COLS - row.length).fill(null)]
          }
          return row.slice(0, COLS)
        })
      }
    }
  } catch {
    // corrupted
  }
  return createEmptyCells()
}

export function saveData(cells: (number | null)[][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells))
  } catch {
    // quota exceeded
  }
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ===== 备份机制 =====
const BACKUP_KEY = 'zodiac-table:v2:backup'

export function saveBackup(cells: (number | null)[][]): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(cells))
  } catch {
    // quota exceeded
  }
}

export function loadBackup(): (number | null)[][] | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length === ROWS) {
        return parsed.map((row: (number | null)[]) => {
          if (row.length < COLS) {
            return [...row, ...Array(COLS - row.length).fill(null)]
          }
          return row.slice(0, COLS)
        })
      }
    }
  } catch {
    // corrupted
  }
  return null
}

export function hasBackup(): boolean {
  return localStorage.getItem(BACKUP_KEY) !== null
}

export function clearBackup(): void {
  localStorage.removeItem(BACKUP_KEY)
}