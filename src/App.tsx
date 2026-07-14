import { useState, useCallback, useMemo } from 'react'
import { ZODIACS, getColOffset, loadData, saveData, clearAll, saveBackup, loadBackup, hasBackup, clearBackup } from './store'
import { compute, computeRemovalPlan, exportToCSV } from './calculator'
import type { CalcResult, RemovalPlan } from './calculator'

const ROWS = 30
const COLS = 49

/** 根据列索引获取生肖索引 */
function getZodiacIndex(col: number): number {
  let offset = 0
  for (let i = 0; i < ZODIACS.length; i++) {
    const span = ZODIACS[i].codeNumbers.length
    if (col < offset + span) return i
    offset += span
  }
  return ZODIACS.length - 1
}

export default function App() {
  const [cells, setCells] = useState<(number | null)[][]>(loadData)
  const [plan, setPlan] = useState<RemovalPlan | null>(null)
  const [backupExists, setBackupExists] = useState(hasBackup)

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
    setPlan(p)
  }, [cells])

  const handleApplyPlan = useCallback(() => {
    if (!plan) return
    // 先备份原始数据
    saveBackup(cells)
    setBackupExists(true)
    // 清空退回的记录
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
    exportToCSV(cells, result, ZODIACS.map((z) => z.name), getZodiacIndex)
  }, [cells, result])

  // 计算每列合计（按生肖分组，适配可变列数）
  const zodiacColTotals = useMemo(() => {
    const totals: number[] = Array(ZODIACS.length).fill(0)
    for (let z = 0; z < ZODIACS.length; z++) {
      const offset = getColOffset(z)
      const span = ZODIACS[z].codeNumbers.length
      for (let k = 0; k < span; k++) {
        totals[z] += result.colTotals[offset + k] ?? 0
      }
    }
    return totals
  }, [result.colTotals])

  const grandTotal = zodiacColTotals.reduce((s, v) => s + v, 0)

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
          </div>
          {plan.toRemove.length > 0 && (
            <div className="plan-narrative">
              <strong>方案说明：</strong>
              {plan.toRemove.map((e, i) => {
                const zIdx = getZodiacIndex(e.col)
                const zOff = getColOffset(zIdx)
                const codeNum = e.col - zOff + 1
                const zName = ZODIACS[zIdx].name
                return (
                  <span key={i}>
                    {i > 0 && '；'}
                    退回第{e.row + 1}行「{zName}」的码数{codeNum}（值{e.value}）
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
                    <th>行</th>
                    <th>生肖</th>
                    <th>码数</th>
                    <th>数值</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.toRemove.map((e, i) => {
                    const zIdx = getZodiacIndex(e.col)
                    const zOff = getColOffset(zIdx)
                    const codeNum = e.col - zOff + 1
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{e.row + 1}</td>
                        <td>{ZODIACS[zIdx].name}</td>
                        <td>{codeNum}</td>
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
              <th className="col-seq" rowSpan={2}>序号</th>
              {ZODIACS.map((z, zi) => (
                <th key={zi} colSpan={z.codeNumbers.length} className="col-zodiac-header">
                  {z.name}
                  <div className="zodiac-codes">
                    {z.codeNumbers.join(' / ')}
                  </div>
                </th>
              ))}
              <th className="col-summary" rowSpan={2}>总结</th>
            </tr>
            <tr>
              {ZODIACS.map((z, zi) =>
                Array.from({ length: z.codeNumbers.length }, (_, k) => (
                  <th key={`${zi}-${k}`} className="col-code-num">
                    {k + 1}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, i) => (
              <tr key={i}>
                <td className="col-seq">{i + 1}</td>
                {Array.from({ length: COLS }, (_, j) => {
                  const val = cells[i]?.[j]
                  const isViolation = result.violations[i]?.[j] ?? false
                  const isPlanned = plan?.toRemove.some((e) => e.row === i && e.col === j)
                  return (
                    <td
                      key={j}
                      className={`cell-input ${isViolation ? 'cell-violation' : ''} ${isPlanned ? 'cell-planned' : ''}`}
                    >
                      <input
                        type="number"
                        min="0"
                        value={val ?? ''}
                        onChange={(e) => handleCellChange(i, j, e.target.value)}
                        className={isViolation ? 'input-violation' : ''}
                      />
                    </td>
                  )
                })}
                <td className="col-summary">{result.rowTotals[i] > 0 ? result.rowTotals[i].toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="col-seq">总计</td>
              {zodiacColTotals.map((total, i) => (
                <td key={i} colSpan={ZODIACS[i].codeNumbers.length} className="col-summary">
                  {total > 0 ? total.toLocaleString() : ''}
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