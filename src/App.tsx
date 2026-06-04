import { useState, useCallback, useMemo } from 'react'
import type { RecordWithMeta } from './types'
import { getTargets, getRecords, addTarget, renameTarget, deleteTarget, clearAllData, clearAllTargets, clearAllRecords, addRecord, updateRecord, deleteRecord } from './store'
import { computeAnomalyStatus, getStats } from './anomaly'
import { OverviewBar } from './components/OverviewBar'
import { TargetSidebar } from './components/TargetSidebar'
import { RecordTable } from './components/RecordTable'
import { RecordModal } from './components/RecordModal'
import { TargetModal } from './components/TargetModal'

export default function App() {
  const [version, setVersion] = useState(0)
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordWithMeta | null>(null)
  const [targetModalOpen, setTargetModalOpen] = useState(false)

  const refresh = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  const targets = useMemo(() => getTargets(), [version])
  const records = useMemo(() => getRecords(), [version])
  const recordsWithMeta = useMemo(
    () => computeAnomalyStatus(records, targets),
    [records, targets],
  )

  const filteredRecords = useMemo(() => {
    if (selectedTargetId === null) return recordsWithMeta
    return recordsWithMeta.filter((r) => r.targetId === selectedTargetId)
  }, [recordsWithMeta, selectedTargetId])

  const stats = useMemo(() => getStats(recordsWithMeta), [recordsWithMeta])

  const targetStats = useMemo(() => {
    const map = new Map<number, number>()
    for (const r of records) {
      map.set(r.targetId, (map.get(r.targetId) ?? 0) + r.points)
    }
    return map
  }, [records])

  const handleAddTarget = useCallback(() => {
    addTarget()
    refresh()
  }, [refresh])

  const handleRenameTarget = useCallback(
    (id: number, name: string) => {
      renameTarget(id, name)
      refresh()
    },
    [refresh],
  )

  const handleAddRecord = useCallback(
    (targetId: number, points: number, note: string) => {
      addRecord(targetId, points, note)
      refresh()
    },
    [refresh],
  )

  const handleUpdateRecord = useCallback(
    (id: string, updates: { targetId?: number; points?: number; note?: string }) => {
      updateRecord(id, updates)
      refresh()
    },
    [refresh],
  )

  const handleDeleteRecord = useCallback(
    (id: string) => {
      deleteRecord(id)
      refresh()
    },
    [refresh],
  )

  const handleDeleteTarget = useCallback(
    (id: number) => {
      deleteTarget(id)
      refresh()
    },
    [refresh],
  )

  const handleClearAll = useCallback(() => {
    clearAllData()
    refresh()
  }, [refresh])

  const handleClearTargets = useCallback(() => {
    clearAllTargets()
    refresh()
  }, [refresh])

  const handleClearRecords = useCallback(() => {
    clearAllRecords()
    refresh()
  }, [refresh])

  const openAddModal = useCallback(() => {
    setEditingRecord(null)
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((record: RecordWithMeta) => {
    setEditingRecord(record)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingRecord(null)
  }, [])

  return (
    <div className="app">
      <OverviewBar
        stats={stats}
        onRecalculate={refresh}
        onAddRecord={openAddModal}
        onManageTargets={() => setTargetModalOpen(true)}
        onClearAll={handleClearAll}
        onClearTargets={handleClearTargets}
        onClearRecords={handleClearRecords}
        records={recordsWithMeta}
        targets={targets}
      />
      <div className="main-content">
        <TargetSidebar
          targets={targets}
          selectedTargetId={selectedTargetId}
          onSelect={setSelectedTargetId}
          targetStats={targetStats}
          onAddTarget={handleAddTarget}
        />
        <RecordTable
          records={filteredRecords}
          onEdit={openEditModal}
          onDelete={handleDeleteRecord}
        />
      </div>
      {modalOpen && (
        <RecordModal
          record={editingRecord}
          targets={targets}
          onSave={(targetId, points, note) => {
            if (editingRecord) {
              handleUpdateRecord(editingRecord.id, { targetId, points, note })
            } else {
              handleAddRecord(targetId, points, note)
            }
            closeModal()
          }}
          onClose={closeModal}
        />
      )}
      {targetModalOpen && (
        <TargetModal
          targets={targets}
          onRename={handleRenameTarget}
          onDelete={handleDeleteTarget}
          onAdd={handleAddTarget}
          onClose={() => setTargetModalOpen(false)}
        />
      )}
    </div>
  )
}