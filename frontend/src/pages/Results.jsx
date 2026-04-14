import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AttendanceBadge from '../components/AttendanceBadge'
import { exportSessionCsvUrl, getSession } from '../api'

export default function Results() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSession(sessionId)
        setSession(res.data)
      } catch {
        toast.error('Could not load session')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  const summary = useMemo(() => {
    if (!session) return { present: 0, unknown: 0, absent: 0 }
    return {
      present: session.results.filter((r) => r.status === 'present').length,
      unknown: session.results.filter((r) => r.status === 'unknown').length,
      absent: session.absent_students.length,
    }
  }, [session])

  if (loading) return <p>Loading results...</p>
  if (!session) return <p>No session found.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance Results</h1>
      <p className="text-sm bg-white p-3 rounded-lg border">
        {summary.present} Present | {summary.unknown} Unknown | {summary.absent} Absent
      </p>
      <div className="grid lg:grid-cols-2 gap-4">
        <img src={`http://localhost:5000${session.annotated_image_url}`} alt="annotated" className="rounded-lg border bg-white" />
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {session.results.map((row, idx) => (
                <tr className="border-t" key={idx}>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2"><AttendanceBadge status={row.status} /></td>
                </tr>
              ))}
              {session.absent_students.map((s) => (
                <tr className="border-t" key={s.student_id}>
                  <td className="p-2">{s.name}</td>
                  <td className="p-2"><AttendanceBadge status="absent" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <a href={exportSessionCsvUrl(sessionId)} className="px-4 py-2 rounded-lg bg-slate-900 text-white">Export CSV</a>
        <Link to="/take-attendance" className="px-4 py-2 rounded-lg bg-green-500 text-white">Take New Attendance</Link>
      </div>
    </div>
  )
}
