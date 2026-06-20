import { toDateKey, useWeekTasks } from './hooks/useWeekTasks'
import WeekHeader from './components/WeekHeader'
import DayColumn from './components/DayColumn'
import './App.css'

function App() {
  const { weekDates, goToPrevWeek, goToNextWeek, goToToday, tasksForDate, addTask, toggleTask, deleteTask } =
    useWeekTasks()

  return (
    <div className="app">
      <WeekHeader weekDates={weekDates} onPrevWeek={goToPrevWeek} onNextWeek={goToNextWeek} onToday={goToToday} />
      <main className="app__grid">
        {weekDates.map((date) => {
          const dateKey = toDateKey(date)
          return (
            <DayColumn
              key={dateKey}
              date={date}
              dateKey={dateKey}
              tasks={tasksForDate(dateKey)}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onAddTask={addTask}
            />
          )
        })}
      </main>
    </div>
  )
}

export default App
