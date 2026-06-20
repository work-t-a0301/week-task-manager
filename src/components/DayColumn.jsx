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

function formatRemainingTime(remainingMinutes) {
  if (remainingMinutes === null) return null
  const isOver = remainingMinutes < 0
  const minutesAbs = Math.abs(remainingMinutes)
  const hours = Math.floor(minutesAbs / 60)
  const minutes = minutesAbs % 60
  const label = `${hours}:${minutes.toString().padStart(2, '0')}`
  return isOver ? { text: `超過 ${label}`, over: true } : { text: `残り ${label}`, over: false }
}

export default function DayColumn({
  date,
  dateKey,
  tasks,
  isWorkDay,
  remainingMinutes,
  onToggle,
  onProgressChange,
  onDurationChange,
  onDelete,
  onMoveTask,
  onSplit,
  onMerge,
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const weekdayIndex = (date.getDay() + 6) % 7
  const remaining = formatRemainingTime(remainingMinutes)

  function handleDragStart(event, task) {
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({ taskId: task.id, fromDateKey: task.dateKey, fromTime: task.time }),
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(event) {
    if (!isWorkDay) return
    event.preventDefault()
    setIsDragOver(true)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragOver(false)
    if (!isWorkDay) return
    const raw = event.dataTransfer.getData('application/json')
    if (!raw) return
    const { taskId, fromDateKey, fromTime } = JSON.parse(raw)
    onMoveTask(taskId, fromDateKey, fromTime, dateKey)
  }

  return (
    <div
      className={`day-column${isToday(date) ? ' day-column--today' : ''}${isWorkDay ? '' : ' day-column--off'}${isDragOver ? ' day-column--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="day-column__header">
        <span className="day-column__weekday">{WEEKDAY_LABELS[weekdayIndex]}</span>
        <span className="day-column__date">{date.getDate()}</span>
        {!isWorkDay && <span className="day-column__off-badge">休</span>}
        {remaining && (
          <span className={`day-column__remaining${remaining.over ? ' day-column__remaining--over' : ''}`}>
            {remaining.text}
          </span>
        )}
      </div>

      {(isWorkDay || tasks.length > 0) && (
        <div className="day-column__body">
          <ul className="day-column__tasks">
            {tasks.map((task) => (
              <TaskItem
                key={`${task.id}:${task.dateKey}:${task.time || ''}`}
                task={task}
                draggable={task.type === 'weekly' || task.type === 'once'}
                onDragStart={handleDragStart}
                onToggle={(occurrence) => onToggle(occurrence.id, occurrence.dateKey)}
                onProgressChange={(occurrence, progress) => onProgressChange(occurrence.id, occurrence.dateKey, progress)}
                onDurationChange={(occurrence, duration) =>
                  onDurationChange(occurrence.id, occurrence.dateKey, occurrence.time, duration)
                }
                onDelete={task.type === 'once' ? onDelete : undefined}
                onSplit={task.type === 'once' ? (occurrence) => onSplit(occurrence.id, occurrence.dateKey, occurrence.time) : undefined}
                onMerge={task.type === 'once' ? (occurrence) => onMerge(occurrence.id, occurrence.dateKey, occurrence.time) : undefined}
                mergeDisabled={task.sameDayCount <= 1}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
