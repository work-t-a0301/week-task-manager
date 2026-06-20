import { useEffect, useMemo, useState } from 'react'
import { initialTasks } from '../data/initialTasks'

const DAY_MS = 24 * 60 * 60 * 1000
const TASKS_KEY = 'week-task-manager:tasks'
const COMPLETIONS_KEY = 'week-task-manager:completions'
const DEFAULT_DURATION = '01:00'

function loadJSON(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  // 日曜(0)は前の週の月曜扱いになるため -6日で補正する
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeToMinutes(time) {
  const [hours, minutes] = (time || '00:00').split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0')
  const mins = (minutes % 60).toString().padStart(2, '0')
  return `${hours}:${mins}`
}

function durationToMinutes(duration) {
  return timeToMinutes(duration || DEFAULT_DURATION)
}

function normalizeOccurrence(raw) {
  if (raw && typeof raw === 'object') {
    return { completed: Boolean(raw.completed), progress: raw.progress ?? (raw.completed ? 100 : 0) }
  }
  return { completed: false, progress: 0 }
}

function weekdayIndexOf(date) {
  return (date.getDay() + 6) % 7
}

// 指定日にその日働く分(=出現する)タスクを、その日の時間帯・作業時間とともに返す
function tasksOccurringOnDate(date, dateKey, tasks) {
  const weekdayIndex = weekdayIndexOf(date)
  return tasks.flatMap((task) => {
    if (task.type === 'daily') return [task]
    if (task.type === 'weekly') return task.weekday === weekdayIndex ? [task] : []
    const segment = (task.segments || []).find((s) => s.date === dateKey)
    return segment ? [{ ...task, time: segment.time, duration: segment.duration }] : []
  })
}

function findLargestFreeGap(busyIntervals, dayStartMinutes, dayEndMinutes) {
  const sorted = [...busyIntervals].sort((a, b) => a.start - b.start)
  let cursor = dayStartMinutes
  let best = null
  for (const interval of sorted) {
    const gapSize = interval.start - cursor
    if (gapSize > 0 && (!best || gapSize > best.size)) {
      best = { start: cursor, size: gapSize }
    }
    cursor = Math.max(cursor, interval.end)
  }
  const tailSize = dayEndMinutes - cursor
  if (tailSize > 0 && (!best || tailSize > best.size)) {
    best = { start: cursor, size: tailSize }
  }
  return best
}

function formatTimeOfDay(date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export function useWeekTasks() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [tasks, setTasks] = useState(() => loadJSON(TASKS_KEY, initialTasks))
  const [occurrenceStates, setOccurrenceStates] = useState(() => loadJSON(COMPLETIONS_KEY, {}))

  useEffect(() => {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    window.localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(occurrenceStates))
  }, [occurrenceStates])

  const weekDates = useMemo(() => {
    const monday = getMonday(new Date())
    const weekStart = new Date(monday.getTime() + weekOffset * 7 * DAY_MS)
    return Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS))
  }, [weekOffset])

  function occurrencesForDate(date, dateKey) {
    return tasksOccurringOnDate(date, dateKey, tasks)
      .map((task) => ({ ...task, dateKey, ...normalizeOccurrence(occurrenceStates[`${task.id}:${dateKey}`]) }))
      .sort((a, b) => a.time.localeCompare(b.time))
  }

  function remainingMinutesForDate(date, dateKey, schedule) {
    const weekdayIndex = weekdayIndexOf(date)
    if (!schedule.workDays.includes(weekdayIndex)) return null
    const totalWorkMinutes = timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)
    const busyMinutes = tasksOccurringOnDate(date, dateKey, tasks).reduce(
      (sum, task) => sum + durationToMinutes(task.duration),
      0,
    )
    return Math.max(totalWorkMinutes - busyMinutes, 0)
  }

  function addTask({ type, time, title, duration, weekday, deadline }) {
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        time,
        title,
        duration: duration || DEFAULT_DURATION,
        weekday,
        deadline,
        segments: type === 'once' ? [] : undefined,
      },
    ])
  }

  function updateOccurrence(taskId, dateKey, updater) {
    const key = `${taskId}:${dateKey}`
    setOccurrenceStates((prev) => ({ ...prev, [key]: updater(normalizeOccurrence(prev[key])) }))
  }

  function toggleCompletion(taskId, dateKey) {
    updateOccurrence(taskId, dateKey, (prev) => {
      const completed = !prev.completed
      return { completed, progress: completed ? 100 : prev.progress }
    })
  }

  function setProgress(taskId, dateKey, progress) {
    updateOccurrence(taskId, dateKey, () => ({ progress, completed: progress === 100 }))
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((task) => task.id !== id))
    setOccurrenceStates((prev) => {
      const next = {}
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(`${id}:`)) next[key] = value
      }
      return next
    })
  }

  // 締め切りが設定済みでまだ作業時間を割り切れていないタスクを、働く時間内の
  // 空き時間（複数日にまたがってもよい）へ自動的に割り当てる
  function scheduleUnplacedTasks(schedule) {
    const candidates = tasks.filter((task) => {
      if (task.type !== 'once' || !task.deadline) return false
      const scheduledMinutes = (task.segments || []).reduce((sum, s) => sum + durationToMinutes(s.duration), 0)
      return scheduledMinutes < durationToMinutes(task.duration)
    })

    if (candidates.length === 0) {
      return { scheduledTitles: [], partiallyScheduledTitles: [], unscheduledTitles: [] }
    }

    const sorted = [...candidates].sort((a, b) => a.deadline.localeCompare(b.deadline))
    let working = tasks
    const scheduledTitles = []
    const partiallyScheduledTitles = []
    const unscheduledTitles = []
    const dayStart = timeToMinutes(schedule.startTime)
    const dayEnd = timeToMinutes(schedule.endTime)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    for (const task of sorted) {
      const deadlineDate = new Date(task.deadline)
      const existingSegments = task.segments || []
      let remaining = durationToMinutes(task.duration) - existingSegments.reduce(
        (sum, s) => sum + durationToMinutes(s.duration),
        0,
      )
      const newSegments = []

      for (const cursor = new Date(todayStart); cursor.getTime() <= deadlineDate.getTime() && remaining > 0; cursor.setDate(cursor.getDate() + 1)) {
        const weekdayIndex = weekdayIndexOf(cursor)
        if (!schedule.workDays.includes(weekdayIndex)) continue

        const dateKey = toDateKey(cursor)
        if (existingSegments.some((s) => s.date === dateKey)) continue

        const isDeadlineDay = dateKey === toDateKey(deadlineDate)
        const effectiveDayEnd = isDeadlineDay ? Math.min(dayEnd, timeToMinutes(formatTimeOfDay(deadlineDate))) : dayEnd

        const busy = tasksOccurringOnDate(cursor, dateKey, working).map((t) => {
          const start = timeToMinutes(t.time)
          return { start, end: start + durationToMinutes(t.duration) }
        })
        const gap = findLargestFreeGap(busy, dayStart, effectiveDayEnd)
        if (!gap) continue

        const allocated = Math.min(gap.size, remaining)
        newSegments.push({ date: dateKey, time: minutesToTime(gap.start), duration: minutesToTime(allocated) })
        remaining -= allocated
        working = working.map((t) =>
          t.id === task.id ? { ...t, segments: [...existingSegments, ...newSegments] } : t,
        )
      }

      if (newSegments.length === 0) {
        unscheduledTitles.push(task.title)
      } else if (remaining > 0) {
        partiallyScheduledTitles.push(task.title)
      } else {
        scheduledTitles.push(task.title)
      }
    }

    setTasks(working)
    return { scheduledTitles, partiallyScheduledTitles, unscheduledTitles }
  }

  return {
    weekDates,
    goToPrevWeek: () => setWeekOffset((offset) => offset - 1),
    goToNextWeek: () => setWeekOffset((offset) => offset + 1),
    goToToday: () => setWeekOffset(0),
    tasks,
    occurrencesForDate,
    remainingMinutesForDate,
    addTask,
    toggleCompletion,
    setProgress,
    deleteTask,
    scheduleUnplacedTasks,
  }
}
