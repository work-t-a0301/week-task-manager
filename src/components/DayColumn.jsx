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

export default function DayColumn({ date, dateKey, tasks, isWorkDay, defaultTime, onToggle, onDelete, onAddTask }) {
  const [time, setTime] = useState(defaultTime)
  const [title, setTitle] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (title.trim() === '') return
    onAddTask({ type: 'once', date: dateKey, time, title: title.trim() })
    setTitle('')
  }

  const weekdayIndex = (date.getDay() + 6) % 7

  return (
    <div
      className={`day-column${isToday(date) ? ' day-column--today' : ''}${isWorkDay ? '' : ' day-column--off'}`}
    >
      <div className="day-column__header">
        <span className="day-column__weekday">{WEEKDAY_LABELS[weekdayIndex]}</span>
        <span className="day-column__date">{date.getDate()}</span>
        {!isWorkDay && <span className="day-column__off-badge">休</span>}
      </div>

      <ul className="day-column__tasks">
        {tasks.map((task) => (
          <TaskItem
            key={`${task.id}:${task.dateKey}`}
            task={task}
            onToggle={(occurrence) => onToggle(occurrence.id, occurrence.dateKey)}
            onDelete={task.type === 'once' ? onDelete : undefined}
          />
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
