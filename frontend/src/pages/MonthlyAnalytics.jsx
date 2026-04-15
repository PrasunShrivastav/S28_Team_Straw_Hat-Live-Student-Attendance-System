import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getMonthlyAnalytics } from '../api'

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)
const MONTH_OPTIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

function getRateStyles(rate) {
  if (rate >= 75) return 'bg-green-100 text-green-700'
  if (rate >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function SortableHeader({ label, sortKey, sortState, onSort, align = 'left' }) {
  const isActive = sortState.key === sortKey
  const direction = isActive ? (sortState.direction === 'asc' ? '↑' : '↓') : ''

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 font-semibold ${align === 'right' ? 'justify-end w-full' : ''}`}
    >
      {label}
      <span className="text-xs text-slate-400">{direction}</span>
    </button>
  )
}

export default function MonthlyAnalytics() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subjectSort, setSubjectSort] = useState({ key: 'subject', direction: 'asc' })
  const [studentSort, setStudentSort] = useState({ key: 'name', direction: 'asc' })
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(Number(getCurrentMonth().slice(0, 4)))

  const monthPickerRef = useRef(null)

  useEffect(() => {
    setPickerYear(Number(month.slice(0, 4)))
  }, [month])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const res = await getMonthlyAnalytics(month)
        setAnalytics(res.data)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load monthly analytics')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [month])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target)) {
        setMonthPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const avgAttendanceRate = useMemo(() => {
    if (!analytics?.per_student_overall?.length) return 0
    const totals = analytics.per_student_overall.reduce((acc, row) => {
      acc.present += row.total_present
      acc.absent += row.total_absent
      return acc
    }, { present: 0, absent: 0 })

    const total = totals.present + totals.absent
    return total > 0 ? Number(((totals.present / total) * 100).toFixed(1)) : 0
  }, [analytics])

  const sortedSubjects = useMemo(() => {
    const rows = [...(analytics?.per_subject || [])]
    rows.sort((a, b) => {
      const aValue = a[subjectSort.key]
      const bValue = b[subjectSort.key]
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return subjectSort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }
      return subjectSort.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
    return rows
  }, [analytics, subjectSort])

  const sortedStudents = useMemo(() => {
    const rows = [...(analytics?.per_student_overall || [])]
    rows.sort((a, b) => {
      const aValue = a[studentSort.key]
      const bValue = b[studentSort.key]
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return studentSort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }
      return studentSort.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
    return rows
  }, [analytics, studentSort])

  const toggleSubjectSort = (key) => {
    setSubjectSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleStudentSort = (key) => {
    setStudentSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const exportToExcel = () => {
    if (!analytics) return

    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: 'Month', Value: formatMonthLabel(month) },
      { Metric: 'Total Sessions Scheduled', Value: analytics.total_scheduled_sessions },
      { Metric: 'Attendance Taken', Value: analytics.sessions_with_attendance },
      { Metric: 'Sessions Missed', Value: analytics.sessions_missed },
      { Metric: 'Avg Attendance Rate', Value: `${avgAttendanceRate}%` },
    ])

    const subjectSheet = XLSX.utils.json_to_sheet(sortedSubjects.map((row) => ({
      Subject: row.subject,
      Type: row.type,
      Scheduled: row.scheduled_count,
      Attended: row.attended_count,
      Rate: `${row.attendance_rate}%`,
    })))

    const studentSheet = XLSX.utils.json_to_sheet(sortedStudents.map((row) => ({
      Student: row.name,
      'Roll No': row.roll_number,
      Present: row.total_present,
      Absent: row.total_absent,
      Rate: `${row.overall_rate}%`,
    })))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    XLSX.utils.book_append_sheet(workbook, subjectSheet, 'By Subject')
    XLSX.utils.book_append_sheet(workbook, studentSheet, 'By Student')
    XLSX.writeFile(workbook, `attendance_${month}.xlsx`)
  }

  const selectMonthFromPicker = (monthIndex) => {
    setMonth(`${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`)
    setMonthPickerOpen(false)
  }

  if (loading) return <p>Loading monthly analytics...</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Monthly Analytics</h1>
          </div>

          <div ref={monthPickerRef} className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => setMonthPickerOpen((open) => !open)}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>{formatMonthLabel(month)}</span>
              <ChevronDown size={16} className={`transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight size={18} />
            </button>

            {monthPickerOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPickerYear((year) => year - 1)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold text-slate-700">{pickerYear}</span>
                  <button
                    type="button"
                    onClick={() => setPickerYear((year) => year + 1)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MONTH_OPTIONS.map((label, index) => {
                    const isActive = month === `${pickerYear}-${String(index + 1).padStart(2, '0')}`
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => selectMonthFromPicker(index)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={exportToExcel}
          disabled={!analytics || analytics.total_scheduled_sessions === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Export to Excel
        </button>
      </div>

      {!analytics || analytics.total_scheduled_sessions === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-slate-500">
          No sessions scheduled this month
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Total Sessions Scheduled" value={analytics.total_scheduled_sessions} />
            <StatCard title="Attendance Taken" value={analytics.sessions_with_attendance} />
            <StatCard title="Sessions Missed" value={analytics.sessions_missed} />
            <StatCard title="Avg Attendance Rate" value={`${avgAttendanceRate}%`} />
          </div>

          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Subject Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 text-left"><SortableHeader label="Subject" sortKey="subject" sortState={subjectSort} onSort={toggleSubjectSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Type" sortKey="type" sortState={subjectSort} onSort={toggleSubjectSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Scheduled" sortKey="scheduled_count" sortState={subjectSort} onSort={toggleSubjectSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Attended" sortKey="attended_count" sortState={subjectSort} onSort={toggleSubjectSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Rate" sortKey="attendance_rate" sortState={subjectSort} onSort={toggleSubjectSort} /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubjects.map((row) => (
                    <tr key={`${row.subject}-${row.type}`} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-3 font-medium text-slate-800">{row.subject}</td>
                      <td className="py-3 text-slate-600">{row.type}</td>
                      <td className="py-3 text-slate-600">{row.scheduled_count}</td>
                      <td className="py-3 text-slate-600">{row.attended_count}</td>
                      <td className="py-3">
                        <div className="w-40 space-y-1">
                          <div className="text-xs font-semibold text-slate-600">{row.attendance_rate}%</div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${row.attendance_rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Student Attendance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 text-left"><SortableHeader label="Student" sortKey="name" sortState={studentSort} onSort={toggleStudentSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Roll No" sortKey="roll_number" sortState={studentSort} onSort={toggleStudentSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Present" sortKey="total_present" sortState={studentSort} onSort={toggleStudentSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Absent" sortKey="total_absent" sortState={studentSort} onSort={toggleStudentSort} /></th>
                    <th className="py-3 text-left"><SortableHeader label="Rate" sortKey="overall_rate" sortState={studentSort} onSort={toggleStudentSort} /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((row) => (
                    <tr key={row.roll_number} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="py-3 text-slate-600">{row.roll_number}</td>
                      <td className="py-3 text-slate-600">{row.total_present}</td>
                      <td className="py-3 text-slate-600">{row.total_absent}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRateStyles(row.overall_rate)}`}>
                          {row.overall_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  )
}
