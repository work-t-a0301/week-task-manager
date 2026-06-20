import { useState } from 'react'
import './WorkScheduleForm.css'

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export default function WorkScheduleForm({ initialSchedule, onSave }) {
  const [workDays, setWorkDays] = useState(initialSchedule.workDays)
  const [startTime, setStartTime] = useState(initialSchedule.startTime)
  const [endTime, setEndTime] = useState(initialSchedule.endTime)
  const [hasBreak, setHasBreak] = useState(Boolean(initialSchedule.breakStart))
  const [breakStart, setBreakStart] = useState(initialSchedule.breakStart || '12:00')
  const [breakEnd, setBreakEnd] = useState(initialSchedule.breakEnd || '13:00')
  const [error, setError] = useState('')

  function toggleDay(index) {
    setWorkDays((prev) => (prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index].sort()))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (workDays.length === 0) {
      setError('働く曜日を1つ以上選択してください')
      return
    }
    if (startTime >= endTime) {
      setError('開始時間は終了時間より前にしてください')
      return
    }
    if (hasBreak) {
      if (breakStart >= breakEnd) {
        setError('休憩の開始時間は終了時間より前にしてください')
        return
      }
      if (breakStart < startTime || breakEnd > endTime) {
        setError('休憩時間は働く時間の範囲内にしてください')
        return
      }
    }
    setError('')
    onSave({
      workDays,
      startTime,
      endTime,
      breakStart: hasBreak ? breakStart : null,
      breakEnd: hasBreak ? breakEnd : null,
    })
  }

  return (
    <form className="work-schedule-form" onSubmit={handleSubmit}>
      <h2>働く曜日・時間を設定</h2>
      <div className="work-schedule-form__days">
        {WEEKDAY_LABELS.map((label, index) => (
          <label key={label} className="work-schedule-form__day">
            <input type="checkbox" checked={workDays.includes(index)} onChange={() => toggleDay(index)} />
            {label}
          </label>
        ))}
      </div>
      <div className="work-schedule-form__time">
        <label>
          開始
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </label>
        <label>
          終了
          <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </label>
      </div>
      <label className="work-schedule-form__break-toggle">
        <input type="checkbox" checked={hasBreak} onChange={(event) => setHasBreak(event.target.checked)} />
        休憩時間を設定する
      </label>
      {hasBreak && (
        <div className="work-schedule-form__time">
          <label>
            休憩開始
            <input type="time" value={breakStart} onChange={(event) => setBreakStart(event.target.value)} />
          </label>
          <label>
            休憩終了
            <input type="time" value={breakEnd} onChange={(event) => setBreakEnd(event.target.value)} />
          </label>
        </div>
      )}
      {error && <p className="work-schedule-form__error">{error}</p>}
      <button type="submit">保存</button>
    </form>
  )
}
