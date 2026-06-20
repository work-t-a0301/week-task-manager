import { useState } from 'react'
import './TaskList.css'

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
const TYPE_LABELS = { daily: '毎日の作業', weekly: '1週間に1回の作業', once: '1回だけの作業' }

export default function TaskList({ tasks, defaultTime, onAddTask, onDeleteTask }) {
  const [type, setType] = useState('daily')
  const [time, setTime] = useState(defaultTime)
  const [title, setTitle] = useState('')
  const [weekday, setWeekday] = useState(0)
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (title.trim() === '') {
      setError('タスク名を入力してください')
      return
    }
    if (type === 'once' && !date) {
      setError('日付を選択してください')
      return
    }
    setError('')
    onAddTask({
      type,
      time,
      title: title.trim(),
      weekday: type === 'weekly' ? weekday : undefined,
      date: type === 'once' ? date : undefined,
    })
    setTitle('')
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

        {type === 'once' && (
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="日付" />
        )}

        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="時間" />
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

      <ul className="task-list__items">
        {tasks.map((task) => (
          <li key={task.id} className="task-list__item">
            <span className="task-list__type">{TYPE_LABELS[task.type]}</span>
            {task.type === 'weekly' && <span className="task-list__detail">{WEEKDAY_LABELS[task.weekday]}曜日</span>}
            {task.type === 'once' && <span className="task-list__detail">{task.date}</span>}
            <span className="task-list__time">{task.time}</span>
            <span className="task-list__title">{task.title}</span>
            <button type="button" className="task-list__delete" onClick={() => onDeleteTask(task.id)} aria-label="削除">
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
