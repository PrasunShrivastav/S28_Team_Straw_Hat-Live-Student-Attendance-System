import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, MoreHorizontal, Plus, X } from 'lucide-react'
import {
  createSession,
  deleteSession,
  endSession,
  getSessionsMonth,
  skipSession,
  updateSession,
} from '../api'

const API_BASE = import.meta.env.VITE_API_URL

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TYPES = ['Lecture', 'Lab']
const REPEAT_OPTIONS = [
  { value: 'one_time', label: 'One Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
]
const WEEKLY_DAY_OPTIONS = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
]

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayIso() {
  return formatLocalDate(new Date())
}

function getCurrentMonth() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

const getDefaultFormData = () => ({
  subject: '',
  type: 'Lecture',
  room: '',
  time: '10:00',
  duration_minutes: 60,
  repeat: 'weekly',
  day_of_week: 0,
  start_date: getTodayIso(),
  end_date: '',
  no_end_date: true,
})

function shiftMonth(month, delta) {
  const [year, monthIndex] = month.split('-').map(Number)
  const next = new Date(year, monthIndex - 1 + delta, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function formatDisplayDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTimeRange(time, durationMinutes = 60) {
  const [hours = '0', minutes = '0'] = String(time || '00:00').split(':')
  const start = new Date()
  start.setHours(Number(hours), Number(minutes), 0, 0)
  const end = new Date(start.getTime() + Number(durationMinutes || 60) * 60000)

  return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function getRoleContext() {
  const teacher = JSON.parse(localStorage.getItem('teacher') || 'null')
  const student = JSON.parse(localStorage.getItem('student') || 'null')

  if (teacher) {
    return {
      role: teacher.role || 'teacher',
      studentId: null,
    }
  }

  if (student) {
    return {
      role: student.role || 'student',
      studentId: student.id || student.student_id || null,
    }
  }

  return {
    role: 'teacher',
    studentId: null,
  }
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

function getStudentStatusStyles(status) {
  if (status === 'present') {
    return 'bg-green-100 text-green-700 border border-green-300'
  }
  if (status === 'absent') {
    return 'bg-red-100 text-red-700 border border-red-300'
  }
  return 'bg-gray-100 text-gray-600 border border-gray-200'
}

function getTeacherTypeStyles(type) {
  return type === 'Lecture' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
}

function getStatusBadge(status) {
  if (status === 'present') {
    return <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">Present ✓</span>
  }
  if (status === 'absent') {
    return <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">Absent ✗</span>
  }
  return <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Not marked yet</span>
}

function buildCalendarDays(month) {
  const [year, monthIndex] = month.split('-').map(Number)
  const monthStart = new Date(year, monthIndex - 1, 1)
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  const gridEnd = new Date(monthEnd)
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()))

  const days = []
  const cursor = new Date(gridStart)

  while (cursor <= gridEnd) {
    const dateString = formatLocalDate(cursor)
    days.push({
      date: dateString,
      dayNumber: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === monthStart.getMonth(),
      isToday: dateString === getTodayIso(),
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export default function TeacherSchedule() {
  const navigate = useNavigate()
  const auth = useMemo(() => getRoleContext(), [])
  const isStudentView = auth.role === 'student'
  const [sessions, setSessions] = useState([])
  const [sessionStatuses, setSessionStatuses] = useState({})
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activePopover, setActivePopover] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [formData, setFormData] = useState(getDefaultFormData())

  const popoverRef = useRef(null)
  const menuRef = useRef(null)

  const fetchMonthView = async () => {
    try {
      const requests = [getSessionsMonth(month)]
      if (isStudentView && auth.studentId) {
        requests.push(fetchJson(`/attendance/student/${auth.studentId}/month?month=${month}`))
        requests.push(fetchJson('/sessions/upcoming?limit=5'))
      }

      const [sessionsRes, studentStatuses = [], upcoming = []] = await Promise.all(requests)
      const sessionData = sessionsRes.data ?? sessionsRes
      setSessions(sessionData)

      if (isStudentView) {
        const statusMap = {}
        studentStatuses.forEach((item) => {
          statusMap[`${item.session_id}::${item.date}`] = item.status
        })
        setSessionStatuses(statusMap)
        setUpcomingSessions(upcoming)
      } else {
        setSessionStatuses({})
        setUpcomingSessions([])
      }
    } catch {
      toast.error('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonthView()
  }, [month, isStudentView, auth.studentId])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && menuRef.current.contains(event.target)) return
      if (popoverRef.current && popoverRef.current.contains(event.target)) return
      setMenuOpenId(null)
      setActivePopover(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const sessionsByDate = useMemo(() => {
    const grouped = {}
    sessions.forEach((session) => {
      const statusKey = `${session.session_id || session.id}::${session.date}`
      if (!grouped[session.date]) grouped[session.date] = []
      grouped[session.date].push({
        ...session,
        studentStatus: sessionStatuses[statusKey] || 'not_marked',
      })
    })
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => a.time.localeCompare(b.time))
    })
    return grouped
  }, [sessions, sessionStatuses])

  const calendarDays = useMemo(() => buildCalendarDays(month), [month])

  const handleOpenModal = (session = null) => {
    if (session) {
      setEditingId(session.id)
      setFormData({
        subject: session.subject,
        type: session.type,
        room: session.room,
        time: session.time,
        duration_minutes: session.duration_minutes ?? 60,
        repeat: session.repeat,
        day_of_week: session.day_of_week ?? 0,
        start_date: session.start_date || session.date || getTodayIso(),
        end_date: session.end_date || '',
        no_end_date: !session.end_date,
      })
    } else {
      setEditingId(null)
      setFormData(getDefaultFormData())
    }

    setMenuOpenId(null)
    setActivePopover(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      subject: formData.subject,
      type: formData.type,
      room: formData.room,
      time: formData.time,
      duration_minutes: Number(formData.duration_minutes),
      repeat: formData.repeat,
      start_date: formData.start_date,
      end_date: formData.repeat === 'one_time' || formData.no_end_date ? null : formData.end_date,
      day_of_week: formData.repeat === 'weekly' ? Number(formData.day_of_week) : null,
    }

    try {
      if (editingId) {
        await updateSession(editingId, payload)
        toast.success('Session updated')
      } else {
        await createSession(payload)
        toast.success('Session scheduled')
      }
      setModalOpen(false)
      fetchMonthView()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save session')
    }
  }

  const handleSkip = async (session) => {
    const confirmed = window.confirm(`Skip ${session.subject} on ${session.date} only?`)
    if (!confirmed) return

    try {
      await skipSession(session.id, { skip_date: session.date })
      toast.success('Session skipped for this date')
      setMenuOpenId(null)
      setActivePopover(null)
      fetchMonthView()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to skip session')
    }
  }

  const handleEnd = async (session) => {
    const confirmed = window.confirm(`This will permanently stop ${session.subject} from today. Continue?`)
    if (!confirmed) return

    try {
      await endSession(session.id, { end_date: getTodayIso() })
      toast.success('Session stopped from today')
      setMenuOpenId(null)
      setActivePopover(null)
      fetchMonthView()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to stop session')
    }
  }

  const handleDelete = async (session) => {
    const confirmed = window.confirm(`Delete ${session.subject}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteSession(session.id)
      toast.success('Session deleted')
      setMenuOpenId(null)
      setActivePopover(null)
      fetchMonthView()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete session')
    }
  }

  const handleTogglePopover = (date, event) => {
    const cell = event.currentTarget.closest('[data-calendar-cell="true"]')
    if (!cell) return

    const rect = cell.getBoundingClientRect()
    const availableBelow = Math.max(window.innerHeight - rect.bottom - 12, 120)
    const availableAbove = Math.max(rect.top - 12, 120)
    const openUpward = availableBelow < 260 && availableAbove > availableBelow
    const alignRight = rect.right > window.innerWidth - 240
    const maxHeight = Math.max(
      180,
      Math.min(availableBelow, availableAbove, 360)
    )

    setMenuOpenId(null)
    setActivePopover((current) => (
      current?.date === date
        ? null
        : { date, openUpward, alignRight, maxHeight }
    ))
  }

  if (loading) return <p className="p-8 text-slate-500">Loading schedule...</p>

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-indigo-600" /> Session Schedule
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your monthly lectures and labs</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-32 text-center text-sm font-semibold text-slate-700">{formatMonthLabel(month)}</span>
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isStudentView && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} /> Schedule Session
            </button>
          )}
        </div>
      </div>

      {isStudentView && upcomingSessions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold">Upcoming Sessions</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-1">
            {upcomingSessions.map((session) => (
              <div
                key={`${session.session_id}-${session.date}-${session.time}`}
                className="min-w-[240px] rounded-xl border border-slate-200 border-l-4 border-l-gray-300 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{session.subject}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTeacherTypeStyles(session.type)}`}>
                    {session.type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{formatDisplayDate(session.date)}</p>
                <p className="mt-1 text-sm text-slate-600">{formatTimeRange(session.time, session.duration_minutes)}</p>
                <p className="mt-1 text-sm text-slate-500">{session.room || 'TBD'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={`text-xs ${isStudentView ? 'text-center' : 'text-right'} text-slate-500`}>
        {isStudentView ? (
          <div className="inline-flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Attended</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Missed</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Not marked yet</span>
          </div>
        ) : (
          <div className="inline-flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Attendance Taken</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Lecture</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Lab</span>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
          {WEEKDAY_HEADERS.map((day, index) => (
            <div
              key={day}
              className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${index === 0 || index === 6 ? 'bg-[#fafafa]' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const daySessions = day.isCurrentMonth ? (sessionsByDate[day.date] || []) : []
            const visibleSessions = daySessions.slice(0, 2)
            const remainingCount = Math.max(daySessions.length - visibleSessions.length, 0)

            return (
              <div
                key={day.date}
                data-calendar-cell="true"
                className={`relative min-h-[100px] border-b border-r border-gray-200 p-2 align-top ${day.isWeekend ? 'bg-[#fafafa]' : 'bg-white'} ${!day.isCurrentMonth ? 'bg-[#fafafa]' : ''}`}
              >
                <div className="flex justify-end">
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-sm ${
                    day.isToday
                      ? 'bg-blue-600 px-2 text-white'
                      : day.isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-gray-300'
                  }`}>
                    {day.dayNumber}
                  </span>
                </div>

                {day.isCurrentMonth && daySessions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {visibleSessions.map((session) => (
                      <button
                        key={`${session.id}-${session.date}-${session.time}`}
                        type="button"
                        onClick={(event) => {
                          if (!isStudentView && session.attendance_taken) {
                            navigate(`/results/${session.attendance_session_id}`)
                          } else {
                            handleTogglePopover(day.date, event)
                          }
                        }}
                        className={`block max-w-[90%] truncate rounded-full px-2 py-0.5 text-xs text-left ${
                          isStudentView 
                            ? getStudentStatusStyles(session.studentStatus) 
                            : session.attendance_taken 
                              ? 'bg-green-100 text-green-700' 
                              : getTeacherTypeStyles(session.type)
                        }`}
                      >
                        {session.subject}
                      </button>
                    ))}

                    {remainingCount > 0 && (
                      <button
                        type="button"
                        onClick={(event) => handleTogglePopover(day.date, event)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        + {remainingCount} more
                      </button>
                    )}
                  </div>
                )}

                {activePopover?.date === day.date && day.isCurrentMonth && (
                  <div
                    ref={popoverRef}
                    className="absolute min-w-[220px] rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/5"
                    style={{
                      zIndex: 9999,
                      top: activePopover.openUpward ? 'auto' : '2.5rem',
                      bottom: activePopover.openUpward ? '100%' : 'auto',
                      left: activePopover.alignRight ? 'auto' : '0.5rem',
                      right: activePopover.alignRight ? '0.5rem' : 'auto',
                      marginBottom: activePopover.openUpward ? '0.5rem' : 0,
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePopover(null)
                          setMenuOpenId(null)
                        }}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: `${activePopover.maxHeight}px` }}>
                      {daySessions.map((session) => (
                        <div
                          key={`${session.id}-${session.date}-${session.time}-popover`}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!isStudentView) {
                                  if (session.attendance_taken) {
                                    navigate(`/results/${session.attendance_session_id}`)
                                  } else {
                                    handleOpenModal(session)
                                  }
                                }
                              }}
                              className="text-left"
                            >
                              <p className="font-semibold text-slate-800 flex items-center gap-2">
                                {session.subject}
                                {!isStudentView && session.attendance_taken && (
                                  <span className="inline-flex rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">✓ Taken</span>
                                )}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">{session.type}</p>
                            </button>

                            {!isStudentView && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextKey = menuOpenId === `${session.id}-${session.date}` ? null : `${session.id}-${session.date}`
                                    setMenuOpenId(nextKey)
                                  }}
                                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                  <MoreHorizontal size={16} />
                                </button>

                                {menuOpenId === `${session.id}-${session.date}` && (
                                  <div
                                    ref={menuRef}
                                    className="absolute right-0 top-8 z-50 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                                  >
                                    <button
                                      onClick={() => handleSkip(session)}
                                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                      Skip this date
                                    </button>
                                    <button
                                      onClick={() => handleEnd(session)}
                                      className="w-full px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                                    >
                                      Stop from today
                                    </button>
                                    <button
                                      onClick={() => handleDelete(session)}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      Delete session
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} /> {session.time}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} /> {session.room || 'TBD'}
                            </div>
                            {isStudentView && (
                              <div className="pt-1">
                                {getStatusBadge(session.studentStatus)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!isStudentView && modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Session' : 'Schedule Session'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject name</label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Data Structures"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                  <input
                    required
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Lab 3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    required
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Repeat type</label>
                <div className="flex flex-wrap gap-2">
                  {REPEAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        repeat: option.value,
                        end_date: option.value === 'one_time' ? '' : formData.end_date,
                        no_end_date: option.value === 'one_time' ? true : formData.no_end_date,
                      })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.repeat === option.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.repeat === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Day of week</label>
                  <div className="grid grid-cols-3 gap-2">
                    {WEEKLY_DAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, day_of_week: day.value })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          Number(formData.day_of_week) === day.value
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {formData.repeat === 'one_time' ? 'Date' : 'Start date'}
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className={formData.repeat === 'one_time' ? 'opacity-60' : ''}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
                  <input
                    type="date"
                    disabled={formData.no_end_date || formData.repeat === 'one_time'}
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={formData.no_end_date || formData.repeat === 'one_time'}
                  disabled={formData.repeat === 'one_time'}
                  onChange={(e) => setFormData({ ...formData, no_end_date: e.target.checked, end_date: e.target.checked ? '' : formData.end_date })}
                />
                No end date
              </label>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  {editingId ? 'Save Changes' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
