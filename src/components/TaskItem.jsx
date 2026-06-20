import './TaskItem.css'

const RECURRENCE_BADGES = { daily: '毎日', weekly: '週1' }

export default function TaskItem({ task, onToggle, onProgressChange, onDelete }) {
  const badge = RECURRENCE_BADGES[task.type]

  return (
    <li className={`task-item${task.completed ? ' task-item--completed' : ''}`}>
      <div className="task-item__row">
        <label className="task-item__checkbox">
          <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} aria-label="完了" />
          {badge && <span className="task-item__badge">{badge}</span>}
          <span className="task-item__time">{task.time}</span>
        </label>
        {onDelete && (
          <button type="button" className="task-item__delete" onClick={() => onDelete(task.id)} aria-label="削除">
            ×
          </button>
        )}
      </div>
      <p className="task-item__title">{task.title}</p>
      <div className="task-item__progress">
        <input
          type="range"
          className="task-item__progress-slider"
          min="0"
          max="100"
          step="10"
          value={task.progress}
          onChange={(event) => onProgressChange(task, Number(event.target.value))}
          style={{ background: `linear-gradient(to right, var(--accent) ${task.progress}%, #e5e4e7 ${task.progress}%)` }}
          aria-label="進捗"
        />
        <span className="task-item__progress-label">{task.progress}%</span>
      </div>
    </li>
  )
}
