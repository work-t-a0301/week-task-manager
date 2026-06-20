import { useMemo, useState } from 'react'
import { initialTasks } from '../data/initialTasks'

const DAY_MS = 24 * 60 * 60 * 1000

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
  const [tasks, setTasks] = useState(initialTasks)

  const weekDates = useMemo(() => {
    const monday = getMonday(new Date())
    const weekStart = new Date(monday.getTime() + weekOffset * 7 * DAY_MS)
    return Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS))
  }, [weekOffset])

  function tasksForDate(dateKey) {
    return tasks.filter((task) => task.date === dateKey).sort((a, b) => a.time.localeCompare(b.time))
  }

  function addTask(date, time, title) {
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), date, time, title, completed: false }])
  }

  function toggleTask(id) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)))
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  return {
    weekDates,
    goToPrevWeek: () => setWeekOffset((offset) => offset - 1),
    goToNextWeek: () => setWeekOffset((offset) => offset + 1),
    goToToday: () => setWeekOffset(0),
    tasksForDate,
    addTask,
    toggleTask,
    deleteTask,
  }
}
