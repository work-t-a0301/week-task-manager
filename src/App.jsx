import { toDateKey, useWeekTasks } from './hooks/useWeekTasks'
import { useWorkSchedule } from './hooks/useWorkSchedule'
import WorkScheduleForm from './components/WorkScheduleForm'
import WeekHeader from './components/WeekHeader'
import TaskList from './components/TaskList'
import DayColumn from './components/DayColumn'
import './App.css'

function App() {
  const { schedule, isEditing, startEditing, saveSchedule } = useWorkSchedule()
  const {
    weekDates,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    tasks,
    occurrencesForDate,
    addTask,
    toggleCompletion,
    setProgress,
    deleteTask,
    scheduleUnplacedTasks,
  } = useWeekTasks()

  if (isEditing) {
    return (
      <div className="app">
        <WorkScheduleForm initialSchedule={schedule} onSave={saveSchedule} />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app__toolbar">
        <button type="button" onClick={startEditing}>
          働く曜日・時間を変更
        </button>
      </div>

      <div className="app__layout">
        <aside className="app__sidebar">
          <TaskList
            tasks={tasks}
            defaultTime={schedule.startTime}
            schedule={schedule}
            onAddTask={addTask}
            onDeleteTask={deleteTask}
            onScheduleToCalendar={scheduleUnplacedTasks}
          />
        </aside>

        <div className="app__calendar">
          <WeekHeader weekDates={weekDates} onPrevWeek={goToPrevWeek} onNextWeek={goToNextWeek} onToday={goToToday} />
          <main className="app__grid">
            {weekDates.map((date) => {
              const dateKey = toDateKey(date)
              const weekdayIndex = (date.getDay() + 6) % 7
              return (
                <DayColumn
                  key={dateKey}
                  date={date}
                  dateKey={dateKey}
                  tasks={occurrencesForDate(date, dateKey)}
                  isWorkDay={schedule.workDays.includes(weekdayIndex)}
                  defaultTime={schedule.startTime}
                  onToggle={toggleCompletion}
                  onProgressChange={setProgress}
                  onDelete={deleteTask}
                  onAddTask={addTask}
                />
              )
            })}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
