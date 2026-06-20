import './WeekHeader.css'

const formatter = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' })

export default function WeekHeader({ weekDates, onPrevWeek, onNextWeek, onToday }) {
  const start = weekDates[0]
  const end = weekDates[6]

  return (
    <header className="week-header">
      <button type="button" onClick={onPrevWeek} aria-label="前週へ">
        ←
      </button>
      <div className="week-header__range">
        {formatter.format(start)} - {formatter.format(end)}
      </div>
      <button type="button" onClick={onNextWeek} aria-label="次週へ">
        →
      </button>
      <button type="button" className="week-header__today" onClick={onToday}>
        今週
      </button>
    </header>
  )
}
