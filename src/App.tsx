import { useState, useCallback, useMemo, useRef } from 'react'
import { ZODIACS, getRowLabels, loadData, saveData, clearAll, saveBackup, loadBackup, hasBackup, clearBackup } from './store'
import { compute, computeRemovalPlan, exportToCSV, parseCSV } from './calculator'
import type { CalcResult, RemovalPlan } from './calculator'

const ROWS = 49
const COLS = 30

const rowLabels = getRowLabels()

export default function App() {
  const [cells, setCells] = useState<(number | null)[][]>(loadData)
  const [plan, setPlan] = useState<RemovalPlan | null>(null)
  const [backupExists, setBackupExists] = useState(hasBackup)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const result: CalcResult = useMemo(() => compute(cells), [cells])

  const handleCellChange = useCallback(
    (row: number, col: number, raw: string) => {
      const num = parseInt(raw, 10)
      const next = cells.map((r) => [...r])
      next[row][col] = !raw.trim() || isNaN(num) || num < 0 ? null : num
      setCells(next)
      saveData(next)
      setPlan(null)
    },
    [cells],
  )

  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      clearAll()
      setCells(Array.from({ length: ROWS }, () => Array(COLS).fill(null) as (number | null)[]))
      setPlan(null)
    }
  }, [])

  const handleRecalc = useCallback(() => {
    setCells((prev) => prev.map((r) => [...r]))
    setPlan(null)
  }, [])

  const handleComputePlan = useCallback(() => {
    const p = computeRemovalPlan(cells)
    if (!p) {
      alert('无法找到有效退回方案。当前数据中，任何保留部分记录的组合都无法满足"无违规"约束，请检查数据。')
    }
    setPlan(p)
  }, [cells])

  const handleApplyPlan = useCallback(() => {
    if (!plan) return
    saveBackup(cells)
    setBackupExists(true)
    const next = cells.map((r) => [...r])
    for (const entry of plan.toRemove) {
      next[entry.row][entry.col] = null
    }
    setCells(next)
    saveData(next)
    setPlan(null)
  }, [cells, plan])

  const handleDismissPlan = useCallback(() => {
    setPlan(null)
  }, [])

  const handleRestore = useCallback(() => {
    if (!window.confirm('确定要恢复原始数据吗？当前数据将被覆盖。')) return
    const backup = loadBackup()
    if (backup) {
      setCells(backup)
      saveData(backup)
      clearBackup()
      setBackupExists(false)
      setPlan(null)
    }
  }, [])

  const handleExport = useCallback(() => {
    exportToCSV(cells, result, rowLabels)
  }, [cells, result])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        const importResult = parseCSV(text)
        if (!importResult.success) {
          alert(importResult.message)
          return
        }
        const msg = `${importResult.message}\n\n格式: ${importResult.format === 'grid' ? '网格格式 (49×30)' : '长格式 (生肖/码数/序号/值)'}\n\n确定要导入吗？当前数据将被覆盖。`
        if (window.confirm(msg)) {
          setCells(importResult.cells)
          saveData(importResult.cells)
          setPlan(null)
        }
      }
      reader.readAsText(file, 'UTF-8')

      // 重置 input 以便重复选择同一文件
      e.target.value = ''
    },
    [],
  )

  const grandTotal = result.colTotals.reduce((s, v) => s + v, 0)

  return (
    <div className="zodiac-app">
      <header className="zodiac-header">
        <h1>生肖码数对照表</h1>
        <div className="zodiac-stats">
          <span className="stat-item">
            总填入 <strong>{result.filledCount}</strong>
          </span>
          <span className="stat-item">
            违规 <strong className="violation-num">{result.violationCount}</strong>
          </span>
          <span className="stat-item">
            总积分 <strong>{result.totalSum.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            阈值 <strong>{result.threshold.toFixed(2)}</strong>
          </span>
        </div>
        <div className="zodiac-actions">
          <button className="btn btn-secondary" onClick={handleRecalc}>重新计算</button>
          {result.violationCount > 0 && (
            <button className="btn btn-warning" onClick={handleComputePlan}>计算退回方案</button>
          )}
          {backupExists && (
            <button className="btn btn-restore" onClick={handleRestore}>恢复原始数据</button>
          )}
          <button className="btn btn-danger" onClick={handleClear}>清空数据</button>
          <button className="btn btn-primary" onClick={handleExport}>导出 CSV</button>
          <button className="btn btn-primary" onClick={handleImportClick}>导入 CSV</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* 退回方案面板 */}
      {plan && (
        <div className="plan-panel">
          <div className="plan-panel-header">
            <h3>退回方案</h3>
            <button className="btn btn-small" onClick={handleDismissPlan}>关闭</button>
          </div>
          <div className="plan-stats">
            <span>退回 <strong>{plan.removedCount}</strong> 条记录</span>
            <span>保留总积分 <strong>{plan.remainingSum.toLocaleString()}</strong></span>
            <span>剩余违规 <strong>{plan.remainingViolations}</strong> 条</span>
            <span>违规损失 <strong>{plan.loss.toLocaleString()}</strong></span>
            <span>目标值 <strong>{plan.objective.toLocaleString()}</strong></span>
          </div>
          {plan.toRemove.length > 0 && (
            <div className="plan-narrative">
              <strong>方案说明：</strong>
              {plan.toRemove.map((e, i) => {
                const label = rowLabels[e.row]
                return (
                  <span key={i}>
                    {i > 0 && '；'}
                    退回序号{e.col + 1}的「{label.zodiac}」码数{label.code}（值{e.value}）
                  </span>
                )
              })}
              。退回后总积分 {plan.remainingSum.toLocaleString()}，阈值 {(plan.remainingSum * 0.75 / 47).toFixed(2)}，剩余违规 {plan.remainingViolations} 条。
            </div>
          )}
          {plan.toRemove.length > 0 && (
            <div className="plan-list-wrap">
              <table className="plan-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>列</th>
                    <th>生肖</th>
                    <th>码数</th>
                    <th>数值</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.toRemove.map((e, i) => {
                    const label = rowLabels[e.row]
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{e.col + 1}</td>
                        <td>{label.zodiac}</td>
                        <td>{label.code}</td>
                        <td className="plan-value">{e.value.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="plan-actions">
            <button className="btn btn-primary" onClick={handleApplyPlan}>
              采用方案（自动清空以上记录）
            </button>
            <button className="btn btn-secondary" onClick={handleDismissPlan}>
              不采用
            </button>
          </div>
        </div>
      )}

      <div className="zodiac-table-wrap">
        <table className="zodiac-table">
          <thead>
            <tr>
              <th className="col-zodiac" rowSpan={2}>生肖</th>
              <th className="col-code" rowSpan={2}>码数</th>
              {Array.from({ length: COLS }, (_, j) => (
                <th key={j} className="col-seq-num">{j + 1}</th>
              ))}
              <th className="col-summary" rowSpan={2}>总结</th>
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((label, rowIdx) => {
              // 当前生肖的第一行
              const isFirstOfZodiac =
                rowIdx === 0 || rowLabels[rowIdx - 1].zodiac !== label.zodiac
              // 当前生肖的总行数
              const rowSpan = ZODIACS[label.zodiacIndex].codeNumbers.length

              return (
                <tr key={rowIdx} className={result.violatingRows.includes(rowIdx) ? 'row-violation' : ''}>
                  {isFirstOfZodiac && (
                    <td className="col-zodiac" rowSpan={rowSpan}>{label.zodiac}</td>
                  )}
                  <td className="col-code">{label.code}</td>
                  {Array.from({ length: COLS }, (_, colIdx) => {
                    const val = cells[rowIdx]?.[colIdx]
                    const isPlanned = plan?.toRemove.some((e) => e.row === rowIdx && e.col === colIdx)
                    return (
                      <td
                        key={colIdx}
                        className={`cell-input ${isPlanned ? 'cell-planned' : ''}`}
                      >
                        <input
                          type="number"
                          min="0"
                          value={val ?? ''}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        />
                      </td>
                    )
                  })}
                  <td className="col-summary">{result.rowTotals[rowIdx] > 0 ? result.rowTotals[rowIdx].toLocaleString() : ''}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="col-zodiac" colSpan={2}>总计</td>
              {Array.from({ length: COLS }, (_, j) => (
                <td key={j} className="col-footer-total">
                  {result.colTotals[j] > 0 ? result.colTotals[j].toLocaleString() : ''}
                </td>
              ))}
              <td className="col-summary">{grandTotal > 0 ? grandTotal.toLocaleString() : ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}