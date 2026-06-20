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
  const [error, setError] = useState('')
  const [scheduleResult, setScheduleResult] = useState('')

  function resetForm() {
    setEditingId(null)
    setType('daily')
    setDuration('01:00')
    setTitle('')
    setWeekday(0)
    setDeadline('')
    setError('')
  }

  function handleEditClick(task) {
    setEditingId(task.id)
    setType(task.type)
    setDuration(task.duration)
    setTitle(task.title)
    setWeekday(task.weekday ?? 0)
    setDeadline(task.deadline ?? '')
    setError('')
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
    setError('')
    const fields = {
      title: title.trim(),
      duration,
      weekday: type === 'weekly' ? weekday : undefined,
      deadline: type === 'once' ? deadline : undefined,
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
                  onChange={() => setType(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          {type === 'weekly' && (
            <fieldset className="task-list__radio-group">
              <legend>曜日</legend>
              {WEEKDAY_LABELS.map((label, index) => (
                <label key={label} className="task-list__radio">
                  <input
                    type="radio"
                    name="task-weekday"
                    value={index}
                    checked={weekday === index}
                    onChange={() => setWeekday(index)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
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
                    カレンダーに設定
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
                        {task.type === 'once' && <span className="task-list__detail">{describeOnceSchedule(task)}</span>}
                        <span className="task-list__duration">作業時間 {task.duration}</span>
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

function describeOnceSchedule(task) {
  const segments = task.segments || []
  if (segments.length === 0) return `締切: ${task.deadline}`
  const dates = segments.map((s) => s.date).join(' / ')
  return segments.length > 1 ? `登録済: ${dates}（${segments.length}日に分割）` : `登録済: ${dates}`
}
