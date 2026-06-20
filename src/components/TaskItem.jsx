import './TaskItem.css'

const RECURRENCE_BADGES = { daily: '毎日', weekly: '週1' }

export default function TaskItem({ task, onToggle, onDelete }) {
  const badge = RECURRENCE_BADGES[task.type]

  return (
    <li className={`task-item${task.completed ? ' task-item--completed' : ''}`}>
      <label className="task-item__label">
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />
        {badge && <span className="task-item__badge">{badge}</span>}
        <span className="task-item__time">{task.time}</span>
        <span className="task-item__title">{task.title}</span>
      </label>
      {onDelete && (
        <button type="button" className="task-item__delete" onClick={() => onDelete(task.id)} aria-label="削除">
          ×
        </button>
      )}
    </li>
  )
}
