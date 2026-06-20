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

function formatRemainingTime(remainingMinutes) {
  if (remainingMinutes === null) return null
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return `残り ${hours}:${minutes.toString().padStart(2, '0')}`
}

export default function DayColumn({ date, tasks, isWorkDay, remainingMinutes, onToggle, onProgressChange, onDelete }) {
  const weekdayIndex = (date.getDay() + 6) % 7
  const remainingLabel = formatRemainingTime(remainingMinutes)

  return (
    <div className={`day-column${isToday(date) ? ' day-column--today' : ''}${isWorkDay ? '' : ' day-column--off'}`}>
      <div className="day-column__header">
        <span className="day-column__weekday">{WEEKDAY_LABELS[weekdayIndex]}</span>
        <span className="day-column__date">{date.getDate()}</span>
        {!isWorkDay && <span className="day-column__off-badge">休</span>}
        {remainingLabel && <span className="day-column__remaining">{remainingLabel}</span>}
      </div>

      <div className="day-column__body">
        <ul className="day-column__tasks">
          {tasks.map((task) => (
            <TaskItem
              key={`${task.id}:${task.dateKey}`}
              task={task}
              onToggle={(occurrence) => onToggle(occurrence.id, occurrence.dateKey)}
              onProgressChange={(occurrence, progress) => onProgressChange(occurrence.id, occurrence.dateKey, progress)}
              onDelete={task.type === 'once' ? onDelete : undefined}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
