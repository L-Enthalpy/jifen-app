export interface Target {
  id: number
  name: string
}

export interface Record {
  id: string
  targetId: number
  points: number
  createdAt: string
  note: string
}

export interface RecordWithMeta extends Record {
  targetName: string
  isAnomaly: boolean
}

export interface AppData {
  targets: Target[]
  records: Record[]
}