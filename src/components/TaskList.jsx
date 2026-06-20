import { useState } from 'react'
import './TaskList.css'

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
const TYPE_LABELS = { daily: '毎日タスク', weekly: '週1タスク', once: '単発タスク' }
const TYPE_OPTIONS = [
  { value: 'daily', label: '毎日タスク' },
  { value: 'weekly', label: '週1タスク' },
  { value: 'once', label: '単発タスク' },
]
const GROUP_ORDER = ['daily', 'weekly', 'once']

export default function TaskList({ tasks, schedule, onAddTask, onUpdateTask, onDeleteTask, onScheduleToCalendar }) {
  const [editingId, setEditingId] = useState(null)
  const [type, setType] = useState('daily')
  const [duration, setDuration] = useState('01:00')
  const [title, setTitle] = useState('')
  const [weekday, setWeekday] = useState(0)
  const [deadline, setDeadline] = useState('')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState('')
  const [scheduleResult, setScheduleResult] = useState('')

  function resetForm() {
    setEditingId(null)
    setType('daily')
    setDuration('01:00')
    setTitle('')
    setWeekday(0)
    setDeadline('')
    setStartDate('')
    setError('')
  }

  function handleEditClick(task) {
    setEditingId(task.id)
    setType(task.type)
    setDuration(task.duration)
    setTitle(task.title)
    setWeekday(task.weekday ?? schedule.workDays[0] ?? 0)
    setDeadline(task.deadline ?? '')
    setStartDate(task.startDate ?? '')
    setError('')
  }

  function handleTypeChange(nextType) {
    setType(nextType)
    if (nextType === 'weekly' && !schedule.workDays.includes(weekday)) {
      setWeekday(Math.min(...schedule.workDays))
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (title.trim() === '') {
      setError('タスク名を入力してください')
      return
    }
    if (type === 'once' && !deadline) {
      setError('締切の日時を選択してください')
      return
    }
    if (type === 'once' && startDate && deadline && startDate > deadline.slice(0, 10)) {
      setError('開始日は締切より前にしてください')
      return
    }
    setError('')
    const fields = {
      title: title.trim(),
      duration,
      weekday: type === 'weekly' ? weekday : undefined,
      deadline: type === 'once' ? deadline : undefined,
      startDate: type === 'once' ? startDate || undefined : undefined,
    }
    if (editingId) {
      onUpdateTask(editingId, fields)
    } else {
      onAddTask({ type, ...fields })
    }
    resetForm()
  }

  function handleScheduleClick() {
    const result = onScheduleToCalendar(schedule)
    const { scheduledTitles, partiallyScheduledTitles, unscheduledTitles } = result
    if (scheduledTitles.length === 0 && partiallyScheduledTitles.length === 0 && unscheduledTitles.length === 0) {
      setScheduleResult('カレンダーに登録待ちのタスクはありません')
      return
    }
    const parts = []
    if (scheduledTitles.length > 0) parts.push(`${scheduledTitles.length}件をカレンダーに登録しました`)
    if (partiallyScheduledTitles.length > 0) {
      parts.push(`${partiallyScheduledTitles.length}件は複数日に分けて一部のみ登録しました`)
    }
    if (unscheduledTitles.length > 0) {
      parts.push(`${unscheduledTitles.length}件は締切までに空き時間が見つかりませんでした`)
    }
    setScheduleResult(parts.join(' / '))
  }

  return (
    <section className="task-list">
      <h2>タスク一覧</h2>

      <div className="task-list__panel">
        <h3>{editingId ? 'タスクを編集' : 'タスクを登録'}</h3>
        <form className="task-list__form" onSubmit={handleSubmit}>
          <fieldset className="task-list__radio-group">
            <legend>種別</legend>
            {TYPE_OPTIONS.map((option) => (
              <label key={option.value} className="task-list__radio">
                <input
                  type="radio"
                  name="task-type"
                  value={option.value}
                  checked={type === option.value}
                  disabled={editingId !== null}
                  onChange={() => handleTypeChange(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          {type === 'weekly' && (
            <fieldset className="task-list__radio-group">
              <legend>曜日（休日は選択不可）</legend>
              {WEEKDAY_LABELS.map((label, index) => {
                const isHoliday = !schedule.workDays.includes(index)
                return (
                  <label key={label} className={`task-list__radio${isHoliday ? ' task-list__radio--disabled' : ''}`}>
                    <input
                      type="radio"
                      name="task-weekday"
                      value={index}
                      checked={weekday === index}
                      disabled={isHoliday}
                      onChange={() => setWeekday(index)}
                    />
                    {label}
                  </label>
                )
              })}
            </fieldset>
          )}

          {type === 'once' && (
            <label className="task-list__field-label">
              開始日（任意）
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                aria-label="開始日"
              />
            </label>
          )}

          {type === 'once' && (
            <label className="task-list__field-label">
              締切
              <input
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                aria-label="締切の日時"
              />
            </label>
          )}

          <label className="task-list__field-label">
            作業時間
            <input
              type="time"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              aria-label="作業時間"
            />
          </label>

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="タスク名"
            aria-label="タスク名"
          />
          <div className="task-list__form-actions">
            <button type="submit">{editingId ? '更新' : '追加'}</button>
            {editingId && (
              <button type="button" className="task-list__cancel" onClick={resetForm}>
                キャンセル
              </button>
            )}
          </div>
        </form>
        {error && <p className="task-list__error">{error}</p>}
      </div>

      <div className="task-list__panel">
        <h3>登録済みタスク</h3>
        {GROUP_ORDER.map((groupType) => {
          const groupTasks = tasks.filter((task) => task.type === groupType)
          return (
            <div key={groupType} className="task-list__group">
              <div className="task-list__group-header">
                <h4>{TYPE_LABELS[groupType]}</h4>
                {groupType === 'once' && (
                  <button type="button" className="task-list__schedule-button" onClick={handleScheduleClick}>
                    カレンダーに自動設定
                  </button>
                )}
              </div>
              {groupType === 'once' && scheduleResult && (
                <p className="task-list__schedule-result">{scheduleResult}</p>
              )}
              {groupTasks.length === 0 ? (
                <p className="task-list__empty">登録されているタスクはありません</p>
              ) : (
                <ul className="task-list__items">
                  {groupTasks.map((task) => (
                    <li key={task.id} className="task-list__item">
                      <div className="task-list__item-row">
                        {task.type === 'weekly' && (
                          <span className="task-list__detail">{WEEKDAY_LABELS[task.weekday]}曜日</span>
                        )}
                        <span className="task-list__duration">作業時間 {task.duration}</span>
                        <div className="task-list__item-actions">
                          <button
                            type="button"
                            className="task-list__edit"
                            onClick={() => handleEditClick(task)}
                            aria-label="編集"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className="task-list__delete"
                            onClick={() => onDeleteTask(task.id)}
                            aria-label="削除"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {task.type === 'once' && (
                        <div className="task-list__meta">
                          <span className="task-list__meta-chip">
                            <span className="task-list__meta-label">開始日</span>
                            {task.startDate || '指定なし'}
                          </span>
                          <span className="task-list__meta-chip">
                            <span className="task-list__meta-label">締切</span>
                            {formatDeadline(task.deadline)}
                          </span>
                          <span className="task-list__meta-chip">
                            <span className="task-list__meta-label">登録状況</span>
                            {describeScheduleStatus(task)}
                          </span>
                        </div>
                      )}
                      <p className="task-list__title">{task.title}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function formatDeadline(deadline) {
  if (!deadline) return '未設定'
  const [datePart, timePart] = deadline.split('T')
  return timePart ? `${datePart} ${timePart}` : datePart
}

function describeScheduleStatus(task) {
  const segments = task.segments || []
  if (segments.length === 0) return '未登録'
  const dates = segments.map((s) => s.date).join(' / ')
  return segments.length > 1 ? `${dates}（${segments.length}日に分割）` : dates
}
