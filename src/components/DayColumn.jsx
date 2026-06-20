import { useState } from 'react'
import TaskItem from './TaskItem'
import './DayColumn.css'

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

function isToday(date) {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export default function DayColumn({ date, dateKey, tasks, onToggle, onDelete, onAddTask }) {
  const [time, setTime] = useState('09:00')
  const [title, setTitle] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (title.trim() === '') return
    onAddTask(dateKey, time, title.trim())
    setTitle('')
  }

  const weekdayIndex = (date.getDay() + 6) % 7

  return (
    <div className={`day-column${isToday(date) ? ' day-column--today' : ''}`}>
      <div className="day-column__header">
        <span className="day-column__weekday">{WEEKDAY_LABELS[weekdayIndex]}</span>
        <span className="day-column__date">{date.getDate()}</span>
      </div>

      <ul className="day-column__tasks">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </ul>

      <form className="day-column__form" onSubmit={handleSubmit}>
        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="時間" />
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="タスクを追加"
          aria-label="タスク名"
        />
        <button type="submit">追加</button>
      </form>
    </div>
  )
}
