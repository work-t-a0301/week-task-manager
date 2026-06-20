import { useEffect, useMemo, useState } from 'react'
import { initialTasks } from '../data/initialTasks'

const DAY_MS = 24 * 60 * 60 * 1000
const TASKS_KEY = 'week-task-manager:tasks'
const COMPLETIONS_KEY = 'week-task-manager:completions'

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
  return date.toISOString().slice(0, 10)
}

export function useWeekTasks() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [tasks, setTasks] = useState(() => loadJSON(TASKS_KEY, initialTasks))
  const [completions, setCompletions] = useState(() => loadJSON(COMPLETIONS_KEY, {}))

  useEffect(() => {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    window.localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions))
  }, [completions])

  const weekDates = useMemo(() => {
    const monday = getMonday(new Date())
    const weekStart = new Date(monday.getTime() + weekOffset * 7 * DAY_MS)
    return Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS))
  }, [weekOffset])

  function occurrencesForDate(date, dateKey) {
    const weekdayIndex = (date.getDay() + 6) % 7
    return tasks
      .filter((task) => {
        if (task.type === 'daily') return true
        if (task.type === 'weekly') return task.weekday === weekdayIndex
        return task.date === dateKey
      })
      .map((task) => ({ ...task, dateKey, completed: Boolean(completions[`${task.id}:${dateKey}`]) }))
      .sort((a, b) => a.time.localeCompare(b.time))
  }

  function addTask({ type, time, title, weekday, date }) {
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), type, time, title, weekday, date }])
  }

  function toggleCompletion(taskId, dateKey) {
    const key = `${taskId}:${dateKey}`
    setCompletions((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = true
      }
      return next
    })
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((task) => task.id !== id))
    setCompletions((prev) => {
      const next = {}
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(`${id}:`)) next[key] = value
      }
      return next
    })
  }

  return {
    weekDates,
    goToPrevWeek: () => setWeekOffset((offset) => offset - 1),
    goToNextWeek: () => setWeekOffset((offset) => offset + 1),
    goToToday: () => setWeekOffset(0),
    tasks,
    occurrencesForDate,
    addTask,
    toggleCompletion,
    deleteTask,
  }
}
