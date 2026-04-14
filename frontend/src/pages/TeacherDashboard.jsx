import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSessions, getStudents } from '../api'
import toast from 'react-hot-toast'

export default function TeacherDashboard() {
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentsRes, sessionsRes] = await Promise.all([getStudents(), getSessions()])
        setStudents(studentsRes.data)
        setSessions(sessionsRes.data)
      } catch {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const lastSessionDate = useMemo(() => (sessions[0] ? new Date(sessions[0].timestamp).toLocaleString() : 'N/A'), [sessions])

  if (loading) return <p>Loading dashboard...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Total Students" value={students.length} />
        <StatCard title="Sessions Taken" value={sessions.length} />
        <StatCard title="Last Session Date" value={lastSessionDate} />
      </div>
      <div className="flex gap-3">
        <Link to="/take-attendance" className="px-4 py-2 rounded-lg bg-green-500 text-white">Take Attendance</Link>
        <Link to="/register/student" className="px-4 py-2 rounded-lg bg-slate-900 text-white">Register Student</Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Session</th>
              <th className="p-3">Date</th>
              <th className="p-3">Present</th>
              <th className="p-3">Unknown</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice(0, 5).map((s) => (
              <tr key={s.session_id} className="border-t">
                <td className="p-3">{s.session_id.slice(0, 8)}</td>
                <td className="p-3">{new Date(s.timestamp).toLocaleString()}</td>
                <td className="p-3">{s.present_count}</td>
                <td className="p-3">{s.unknown_count}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={4}>No sessions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}
