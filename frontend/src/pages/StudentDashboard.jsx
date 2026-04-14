import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  User,
  CalendarCheck,
  CalendarX,
  Camera,
  ChevronRight,
  CheckCircle2,
  Clock,
  ScanFace,
  Upload,
  XCircle,
  Info,
  Calendar,
  MapPin,
  Trophy,
  Medal,
  TrendingUp,
  Award,
  Star,
  AlertOctagon,
  Bell
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  getStudentAttendance, 
  addStudentPhotos, 
  getSchedules, 
  getLeaderboard, 
  getStudentGamification 
} from '../api'

const API_BASE = 'http://localhost:5000'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [gamification, setGamification] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Photo upload states
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('student')
    if (!stored) {
      navigate('/student-login')
      return
    }
    const parsed = JSON.parse(stored)
    setStudent(parsed)

    const loadData = async () => {
      try {
        const [attRes, schedRes, gamificationRes, leaderboardRes] = await Promise.all([
          getStudentAttendance(parsed.id),
          getSchedules(),
          getStudentGamification(parsed.id),
          getLeaderboard()
        ])
        setAttendance(attRes.data)
        setSchedules(schedRes.data)
        setGamification(gamificationRes.data)
        setLeaderboard(leaderboardRes.data)
      } catch (err) {
        console.error(err)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [navigate])

  const logout = () => {
    localStorage.removeItem('student')
    toast.success('Logged out successfully')
    navigate('/')
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoPreview(URL.createObjectURL(file))
    setSelectedPhoto(file)
  }

  const handleUploadPhoto = async () => {
    if (!selectedPhoto) return

    const formData = new FormData()
    formData.append('photos[]', selectedPhoto)

    try {
      setUploading(true)
      const res = await addStudentPhotos(student.id, formData)

      const updatedStudent = {
        ...student,
        photo_count: res.data.photo_count,
        registration_photos: res.data.registration_photos,
      }
      setStudent(updatedStudent)
      localStorage.setItem('student', JSON.stringify(updatedStudent))

      toast.success('Photo added successfully')
      setSelectedPhoto(null)
      setPhotoPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo. Please ensure face is clear.')
    } finally {
      setUploading(false)
    }
  }

  const stats = useMemo(() => {
    if (!attendance) return null
    return {
      total: attendance.total_sessions,
      present: attendance.present_count,
      absent: attendance.absent_count,
      percentage: attendance.attendance_percentage,
    }
  }, [attendance])

  const streakInfo = useMemo(() => {
    if (!attendance?.records?.length) return { current: 0 }
    let current = 0
    for (const r of attendance.records) {
      if (r.status === 'present') current++
      else break
    }
    return { current }
  }, [attendance])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading dashboard...</p>
      </div>
    )
  }

  if (!student) return null

  const photoCount = student.photo_count || 1;
  const canUploadMore = photoCount < 5;

  const photoUrl = student.photo_path
    ? `${API_BASE}/static/${student.photo_path}`
    : null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* ─── Top Navigation Bar ─── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanFace size={24} className="text-indigo-600" />
            <span className="font-bold text-xl text-slate-800">Face Attendance</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm font-medium text-slate-500">Student Portal</span>
            <button onClick={logout} className="p-2 ml-4 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
              <LogOut size={18} />
              <span className="hidden sm:inline font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ─── Notification Banner ─── */}
        {schedules.length > 0 && (
          <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start sm:items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                <CalendarCheck size={20} />
              </div>
              <div>
                <p className="font-semibold text-indigo-900">Upcoming Schedule</p>
                <p className="text-sm text-indigo-700">You have {schedules.length} session{schedules.length !== 1 && 's'} scheduled for this week.</p>
              </div>
            </div>
            <button
               onClick={() => setActiveTab('schedule')}
               className="hidden sm:inline-block px-4 py-1.5 bg-white text-indigo-600 font-medium text-sm rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors"
            >
              View Schedule
            </button>
          </div>
        )}

        {/* ─── Critical Absence Warning ─── */}
        {gamification?.absence_streak > 3 && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-xl p-5 flex items-start gap-4 shadow-md animate-bounce-subtle">
            <div className="bg-rose-100 text-rose-600 p-3 rounded-full flex-shrink-0">
              <AlertOctagon size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-900 mb-1">Critical Absence Warning</h3>
              <p className="text-rose-700 font-medium leading-relaxed">
                You have been absent for <span className="font-extrabold">{gamification.absence_streak} consecutive sessions</span>. 
                A notification has been sent to the faculty, and your teacher is required to contact your parents/guardians immediately.
              </p>
              <p className="text-rose-600 text-sm mt-2 flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Info size={14} /> Please contact your course coordinator as soon as possible.
              </p>
            </div>
          </div>
        )}

        {/* ─── Profile Header ─── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={student.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-slate-50" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-50">
                <User size={40} className="text-slate-400" />
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {student.name}
            </h1>
            <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-slate-500 text-sm items-center md:items-start">
              <span className="flex items-center gap-1">
                <span className="font-semibold text-slate-700">Roll No:</span> {student.roll_number}
              </span>
              <span className="flex items-center gap-1">
                <span className="font-semibold text-slate-700">Email:</span> {student.email}
              </span>
              {gamification?.badge !== 'None' && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                  gamification.badge === 'Gold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  gamification.badge === 'Silver' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                  'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  <Trophy size={12} /> {gamification.badge} Badge
                </span>
              )}
              {gamification?.streak > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                  <TrendingUp size={12} /> {gamification.streak} Day Streak
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Metric Dashboard ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={CheckCircle2} label="Present Days" value={stats?.present ?? 0} color="emerald" />
          <StatCard icon={CalendarX} label="Absent Days" value={stats?.absent ?? 0} color="rose" />
          <StatCard icon={CalendarCheck} label="Total Sessions" value={stats?.total ?? 0} color="indigo" />
          <StatCard icon={Clock} label="Current Streak" value={`${streakInfo.current} days`} color="cyan" />
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'history', label: 'History' },
            { id: 'profile', label: 'Settings & Photos' },
          ].map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ─── Tab Content ─── */}
        <div className="min-h-[400px]">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Weekly Class Schedule</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                  const daySched = schedules.filter(s => s.day_of_week === day).sort((a,b) => a.time.localeCompare(b.time))
                  return (
                    <div key={day} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                        <h3 className="font-semibold text-slate-700">{day}</h3>
                      </div>
                      <div className="p-4 flex-1 space-y-3 bg-slate-50/30">
                        {daySched.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-sm italic">
                            No classes
                          </div>
                        ) : (
                          daySched.map(sched => (
                            <div key={sched.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                                  sched.type === 'Lecture' ? 'bg-blue-100 text-blue-700' :
                                  sched.type === 'Lab' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  {sched.type}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-800 text-sm mb-2">{sched.subject}</h4>
                              <div className="space-y-1">
                                <div className="flex items-center text-[11px] text-slate-500 gap-1.5">
                                  <Clock size={12} /> {sched.time}
                                </div>
                                <div className="flex items-center text-[11px] text-slate-500 gap-1.5">
                                  <MapPin size={12} /> {sched.room || 'TBA'}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-1 space-y-6">
                {/* Circular Progress */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="text-slate-600 font-semibold mb-6 self-start w-full">Attendance Rate</h3>

                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="70" fill="none" strokeWidth="12" className="stroke-slate-100" />
                      <circle
                        cx="80" cy="80" r="70" fill="none" strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 70}`}
                        strokeDashoffset={`${2 * Math.PI * 70 * (1 - (stats?.percentage ?? 0) / 100)}`}
                        className={`${(stats?.percentage ?? 0) >= 75 ? 'stroke-emerald-500' : (stats?.percentage ?? 0) >= 50 ? 'stroke-amber-400' : 'stroke-rose-500'} transition-all duration-1000 origin-center`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-slate-800">
                        {stats?.percentage ?? 0}<span className="text-xl ml-1 text-slate-500">%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gamification Panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                   <h3 className="text-slate-600 font-semibold mb-4 flex items-center gap-2">
                     <Award className="text-indigo-600" size={18} /> Achievement Progress
                   </h3>
                   
                   <div className="space-y-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500 font-medium">To {gamification?.badge === 'Gold' ? 'Perfect Score' : gamification?.badge === 'Silver' ? 'Gold Badge' : gamification?.badge === 'Bronze' ? 'Silver Badge' : 'Bronze Badge'}</span>
                        <span className="text-indigo-600 font-bold">{stats?.percentage ?? 0}% / {gamification?.next_threshold ?? 50}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, ((stats?.percentage ?? 0) / (gamification?.next_threshold || 50)) * 100)}%` }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className={`flex flex-col items-center p-2 rounded-lg border ${ (stats?.percentage ?? 0) >= 50 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 grayscale' }`}>
                          <Medal size={20} className={ (stats?.percentage ?? 0) >= 50 ? 'text-orange-600' : 'text-slate-400' } />
                          <span className="text-[10px] font-bold mt-1">BRONZE</span>
                        </div>
                        <div className={`flex flex-col items-center p-2 rounded-lg border ${ (stats?.percentage ?? 0) >= 75 ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-100 grayscale' }`}>
                          <Medal size={20} className={ (stats?.percentage ?? 0) >= 75 ? 'text-slate-600' : 'text-slate-400' } />
                          <span className="text-[10px] font-bold mt-1">SILVER</span>
                        </div>
                        <div className={`flex flex-col items-center p-2 rounded-lg border ${ (stats?.percentage ?? 0) >= 90 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 grayscale' }`}>
                          <Trophy size={20} className={ (stats?.percentage ?? 0) >= 90 ? 'text-amber-600' : 'text-slate-400' } />
                          <span className="text-[10px] font-bold mt-1">GOLD</span>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Weekly Leaderboard */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                   <h3 className="text-slate-600 font-semibold mb-4 flex items-center gap-2">
                     <Star className="text-amber-500" size={18} /> Weekly Top Performers
                   </h3>
                   <div className="space-y-3">
                      {leaderboard.length === 0 ? (
                        <p className="text-slate-400 text-xs text-center py-4 italic">No rankings available yet this week.</p>
                      ) : (
                        leaderboard.map((entry, idx) => (
                          <div key={idx} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${ entry.name === student.name ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50' }`}>
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                                idx === 0 ? 'bg-amber-100 text-amber-700' :
                                idx === 1 ? 'bg-slate-200 text-slate-700' :
                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className={`text-sm font-medium ${entry.name === student.name ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {entry.name} {entry.name === student.name && '(You)'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-600">{entry.percentage}%</span>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* Heatmap */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden">
                    <h3 className="text-slate-600 font-semibold mb-6">Attendance Density</h3>
                    <AttendanceHeatmap records={attendance?.records || []} />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-slate-600 font-semibold">Recent Activity</h3>
                  <button onClick={() => setActiveTab('history')} className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors flex items-center gap-1">
                    View all <ChevronRight size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {(!attendance?.records?.length) ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500 text-sm">No recent attendance records.</p>
                    </div>
                  ) : (
                    attendance.records.slice(0, 4).map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${record.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {record.status === 'present' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                          </div>
                          <div>
                            <p className="text-slate-900 font-medium">
                              {new Date(record.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-slate-500 text-sm">
                              {new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                          {record.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {(!attendance?.records?.length) ? (
                <div className="text-center py-16">
                  <Clock size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No attendance history available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 hidden sm:table-cell">Total Present</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance.records.map((record, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-800">
                            {new Date(record.timestamp).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs ${record.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                              {record.status === 'present' ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">{record.total_present} Students</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Face Database</h3>
                <p className="text-slate-500 text-sm">Upload clear photos of yourself to improve facial recognition accuracy. ({photoCount}/5 utilized)</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {student.registration_photos?.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
                      {student.registration_photos.map((p, i) => (
                        <div key={i} className="aspect-square relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                          <img
                            src={`${API_BASE}/static/${p}`}
                            alt={`Face ${i}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium">#{i + 1}</span>
                          </div>
                        </div>
                      ))}
                      {/* Empty placeholders */}
                      {Array.from({ length: 5 - photoCount }).map((_, i) => (
                        <div key={`empty-${i}`} className="border-2 border-dashed border-slate-200 rounded-lg aspect-square flex items-center justify-center bg-slate-50 text-slate-400">
                          <ScanFace size={24} className="opacity-50" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Upload size={18} className="text-indigo-600" />
                      Upload Additional Photo
                    </h4>

                    {canUploadMore ? (
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex-1 w-full relative">
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handlePhotoSelect}
                            title=""
                          />
                          {!photoPreview ? (
                            <div className="w-full py-6 border-2 border-dashed border-slate-300 bg-white rounded-lg text-center transition-colors hover:border-indigo-400 hover:bg-slate-50">
                              <Camera size={24} className="mx-auto mb-2 text-slate-400" />
                              <span className="text-sm font-medium text-slate-600">Click to browse or drag image here</span>
                            </div>
                          ) : (
                            <div className="relative aspect-video sm:w-64 border border-slate-200 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center pointer-events-none">
                              <img src={photoPreview} alt="Preview" className="h-full object-contain" />
                            </div>
                          )}
                          {photoPreview && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoPreview(null);
                                setSelectedPhoto(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="absolute top-2 right-2 bg-white/90 shadow-sm p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors z-20"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>

                        <div className="w-full sm:w-auto mt-4 sm:mt-0">
                          <button
                            disabled={!selectedPhoto || uploading}
                            onClick={handleUploadPhoto}
                            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 rounded-lg text-white font-medium disabled:opacity-50 disabled:bg-slate-400 hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                          >
                            {uploading ? 'Processing...' : 'Upload Photo'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-medium text-sm gap-2">
                        <CheckCircle2 size={18} /> You have reached the maximum limit of 5 photos.
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5">
                    <h4 className="flex items-center gap-2 font-semibold text-indigo-900 mb-3">
                      <Info size={18} /> Model Accuracy
                    </h4>
                    <p className="text-sm text-indigo-800 mb-4 leading-relaxed">
                      Providing multiple photos from different angles or in different lighting significantly improves the system's ability to recognize you during attendance.
                    </p>
                    <ul className="text-sm text-indigo-700 space-y-2 list-disc list-inside">
                      <li>Ensure your face is clearly visible.</li>
                      <li>Avoid wearing sunglasses or hats.</li>
                      <li>Look directly at the camera.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    cyan: 'text-cyan-600 bg-cyan-100',
    emerald: 'text-emerald-600 bg-emerald-100',
    rose: 'text-rose-600 bg-rose-100',
    indigo: 'text-indigo-600 bg-indigo-100',
  }
  const bg = colorMap[color]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${bg}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
        <p className="text-slate-900 text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

function AttendanceHeatmap({ records }) {
  const dateMap = useMemo(() => {
    const map = {}
    records.forEach(r => {
      const d = new Date(r.timestamp)
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (map[dStr] !== 'present') {
        map[dStr] = r.status
      }
    })
    return map
  }, [records])

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    const startDate = new Date()
    startDate.setDate(today.getDate() - 175) // ~6 months

    // Align to Sunday
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1)
    }

    const days = []
    let current = new Date(startDate)
    while (current <= today) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    const wks = []
    const mLabels = []
    let lastMonth = -1

    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7)
      wks.push(weekDays)
      
      // Track month changes for header labels
      const firstDayOfWeek = weekDays[0]
      if (firstDayOfWeek.getMonth() !== lastMonth) {
        mLabels.push({ index: wks.length - 1, label: firstDayOfWeek.toLocaleString('default', { month: 'short' }) })
        lastMonth = firstDayOfWeek.getMonth()
      }
    }

    return { weeks: wks, monthLabels: mLabels }
  }, [])

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-fit">
        {/* Months Row */}
        <div className="flex mb-2 ml-8 relative h-4">
          {monthLabels.map((m, i) => (
            <span key={i} className="absolute text-xs text-slate-500" style={{ left: `${m.index * 16}px` }}>
              {m.label}
            </span>
          ))}
        </div>
        
        <div className="flex gap-2">
          {/* Days of Week Row */}
          <div className="flex flex-col gap-1 text-[10px] text-slate-400 mt-1 justify-between py-1">
            <span className="h-3 leading-3">Mon</span>
            <span className="h-3 leading-3 mt-3">Wed</span>
            <span className="h-3 leading-3 mt-3">Fri</span>
          </div>

          {/* Grid */}
          <div className="flex gap-1 border border-slate-100 p-1.5 rounded-lg bg-slate-50/50">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map(day => {
                  const dStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                  const status = dateMap[dStr]
                  
                  let colorClass = 'bg-slate-200'
                  if (status === 'present') colorClass = 'bg-emerald-500'
                  else if (status === 'absent') colorClass = 'bg-rose-500'

                  return (
                    <div
                      key={dStr}
                      title={`${day.toLocaleDateString()}: ${status || 'No Session'}`}
                      className={`w-3.5 h-3.5 rounded-sm hover:ring-2 hover:ring-slate-300 transition-all ${colorClass}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
           <span>Less</span>
           <div className="w-3.5 h-3.5 rounded-sm bg-slate-200"></div>
           <div className="w-3.5 h-3.5 rounded-sm bg-rose-500"></div>
           <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500"></div>
           <span>More</span>
        </div>
      </div>
    </div>
  )
}
