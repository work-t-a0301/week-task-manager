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

function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// 日付の表示はすべて年を省略し、月/日のみにする
export function formatMonthDay(dateKey) {
  const [, month, day] = dateKey.split('-')
  return `${Number(month)}/${Number(day)}`
}

// 締切（datetime-local由来の "YYYY-MM-DDTHH:MM"）も年を省略して表示する
export function formatDeadlineLabel(deadline) {
  if (!deadline) return '未設定'
  const [datePart, timePart] = deadline.split('T')
  const monthDay = formatMonthDay(datePart)
  return timePart ? `${monthDay} ${timePart}` : monthDay
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

// 指定日にその日働く分(=出現する)タスクを、その日の作業時間とともに返す。
// 毎日タスク・週1タスクは休日には出現せず、特定の時刻も持たない（time が undefined のまま）。
// 単発タスクは「分割」により同じ日に複数のセグメントを持つことがあるため、
// 該当する全セグメントをそれぞれ別の出現として返す
function tasksOccurringOnDate(date, dateKey, tasks, schedule) {
  const weekdayIndex = weekdayIndexOf(date)
  const isWorkDay = schedule.workDays.includes(weekdayIndex)
  return tasks.flatMap((task) => {
    if (task.type === 'daily') return isWorkDay ? [task] : []
    if (task.type === 'weekly') return isWorkDay && task.weekday === weekdayIndex ? [task] : []
    const segments = task.segments || []
    const matches = segments.filter((s) => s.date === dateKey)
    if (matches.length === 0) return []
    const sortedDates = segments.map((s) => s.date).sort()
    return matches.map((segment) => ({
      ...task,
      time: segment.time,
      duration: segment.duration,
      totalDuration: task.duration,
      sameDayCount: matches.length,
      segmentIndex: sortedDates.indexOf(dateKey) + 1,
      segmentTotal: sortedDates.length,
    }))
  })
}

// 休憩時間を分単位の区間として返す（未設定の場合はnull）
function breakIntervalMinutes(schedule) {
  if (!schedule.breakStart || !schedule.breakEnd) return null
  return { start: timeToMinutes(schedule.breakStart), end: timeToMinutes(schedule.breakEnd) }
}

// 時刻を持つ occurrence（単発タスク）は busy interval、時刻を持たない occurrence
// （毎日/週1タスク）はその日の枠を単純に圧縮するものとして扱う
function splitOccurringTasks(occurring) {
  const busy = []
  let flatMinutes = 0
  for (const task of occurring) {
    if (task.time) {
      const start = timeToMinutes(task.time)
      busy.push({ start, end: start + durationToMinutes(task.duration) })
    } else {
      flatMinutes += durationToMinutes(task.duration)
    }
  }
  return { busy, flatMinutes }
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

// 進捗率と残りの作業時間から、今日中に終わる見込みかどうかを判定する。
// 完了済み・残り作業時間0は判定対象外（バッジを出さない）。
// 過去日でまだ終わっていなければ「遅延」、未来日はまだ時間に余裕がある
// 前提で「順調」または「前倒し」、当日は終業時刻までの残り時間で判定する。
function computeStatus(date, dateKey, task, schedule) {
  const totalMinutes = durationToMinutes(task.duration)
  const remainingWorkMinutes = totalMinutes * (1 - task.progress / 100)
  if (task.completed || remainingWorkMinutes <= 0) return null

  const now = new Date()
  const todayKey = toDateKey(now)
  let availableMinutes

  if (dateKey > todayKey) {
    availableMinutes = totalMinutes
  } else if (dateKey < todayKey) {
    availableMinutes = 0
  } else {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    availableMinutes = Math.max(timeToMinutes(schedule.endTime) - nowMinutes, 0)
    const breakInterval = breakIntervalMinutes(schedule)
    if (breakInterval) {
      const overlapStart = Math.max(nowMinutes, breakInterval.start)
      const overlapEnd = Math.min(timeToMinutes(schedule.endTime), breakInterval.end)
      availableMinutes -= Math.max(overlapEnd - overlapStart, 0)
    }
  }

  const ratio = (availableMinutes / remainingWorkMinutes) * 100
  if (ratio < 90) return '遅延'
  if (ratio > 110) return '前倒し'
  return '順調'
}

// 単発タスクの最後（最も遅く終わる）セグメントの終了時刻が締切を過ぎていないかを判定する
function taskExceedsDeadline(segments, deadline) {
  if (!deadline || !segments || segments.length === 0) return false
  const deadlineDate = new Date(deadline)
  return segments.some((s) => {
    const segDate = dateFromKey(s.date)
    const endMinutes = timeToMinutes(s.time) + durationToMinutes(s.duration)
    const endDateTime = new Date(segDate.getFullYear(), segDate.getMonth(), segDate.getDate(), 0, endMinutes)
    return endDateTime.getTime() > deadlineDate.getTime()
  })
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

  function occurrencesForDate(date, dateKey, schedule) {
    return tasksOccurringOnDate(date, dateKey, tasks, schedule)
      .map((task) => {
        const occurrence = { ...task, dateKey, ...normalizeOccurrence(occurrenceStates[`${task.id}:${dateKey}`]) }
        const exceedsDeadline =
          occurrence.type === 'once' ? taskExceedsDeadline(occurrence.segments, occurrence.deadline) : false
        return { ...occurrence, exceedsDeadline, status: computeStatus(date, dateKey, occurrence, schedule) }
      })
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  // 休日には残り時間の概念がないので null。残業（作業時間が枠を超えた）場合は負の値を返す
  function remainingMinutesForDate(date, dateKey, schedule) {
    const weekdayIndex = weekdayIndexOf(date)
    if (!schedule.workDays.includes(weekdayIndex)) return null
    const totalWorkMinutes = timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)
    const breakInterval = breakIntervalMinutes(schedule)
    const breakMinutes = breakInterval ? breakInterval.end - breakInterval.start : 0
    const busyMinutes = tasksOccurringOnDate(date, dateKey, tasks, schedule).reduce(
      (sum, task) => sum + durationToMinutes(task.duration),
      0,
    )
    return totalWorkMinutes - breakMinutes - busyMinutes
  }

  function addTask({ type, title, duration, weekday, deadline, startDate }) {
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        title,
        duration: duration || DEFAULT_DURATION,
        weekday,
        deadline,
        startDate: type === 'once' ? startDate || null : undefined,
        segments: type === 'once' ? [] : undefined,
      },
    ])
  }

  function updateTask(id, fields) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task
        const updated = { ...task, ...fields }
        // 作業時間・締切が変わると既存の登録内容と整合しなくなるため、
        // 単発タスクは編集時にカレンダー登録をリセットして再設定を促す
        if (task.type === 'once') updated.segments = []
        return updated
      }),
    )
  }

  // 単発タスクが複数日に分割されている場合、同じタスクの他の日の状態も
  // 連動させて変更する（完了チェック・進捗は分割タスク全体で共有する）
  function relatedDateKeys(taskId, dateKey) {
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.type === 'once' && (task.segments || []).length > 1) {
      return task.segments.map((s) => s.date)
    }
    return [dateKey]
  }

  function updateOccurrence(taskId, dateKey, updater) {
    const dateKeys = relatedDateKeys(taskId, dateKey)
    setOccurrenceStates((prev) => {
      const current = normalizeOccurrence(prev[`${taskId}:${dateKey}`])
      const nextState = updater(current)
      const next = { ...prev }
      for (const dk of dateKeys) {
        next[`${taskId}:${dk}`] = nextState
      }
      return next
    })
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

  // 単発タスクの、その日に割り当てられた作業時間（セグメント）だけを変更する
  function updateSegmentDuration(taskId, dateKey, time, duration) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.type !== 'once') return task
        return {
          ...task,
          segments: (task.segments || []).map((s) =>
            s.date === dateKey && s.time === time ? { ...s, duration } : s,
          ),
        }
      }),
    )
  }

  // カレンダー上でのドラッグ移動。週1タスクは曜日（=以降すべての週）を変更し、
  // 単発タスクはそのセグメントの日付だけを変更する（時刻はそのまま）。
  // 単発タスクは開始日より前の日付には移動できない
  function moveTask(taskId, fromDateKey, fromTime, toDateKey) {
    if (fromDateKey === toDateKey) return
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task
        if (task.type === 'weekly') {
          return { ...task, weekday: weekdayIndexOf(dateFromKey(toDateKey)) }
        }
        if (task.type === 'once') {
          if (task.startDate && toDateKey < task.startDate) return task
          const segments = task.segments || []
          return {
            ...task,
            segments: segments.map((s) => (s.date === fromDateKey && s.time === fromTime ? { ...s, date: toDateKey } : s)),
          }
        }
        return task
      }),
    )
    setOccurrenceStates((prev) => {
      const fromKey = `${taskId}:${fromDateKey}`
      if (!(fromKey in prev)) return prev
      const next = { ...prev }
      next[`${taskId}:${toDateKey}`] = next[fromKey]
      delete next[fromKey]
      return next
    })
  }

  // 単発タスクの1つのセグメントを2つに分割する（同じ日のまま時間を二等分し、
  // 後半は元の時間帯の直後に配置する）。分割後はドラッグで別の日へ動かせる
  function splitSegment(taskId, dateKey, time) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.type !== 'once') return task
        const segments = task.segments || []
        const index = segments.findIndex((s) => s.date === dateKey && s.time === time)
        if (index === -1) return task
        const target = segments[index]
        const totalMinutes = durationToMinutes(target.duration)
        if (totalMinutes < 2) return task
        const firstMinutes = Math.ceil(totalMinutes / 2)
        const secondMinutes = totalMinutes - firstMinutes
        const firstSegment = { date: target.date, time: target.time, duration: minutesToTime(firstMinutes) }
        const secondSegment = {
          date: target.date,
          time: minutesToTime(timeToMinutes(target.time) + firstMinutes),
          duration: minutesToTime(secondMinutes),
        }
        const nextSegments = [...segments]
        nextSegments.splice(index, 1, firstSegment, secondSegment)
        return { ...task, segments: nextSegments }
      }),
    )
  }

  // 同じ単発タスクの「同じ日」にあるセグメントだけを1つにまとめる（他の日のセグメントは
  // 変更しない）。作業時間はその日にあったセグメントの合計になる
  function mergeSegments(taskId, dateKey, time) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.type !== 'once') return task
        const segments = task.segments || []
        const sameDay = segments.filter((s) => s.date === dateKey)
        if (sameDay.length < 2) return task
        const target = sameDay.find((s) => s.time === time) || sameDay[0]
        const totalMinutes = sameDay.reduce((sum, s) => sum + durationToMinutes(s.duration), 0)
        const merged = { date: target.date, time: target.time, duration: minutesToTime(totalMinutes) }
        const others = segments.filter((s) => s.date !== dateKey)
        return { ...task, segments: [...others, merged] }
      }),
    )
  }

  // カレンダー表示からその1セグメントだけを取り除く。タスク自体は登録済みタスク
  // 一覧から削除されず、未登録分として残るので再度「カレンダーに自動設定」できる
  function removeSegment(taskId, dateKey, time) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.type !== 'once') return task
        return { ...task, segments: (task.segments || []).filter((s) => !(s.date === dateKey && s.time === time)) }
      }),
    )
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

  // 締切が設定済みでまだ作業時間を割り切れていない単発タスクを、働く時間内の
  // 空き時間（複数日にまたがってもよい）へ自動的に割り当てる。締切までに分割しても
  // 収まらない場合は、残りの作業時間を締切日に（働く時間を超えても）強制的に設定する
  function scheduleUnplacedTasks(schedule) {
    const candidates = tasks.filter((task) => {
      if (task.type !== 'once' || !task.deadline) return false
      const scheduledMinutes = (task.segments || []).reduce((sum, s) => sum + durationToMinutes(s.duration), 0)
      return scheduledMinutes < durationToMinutes(task.duration)
    })

    if (candidates.length === 0) {
      return { scheduledTitles: [], overflowTitles: [] }
    }

    // 作業時間が多いタスクから優先的に空き時間を確保する（同じ場合は締切が早い方を優先）
    const sorted = [...candidates].sort(
      (a, b) => durationToMinutes(b.duration) - durationToMinutes(a.duration) || a.deadline.localeCompare(b.deadline),
    )
    let working = tasks
    const scheduledTitles = []
    const overflowTitles = []
    const dayStart = timeToMinutes(schedule.startTime)
    const dayEnd = timeToMinutes(schedule.endTime)
    const breakInterval = breakIntervalMinutes(schedule)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    for (const task of sorted) {
      const deadlineDate = new Date(task.deadline)
      const existingSegments = task.segments || []
      let remaining = durationToMinutes(task.duration) - existingSegments.reduce(
        (sum, s) => sum + durationToMinutes(s.duration),
        0,
      )
      const taskStart = task.startDate ? dateFromKey(task.startDate) : todayStart
      const rangeStart = taskStart.getTime() > todayStart.getTime() ? taskStart : todayStart

      for (const cursor = new Date(rangeStart); cursor.getTime() <= deadlineDate.getTime() && remaining > 0; cursor.setDate(cursor.getDate() + 1)) {
        const weekdayIndex = weekdayIndexOf(cursor)
        if (!schedule.workDays.includes(weekdayIndex)) continue

        const dateKey = toDateKey(cursor)
        const currentSegments = working.find((t) => t.id === task.id).segments || []
        if (currentSegments.some((s) => s.date === dateKey)) continue

        const isDeadlineDay = dateKey === toDateKey(deadlineDate)
        const effectiveDayEnd = isDeadlineDay ? Math.min(dayEnd, timeToMinutes(formatTimeOfDay(deadlineDate))) : dayEnd

        const { busy, flatMinutes } = splitOccurringTasks(tasksOccurringOnDate(cursor, dateKey, working, schedule))
        const allBusy = breakInterval ? [...busy, breakInterval] : busy
        const shrunkDayEnd = Math.max(dayStart, effectiveDayEnd - flatMinutes)
        const gap = findLargestFreeGap(allBusy, dayStart, shrunkDayEnd)
        if (!gap) continue

        const allocated = Math.min(gap.size, remaining)
        const newSegment = { date: dateKey, time: minutesToTime(gap.start), duration: minutesToTime(allocated) }
        remaining -= allocated
        working = working.map((t) => (t.id === task.id ? { ...t, segments: [...currentSegments, newSegment] } : t))
      }

      if (remaining > 0) {
        // 締切までの空き時間だけでは収まらないため、残りを締切日に強制的に積む
        // （その日に既にセグメントがあれば作業時間を延長し、なければ新規に追加する）
        const deadlineDateKey = toDateKey(deadlineDate)
        working = working.map((t) => {
          if (t.id !== task.id) return t
          const segs = t.segments || []
          const existingIndex = segs.findIndex((s) => s.date === deadlineDateKey)
          if (existingIndex !== -1) {
            const updatedSegs = [...segs]
            const existing = updatedSegs[existingIndex]
            updatedSegs[existingIndex] = {
              ...existing,
              duration: minutesToTime(durationToMinutes(existing.duration) + remaining),
            }
            return { ...t, segments: updatedSegs }
          }
          const { busy, flatMinutes } = splitOccurringTasks(tasksOccurringOnDate(deadlineDate, deadlineDateKey, working, schedule))
          const allBusy = breakInterval ? [...busy, breakInterval] : busy
          const gap = findLargestFreeGap(allBusy, dayStart, Math.max(dayStart, dayEnd - flatMinutes))
          const time = gap ? minutesToTime(gap.start) : schedule.startTime
          return { ...t, segments: [...segs, { date: deadlineDateKey, time, duration: minutesToTime(remaining) }] }
        })
        remaining = 0
        overflowTitles.push(task.title)
      } else {
        scheduledTitles.push(task.title)
      }
    }

    setTasks(working)
    return { scheduledTitles, overflowTitles }
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
    updateTask,
    toggleCompletion,
    setProgress,
    updateSegmentDuration,
    moveTask,
    splitSegment,
    mergeSegments,
    removeSegment,
    deleteTask,
    scheduleUnplacedTasks,
  }
}
