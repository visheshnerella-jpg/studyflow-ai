import { useEffect, useState } from 'react'
import './App.css'
import Auth from './Auth'
import { supabase } from './lib/supabase'


const starterTasks = [
  {
    id: 1,
    subject: 'Mathematics',
    title: 'Revise calculus',
    time: '45 min',
    priority: 'High',
    deadline: '',
    done: false,
  },
 {
    id: 2,
    subject: 'Computer Science',
    title: 'Practice DSA problems',
    time: '60 min',
    priority: 'High',
    deadline: '',
    done: false,
  },
  {
    id: 3,
    subject: 'Physics',
    title: 'Review chapter 4',
    time: '30 min',
    priority: 'Medium',
    deadline: '',
    done: true,
  },
]



function App() {

  
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Session error:', error)
      setSession(data?.session ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })

    return () => subscription.unsubscribe()
  }, [])
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newSubject, setNewSubject] = useState('General Study')
  const [newPriority, setNewPriority] = useState('Medium')
  const [newDeadline, setNewDeadline] = useState('')

  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMode, setBreakMode] = useState(false)

  const [studyHours, setStudyHours] = useState(
    () => Number(localStorage.getItem('studyflow-hours')) || 0
  )
async function handleLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    alert('Logout failed: ' + error.message)
  }
}
  
  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false

    async function loadCloudTasks() {
      setTasksLoading(true)

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true })

        if (error) throw error

        let rows = data

        // Add the three sample tasks for a new account
        if (rows.length === 0) {
          const starterRows = starterTasks.map(task => ({
            user_id: session.user.id,
            subject: task.subject,
            title: task.title,
            duration: task.time,
            priority: task.priority,
            deadline: task.deadline || null,
            done: task.done,
          }))

          const { data: inserted, error: insertError } =
            await supabase
              .from('tasks')
              .insert(starterRows)
              .select()

          if (insertError) throw insertError
          rows = inserted
        }

        if (!cancelled) {
          setTasks(
            rows.map(task => ({
              id: task.id,
              subject: task.subject,
              title: task.title,
              time: task.duration,
              priority: task.priority,
              deadline: task.deadline || '',
              done: task.done,
            }))
          )
        }
      } catch (error) {
        console.error('Could not load tasks:', error)
        alert('Could not load your tasks. Check the browser console for details.')
      } finally {
        if (!cancelled) setTasksLoading(false)
      }
    }
    loadCloudTasks()

    return () => {
      cancelled = true
    }
  }, [session])
  useEffect(() => {
    localStorage.setItem('studyflow-hours', String(studyHours))
  }, [studyHours])

  useEffect(() => {
    if (!running) return

    const timer = setInterval(() => {
      setSeconds(current => {
        if (current > 1) {
          return current - 1
        }

        setRunning(false)

        if (!breakMode) {
          setStudyHours(hours => hours + focusMinutes / 60)
        }

        setBreakMode(!breakMode)

        alert(
          breakMode
            ? 'Break finished! Ready to focus?'
            : 'Focus session complete! Take a short break.'
        )

        return breakMode ? focusMinutes * 60 : 5 * 60
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [running, breakMode, focusMinutes])

  const completed = tasks.filter(task => task.done).length

  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0

  const timeText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60
  ).padStart(2, '0')}`

  
  async function addTask(event) {
    event.preventDefault()

    if (!newTask.trim()) return

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: session.user.id,
        subject: newSubject.trim() || 'General Study',
        title: newTask.trim(),
        duration: '30 min',
        priority: newPriority,
        deadline: newDeadline || null,
        done: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Could not add task:', error)
      alert('Could not save your task. Please try again.')
      return
    }

    setTasks(current => [
      ...current,
      {
        id: data.id,
        subject: data.subject,
        title: data.title,
        time: data.duration,
        priority: data.priority,
        deadline: data.deadline || '',
        done: data.done,
      },
    ])

    setNewTask('')
    setNewPriority('Medium')
    setNewDeadline('')
  }


async function toggleTask(id) {
  const task = tasks.find(task => task.id === id)
  if (!task) return

  const nextDone = !task.done

  const { error } = await supabase
    .from('tasks')
    .update({ done: nextDone })
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    console.error('Could not update task:', error)
    alert('Could not update the task. Please try again.')
    return
  }

  setTasks(current =>
    current.map(task =>
      task.id === id
        ? { ...task, done: nextDone }
        : task
    )
  )
}


  
  async function deleteTask(id) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Could not delete task:', error)
      alert('Could not delete the task. Please try again.')
      return
    }

    setTasks(current => current.filter(task => task.id !== id))
  }

  function resetTimer() {
    setRunning(false)
    setBreakMode(false)
    setSeconds(focusMinutes * 60)
  }

  function changeDuration(value) {
    const minutes = Number(value)

    setFocusMinutes(minutes)
    setSeconds(minutes * 60)
    setRunning(false)
    setBreakMode(false)
  }

  if (authLoading) {
    return <div className="auth-page">Loading StudyFlow AI...</div>
  }

  if (!session) {
    return <Auth />
  }

  if (tasksLoading) {
    return <div className="auth-page">Loading your tasks...</div>
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>✦</span> StudyFlow
          <span className="brand-ai"> AI</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <a className="nav-item active" href="#dashboard">
          ▦ &nbsp; Dashboard
        </a>

        <a className="nav-item" href="#tasks">
          ✓ &nbsp; My Tasks
        </a>

        <a className="nav-item" href="#focus">
          ◷ &nbsp; Focus Room
        </a>

        <div className="sidebar-bottom">
          <div className="avatar">V</div>
          <div>
            <strong>Student</strong>
            <p>Keep growing ✨</p>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        ```jsx
<header className="topbar">
  <span>MY WORKSPACE / DASHBOARD</span>

  <div className="topbar-actions">
    <span className="live-status">
      <i /> YOUR STUDY SPACE
    </span>

    <button type="button" onClick={handleLogout}>
      Sign Out
    </button>
  </div>
</header>
        <section className="welcome">
          <div>
            <p className="eyebrow">
              YOUR PERSONAL LEARNING COMPANION
            </p>

            <h1>
              Make today <span>count.</span>
            </h1>

            <p className="subtitle">
              Small steps every day lead to big results.
            </p>
          </div>

          <div className="date-card">
            <span>✦</span>
            <div>
              <strong>YOUR POTENTIAL</strong>
              <p>is limitless.</p>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon purple">▦</span>
            <p>Today's tasks</p>
            <h2>{tasks.length}</h2>
            <small>Tasks on your list</small>
          </div>

          <div className="stat-card">
            <span className="stat-icon green">✓</span>
            <p>Completed</p>
            <h2>
              {completed}
              <small> / {tasks.length}</small>
            </h2>
            <small>One step at a time</small>
          </div>

          <div className="stat-card">
            <span className="stat-icon orange">◷</span>
            <p>Daily progress</p>
            <h2>{progress}%</h2>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <small>Keep moving forward</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel" id="tasks">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">STAY ON TRACK</p>
                <h2>Today's study plan</h2>
              </div>

              <span className="count-pill">
                {completed}/{tasks.length} done
              </span>
            </div>

            <form className="add-task" onSubmit={addTask}>
              <input
                value={newTask}
                onChange={event => setNewTask(event.target.value)}
                placeholder="Add a study task..."
                aria-label="New study task"
                required
              />

              <button type="submit">+ Add task</button>

              <input
                className="subject-input"
                value={newSubject}
                onChange={event => setNewSubject(event.target.value)}
                placeholder="Subject (e.g. Mathematics)"
                aria-label="Subject name"
              />

              <select
                className="duration-select"
                value={newPriority}
                onChange={event => setNewPriority(event.target.value)}
                aria-label="Task priority"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>

              <input
                className="subject-input"
                type="date"
                value={newDeadline}
                onChange={event => setNewDeadline(event.target.value)}
                aria-label="Task deadline"
              />
            </form>

            <div className="task-list">
              {tasks.map(task => (
                <div
                  className={`task-row ${task.done ? 'task-done' : ''}`}
                  key={task.id}
                >
                  <button
                    type="button"
                    className={`check ${task.done ? 'checked' : ''}`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={`Toggle ${task.title}`}
                  >
                    {task.done ? '✓' : ''}
                  </button>

                  <div className="task-details">
                    <strong>{task.title}</strong>
                    <span>{task.subject}</span>

                    {task.priority && (
                      <span
                        className={`priority ${task.priority.toLowerCase()}`}
                      >
                        {task.priority} Priority
                      </span>
                    )}

                    {task.deadline && (
                      <span className="task-deadline">
                        📅 {task.deadline}
                      </span>
                    )}
                  </div>

                  <span className="task-time">{task.time}</span>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {tasks.length === 0 && (
                <p className="empty-state">
                  Your plan is clear. Add a task to get started!
                </p>
              )}
            </div>
          </div>

          <div className="panel focus-panel" id="focus">
            <p className="eyebrow">YOUR NEXT SESSION</p>

            <h2>{breakMode ? 'Break time' : 'Focus room'}</h2>

            <div className="timer-circle">
              <div>
                <strong>{timeText}</strong>
                <span>{breakMode ? 'TAKE A BREAK' : 'MINUTES'}</span>
              </div>
            </div>

            <p className="focus-caption">
              {breakMode
                ? 'Rest your mind. You earned it.'
                : 'One task. One goal. Full focus.'}
            </p>

            <label className="duration-label" htmlFor="focus-duration">
              SESSION LENGTH
            </label>

            <select
              id="focus-duration"
              className="duration-select"
              value={focusMinutes}
              onChange={event => changeDuration(event.target.value)}
              disabled={running || breakMode}
            >
              <option value={15}>15 minutes</option>
              <option value={25}>25 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>

            <button
              type="button"
              className="focus-button"
              onClick={() => setRunning(value => !value)}
            >
              {running ? 'Ⅱ Pause timer' : '▶ Start timer'}
            </button>

            <button
              type="button"
              className="reset-button"
              onClick={resetTimer}
            >
              ↺ Reset timer
            </button>

            <div className="study-hours">
              <p className="eyebrow">TOTAL FOCUS TIME</p>
              <h3>{studyHours.toFixed(2)} hours</h3>
            </div>
          </div>
        </section>

        <footer>
          Built for curious minds <span>✦</span> StudyFlow AI
        </footer>
      </main>
    </div>
  )
}

export default App
