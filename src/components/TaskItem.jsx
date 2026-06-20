import './TaskItem.css'

const RECURRENCE_BADGES = { daily: '毎日', weekly: '週1' }
const STATUS_MODIFIERS = { 順調: 'ontrack', 遅延: 'late', 前倒し: 'ahead' }

function formatDeadline(deadline) {
  const [datePart, timePart] = deadline.split('T')
  return timePart ? `${datePart} ${timePart}` : datePart
}

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
  mergeDisabled,
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
          <div className="task-item__info">
            {badge && <span className="task-item__badge">{badge}</span>}
            {task.time && <span className="task-item__time">{task.time}</span>}
            {task.type === 'once' ? (
              <span className="task-item__duration-wrap">
                <span className="task-item__duration-text">作業時間</span>
                <input
                  type="time"
                  step="600"
                  className="task-item__duration-input"
                  value={task.duration}
                  onChange={(event) => onDurationChange(task, event.target.value)}
                  aria-label="この日の作業時間"
                />
                {task.dayShare != null && <span className="task-item__day-share">({task.dayShare}%)</span>}
              </span>
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
          </div>
        </div>
        <div className="task-item__actions">
          {onSplit && (
            <button type="button" className="task-item__split-button" onClick={() => onSplit(task)}>
              分割
            </button>
          )}
          {onMerge && (
            <button
              type="button"
              className="task-item__merge-button"
              onClick={() => onMerge(task)}
              disabled={mergeDisabled}
            >
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
      {task.type === 'once' && (task.startDate || task.deadline || task.totalDuration) && (
        <div className="task-item__meta">
          {task.totalDuration && (
            <span className="task-item__meta-chip">
              <span className="task-item__meta-label">全作業時間</span>
              {task.totalDuration}
            </span>
          )}
          {task.startDate && (
            <span className="task-item__meta-chip">
              <span className="task-item__meta-label">開始日</span>
              {task.startDate}
            </span>
          )}
          {task.deadline && (
            <span className="task-item__meta-chip">
              <span className="task-item__meta-label">締切</span>
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>
      )}
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
        <label className="task-item__complete">
          <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} aria-label="完了" />
          完了
        </label>
      </div>
    </li>
  )
}
