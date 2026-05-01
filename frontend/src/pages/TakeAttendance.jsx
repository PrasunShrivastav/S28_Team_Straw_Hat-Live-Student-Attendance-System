import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { takeAttendance, getSessionsMonth } from '../api'

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function TakeAttendance() {
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [todaySessions, setTodaySessions] = useState([])
  const [allTodaySessions, setAllTodaySessions] = useState([])
  const [scheduleId, setScheduleId] = useState('')
  const today = formatLocalDate(new Date())
  const currentMonth = today.slice(0, 7)

  useEffect(() => {
    getSessionsMonth(currentMonth)
      .then((res) => {
        const allSessions = res.data.filter((session) => session.date === today)
        setAllTodaySessions(allSessions)
        const sessionsForToday = allSessions.filter((session) => !session.attendance_taken)
        setTodaySessions(sessionsForToday)
      })
      .catch(err => toast.error('Failed to load schedules'))
  }, [currentMonth, today])

  const formatScheduleOption = (schedule) => {
    return `${schedule.subject} — ${schedule.time} (${schedule.type})`
  }

  const submit = async () => {
    if (!photo) return toast.error('Please select a group photo')

    const formData = new FormData()
    formData.append('group_photo', photo)
    formData.append('session_date', today)
    if (scheduleId) {
      formData.append('session_id', scheduleId)
    }

    try {
      setLoading(true)
      const res = await takeAttendance(formData)
      toast.success('Attendance completed')
      navigate(`/results/${res.data.session_id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Attendance failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Take Attendance</h1>
      
      {allTodaySessions.length > 0 ? (
        todaySessions.length > 0 ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Link Schedule (Optional)</label>
            <select 
              value={scheduleId} 
              onChange={e => setScheduleId(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              <option value="">-- No Schedule --</option>
              {todaySessions.map(s => (
                <option key={s.id} value={s.id}>
                  {formatScheduleOption(s)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm font-medium text-green-600">All sessions for today have attendance recorded</p>
        )
      ) : (
        <p className="text-sm text-slate-500">No sessions scheduled for today</p>
      )}

      <Link to="/analytics/monthly" className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
        View Monthly Analytics →
      </Link>

      <label className="block border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white cursor-pointer">
        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setPhoto(file)
            setPreview(URL.createObjectURL(file))
          }
        }} />
        <p>Drag & drop or click to upload group photo</p>
      </label>
      {preview && <img src={preview} alt="group preview" className="rounded-lg" />}
      <button onClick={submit} disabled={loading} className="px-4 py-2 rounded-lg bg-green-500 text-white disabled:opacity-60">
        {loading ? 'Processing...' : 'Process Attendance'}
      </button>
    </div>
  )
}
