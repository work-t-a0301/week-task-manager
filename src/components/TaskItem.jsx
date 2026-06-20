import './TaskItem.css'

export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <li className={`task-item${task.completed ? ' task-item--completed' : ''}`}>
      <label className="task-item__label">
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} />
        <span className="task-item__time">{task.time}</span>
        <span className="task-item__title">{task.title}</span>
      </label>
      <button type="button" className="task-item__delete" onClick={() => onDelete(task.id)} aria-label="削除">
        ×
      </button>
    </li>
  )
}
