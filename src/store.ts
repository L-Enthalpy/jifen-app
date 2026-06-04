import type { AppData, Record, Target } from './types'

const STORAGE_KEY = 'jifen-app:v1'

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as AppData
    }
  } catch {
    // corrupted data, reset
  }
  return { targets: [], records: [] }
}

function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded or private browsing
  }
}

let data = loadData()

export function getTargets(): Target[] {
  return data.targets
}

export function getRecords(): Record[] {
  return data.records
}

export function getAllData(): AppData {
  return data
}

export function addTarget(): Target {
  const nextId =
    data.targets.length > 0
      ? Math.max(...data.targets.map((t) => t.id)) + 1
      : 1
  const target: Target = { id: nextId, name: `目标 ${nextId}` }
  data = { ...data, targets: [...data.targets, target] }
  saveData(data)
  return target
}

export function renameTarget(id: number, name: string): void {
  data = {
    ...data,
    targets: data.targets.map((t) => (t.id === id ? { ...t, name } : t)),
  }
  saveData(data)
}

export function addRecord(
  targetId: number,
  points: number,
  note: string,
): Record {
  const record: Record = {
    id: crypto.randomUUID(),
    targetId,
    points,
    createdAt: new Date().toISOString(),
    note,
  }
  data = { ...data, records: [...data.records, record] }
  saveData(data)
  return record
}

export function updateRecord(
  id: string,
  updates: { targetId?: number; points?: number; note?: string },
): void {
  data = {
    ...data,
    records: data.records.map((r) =>
      r.id === id ? { ...r, ...updates } : r,
    ),
  }
  saveData(data)
}

export function deleteRecord(id: string): void {
  data = {
    ...data,
    records: data.records.filter((r) => r.id !== id),
  }
  saveData(data)
}

export function getTargetById(id: number): Target | undefined {
  return data.targets.find((t) => t.id === id)
}

export function deleteTarget(id: number): void {
  // 同时删除该目标下的所有记录
  data = {
    ...data,
    targets: data.targets.filter((t) => t.id !== id),
    records: data.records.filter((r) => r.targetId !== id),
  }
  saveData(data)
}

export function clearAllData(): void {
  data = { targets: [], records: [] }
  saveData(data)
}

export function clearAllTargets(): void {
  // 清空目标时也清空所有记录
  data = { targets: [], records: [] }
  saveData(data)
}

export function clearAllRecords(): void {
  // 只清空记录，保留目标
  data = { ...data, records: [] }
  saveData(data)
}

const PASSWORD_KEY = 'jifen-app:password'
const LOGGED_IN_KEY = 'jifen-app:logged-in'

export function setPassword(password: string): void {
  const encrypted = btoa(password)
  localStorage.setItem(PASSWORD_KEY, encrypted)
}

export function verifyPassword(password: string): boolean {
  const stored = localStorage.getItem(PASSWORD_KEY)
  if (!stored) return false
  return btoa(password) === stored
}

export function hasPassword(): boolean {
  return localStorage.getItem(PASSWORD_KEY) !== null
}

export function clearPassword(): void {
  localStorage.removeItem(PASSWORD_KEY)
  localStorage.removeItem(LOGGED_IN_KEY)
}

export function setLoggedIn(): void {
  localStorage.setItem(LOGGED_IN_KEY, 'true')
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(LOGGED_IN_KEY) === 'true'
}

export function clearLoggedIn(): void {
  localStorage.removeItem(LOGGED_IN_KEY)
}