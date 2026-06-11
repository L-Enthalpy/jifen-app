import type { AppData, Record, Target, UserAccount } from './types'

// ========== 用户账户管理 ==========

const ACCOUNTS_KEY = 'jifen-app:accounts'
const CURRENT_USER_KEY = 'jifen-app:current-user'

function loadAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (raw) return JSON.parse(raw) as UserAccount[]
  } catch {
    // 数据损坏，重置
  }
  return []
}

function saveAccounts(accounts: UserAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // 存储空间不足
  }
}

/** SHA-256 哈希 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 注册新账号，返回成功或错误信息 */
export async function registerAccount(
  username: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!username.trim()) return { ok: false, error: '请输入用户名' }
  if (username.trim().length < 2) return { ok: false, error: '用户名至少 2 个字符' }
  if (!password) return { ok: false, error: '请输入密码' }
  if (password.length < 4) return { ok: false, error: '密码至少 4 个字符' }

  const accounts = loadAccounts()
  if (accounts.some((a) => a.username === username.trim())) {
    return { ok: false, error: '该用户名已被注册' }
  }

  const passwordHash = await hashPassword(password)
  accounts.push({ username: username.trim(), passwordHash })
  saveAccounts(accounts)

  // 自动登录
  localStorage.setItem(CURRENT_USER_KEY, username.trim())

  // 初始化 49 个默认目标
  initDefaultTargets()

  return { ok: true }
}

/** 登录，返回成功或错误信息 */
export async function loginAccount(
  username: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!username.trim()) return { ok: false, error: '请输入用户名' }
  if (!password) return { ok: false, error: '请输入密码' }

  const accounts = loadAccounts()
  const account = accounts.find((a) => a.username === username.trim())
  if (!account) return { ok: false, error: '用户名不存在' }

  const passwordHash = await hashPassword(password)
  if (account.passwordHash !== passwordHash) {
    return { ok: false, error: '密码错误' }
  }

  localStorage.setItem(CURRENT_USER_KEY, username.trim())
  return { ok: true }
}

/** 修改密码（需要已登录） */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const currentUser = getCurrentUser()
  if (!currentUser) return { ok: false, error: '未登录' }

  if (!oldPassword) return { ok: false, error: '请输入旧密码' }
  if (!newPassword) return { ok: false, error: '请输入新密码' }
  if (newPassword.length < 4) return { ok: false, error: '新密码至少 4 个字符' }

  const accounts = loadAccounts()
  const account = accounts.find((a) => a.username === currentUser)
  if (!account) return { ok: false, error: '用户不存在' }

  const oldHash = await hashPassword(oldPassword)
  if (account.passwordHash !== oldHash) {
    return { ok: false, error: '旧密码错误' }
  }

  account.passwordHash = await hashPassword(newPassword)
  saveAccounts(accounts)
  return { ok: true }
}

/** 获取当前登录用户名 */
export function getCurrentUser(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY)
}

/** 登出 */
export function logout(): void {
  localStorage.removeItem(CURRENT_USER_KEY)
  // 清除当前内存中的数据缓存
  data = null
}

/** 注销账号：删除账号、清除其所有数据、自动登出 */
export function deleteAccount(): void {
  const currentUser = getCurrentUser()
  if (!currentUser) return

  // 删除账号记录
  const accounts = loadAccounts()
  const filtered = accounts.filter((a) => a.username !== currentUser)
  saveAccounts(filtered)

  // 删除该用户的所有数据
  const userKey = `jifen-app:data:${currentUser}`
  localStorage.removeItem(userKey)

  // 登出
  localStorage.removeItem(CURRENT_USER_KEY)
  data = null
}

/** 检查是否有已注册账号 */
export function hasAnyAccount(): boolean {
  return loadAccounts().length > 0
}

// ========== 用户数据管理（按用户隔离） ==========

function initDefaultTargets(): void {
  const key = getUserStorageKey()
  // 仅在用户无任何数据时初始化
  const existing = localStorage.getItem(key)
  if (existing) return

  const targets: Target[] = Array.from({ length: 49 }, (_, i) => ({
    id: i + 1,
    name: `目标 ${i + 1}`,
  }))
  const appData: AppData = { targets, records: [] }
  try {
    localStorage.setItem(key, JSON.stringify(appData))
  } catch {
    // 存储空间不足
  }
  data = appData
}

function getUserStorageKey(): string {
  const user = getCurrentUser() ?? '__guest__'
  return `jifen-app:data:${user}`
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(getUserStorageKey())
    if (raw) {
      return JSON.parse(raw) as AppData
    }
  } catch {
    // 数据损坏，重置
  }
  return { targets: [], records: [] }
}

function saveData(appData: AppData): void {
  try {
    localStorage.setItem(getUserStorageKey(), JSON.stringify(appData))
  } catch {
    // 存储空间不足
  }
}

let data: AppData | null = null

function ensureData(): AppData {
  if (!data) {
    data = loadData()
  }
  return data
}

export function getTargets(): Target[] {
  return ensureData().targets
}

export function getRecords(): Record[] {
  return ensureData().records
}

export function getAllData(): AppData {
  return ensureData()
}

export function addTarget(): Target {
  const d = ensureData()
  const nextId =
    d.targets.length > 0
      ? Math.max(...d.targets.map((t) => t.id)) + 1
      : 1
  const target: Target = { id: nextId, name: `目标 ${nextId}` }
  d.targets = [...d.targets, target]
  saveData(d)
  return target
}

export function renameTarget(id: number, name: string): void {
  const d = ensureData()
  d.targets = d.targets.map((t) => (t.id === id ? { ...t, name } : t))
  saveData(d)
}

export function addRecord(
  targetId: number,
  points: number,
  note: string,
): Record {
  const d = ensureData()
  const record: Record = {
    id: crypto.randomUUID(),
    targetId,
    points,
    createdAt: new Date().toISOString(),
    note,
  }
  d.records = [...d.records, record]
  saveData(d)
  return record
}

export function updateRecord(
  id: string,
  updates: { targetId?: number; points?: number; note?: string },
): void {
  const d = ensureData()
  d.records = d.records.map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  )
  saveData(d)
}

export function deleteRecord(id: string): void {
  const d = ensureData()
  d.records = d.records.filter((r) => r.id !== id)
  saveData(d)
}

export function getTargetById(id: number): Target | undefined {
  return ensureData().targets.find((t) => t.id === id)
}

export function deleteTarget(id: number): void {
  const d = ensureData()
  d.targets = d.targets.filter((t) => t.id !== id)
  d.records = d.records.filter((r) => r.targetId !== id)
  saveData(d)
}

export function clearAllData(): void {
  const d = ensureData()
  d.targets = []
  d.records = []
  saveData(d)
}

export function clearAllTargets(): void {
  const d = ensureData()
  d.targets = []
  d.records = []
  saveData(d)
}

export function clearAllRecords(): void {
  const d = ensureData()
  d.records = []
  saveData(d)
}
