import { useEffect, useState } from 'react'

const STORAGE_KEY = 'week-task-manager:work-schedule'
const DEFAULT_SCHEDULE = { workDays: [], startTime: '09:00', endTime: '18:00', breakDuration: null }

function loadStoredSchedule() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function useWorkSchedule() {
  const [schedule, setSchedule] = useState(loadStoredSchedule)
  const [isEditing, setIsEditing] = useState(() => loadStoredSchedule() === null)

  useEffect(() => {
    if (schedule) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule))
    }
  }, [schedule])

  function saveSchedule(nextSchedule) {
    setSchedule(nextSchedule)
    setIsEditing(false)
  }

  return {
    schedule: schedule ?? DEFAULT_SCHEDULE,
    isConfigured: schedule !== null,
    isEditing,
    startEditing: () => setIsEditing(true),
    saveSchedule,
  }
}
