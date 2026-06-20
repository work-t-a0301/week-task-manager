import './TaskItem.css'

const RECURRENCE_BADGES = { daily: '毎日', weekly: '週1' }
const STATUS_MODIFIERS = { 順調: 'ontrack', 遅延: 'late', 前倒し: 'ahead' }

export default function TaskItem({
  task,
  draggable,
  onDragStart,
  onToggle,
  onProgressChange,
  onDurationChange,
  onDelete,
  onSplit,
  onMerge,
}) {
  const badge = RECURRENCE_BADGES[task.type]

  return (
    <li className={`task-item${task.completed ? ' task-item--completed' : ''}${draggable ? ' task-item--draggable' : ''}`}>
      <div className="task-item__row">
        <div className="task-item__main">
          {draggable && (
            <span
              className="task-item__drag-handle"
              draggable
              onDragStart={(event) => onDragStart(event, task)}
              aria-hidden="true"
              title="ここをドラッグして移動"
            >
              ⠿⠿
            </span>
          )}
          <label className="task-item__checkbox">
            <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} aria-label="完了" />
            {badge && <span className="task-item__badge">{badge}</span>}
            {task.time && <span className="task-item__time">{task.time}</span>}
            {task.type === 'once' ? (
              <input
                type="time"
                className="task-item__duration-input"
                value={task.duration}
                onChange={(event) => onDurationChange(task, event.target.value)}
                aria-label="この日の作業時間"
              />
            ) : (
              <span className="task-item__duration">作業時間 {task.duration}</span>
            )}
            {task.segmentTotal > 1 && (
              <span className="task-item__split-badge">
                {task.segmentIndex}/{task.segmentTotal}日目
              </span>
            )}
            {task.status && (
              <span className={`task-item__status task-item__status--${STATUS_MODIFIERS[task.status]}`}>
                {task.status}
              </span>
            )}
          </label>
        </div>
        <div className="task-item__actions">
          {onSplit && (
            <button type="button" className="task-item__split-button" onClick={() => onSplit(task)}>
              分割
            </button>
          )}
          {onMerge && (
            <button type="button" className="task-item__merge-button" onClick={() => onMerge(task)}>
              集約
            </button>
          )}
          {onDelete && (
            <button type="button" className="task-item__delete" onClick={() => onDelete(task.id)} aria-label="削除">
              ×
            </button>
          )}
        </div>
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
