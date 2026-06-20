import { useState } from 'react'
import './TaskList.css'

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
const TYPE_LABELS = { daily: '毎日の作業', weekly: '1週間に1回の作業', once: '1回だけの作業' }

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
      setError('締め切りの日時を選択してください')
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
    if (result.scheduledTitles.length === 0 && result.unscheduledTitles.length === 0) {
      setScheduleResult('カレンダーに登録待ちのタスクはありません')
      return
    }
    const parts = []
    if (result.scheduledTitles.length > 0) parts.push(`${result.scheduledTitles.length}件をカレンダーに登録しました`)
    if (result.unscheduledTitles.length > 0) {
      parts.push(`${result.unscheduledTitles.length}件は締め切りまでに空き時間が見つかりませんでした`)
    }
    setScheduleResult(parts.join(' / '))
  }

  return (
    <section className="task-list">
      <h2>タスク一覧</h2>
      <form className="task-list__form" onSubmit={handleSubmit}>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="種別">
          <option value="daily">毎日の作業</option>
          <option value="weekly">1週間に1回の作業</option>
          <option value="once">1回だけの作業</option>
        </select>

        {type === 'weekly' && (
          <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))} aria-label="曜日">
            {WEEKDAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}曜日
              </option>
            ))}
          </select>
        )}

        {type === 'once' ? (
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            aria-label="締め切りの日時"
          />
        ) : (
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="時間" />
        )}

        <label className="task-list__duration-label">
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

      <button type="button" className="task-list__schedule-button" onClick={handleScheduleClick}>
        カレンダーに設定
      </button>
      {scheduleResult && <p className="task-list__schedule-result">{scheduleResult}</p>}

      <ul className="task-list__items">
        {tasks.map((task) => (
          <li key={task.id} className="task-list__item">
            <div className="task-list__item-row">
              <span className="task-list__type">{TYPE_LABELS[task.type]}</span>
              {task.type === 'weekly' && <span className="task-list__detail">{WEEKDAY_LABELS[task.weekday]}曜日</span>}
              {task.type === 'once' && (
                <span className="task-list__detail">{task.date ? `登録済: ${task.date}` : `締切: ${task.deadline}`}</span>
              )}
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
    </section>
  )
}
