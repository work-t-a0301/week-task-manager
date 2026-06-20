import { useState } from 'react'
import './TaskList.css'

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
const TYPE_LABELS = { daily: '毎日タスク', weekly: '週1タスク', once: '単発タスク' }
const TYPE_OPTIONS = [
  { value: 'daily', label: '毎日タスク' },
  { value: 'weekly', label: '週1タスク' },
  { value: 'once', label: '単発タスク' },
]

export default function TaskList({ tasks, defaultTime, schedule, onAddTask, onDeleteTask, onScheduleToCalendar }) {
  const [type, setType] = useState('daily')
  const [time, setTime] = useState(defaultTime)
  const [duration, setDuration] = useState('01:00')
  const [title, setTitle] = useState('')
  const [weekday, setWeekday] = useState(0)
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')
  const [scheduleResult, setScheduleResult] = useState('')

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
    onAddTask({
      type,
      time: type === 'once' ? undefined : time,
      duration,
      title: title.trim(),
      weekday: type === 'weekly' ? weekday : undefined,
      deadline: type === 'once' ? deadline : undefined,
    })
    setTitle('')
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
        <h3>タスクを登録</h3>
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

          {type === 'once' ? (
            <label className="task-list__field-label">
              締切
              <input
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                aria-label="締切の日時"
              />
            </label>
          ) : (
            <label className="task-list__field-label">
              時間
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="時間" />
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
          <button type="submit">追加</button>
        </form>
        {error && <p className="task-list__error">{error}</p>}
      </div>

      <div className="task-list__panel">
        <h3>登録済みタスク</h3>
        <button type="button" className="task-list__schedule-button" onClick={handleScheduleClick}>
          カレンダーに設定
        </button>
        {scheduleResult && <p className="task-list__schedule-result">{scheduleResult}</p>}

        <ul className="task-list__items">
          {tasks.map((task) => (
            <li key={task.id} className="task-list__item">
              <div className="task-list__item-row">
                <span className="task-list__type">{TYPE_LABELS[task.type]}</span>
                {task.type === 'weekly' && (
                  <span className="task-list__detail">{WEEKDAY_LABELS[task.weekday]}曜日</span>
                )}
                {task.type === 'once' && <span className="task-list__detail">{describeOnceSchedule(task)}</span>}
                <span className="task-list__duration">作業時間 {task.duration}</span>
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
