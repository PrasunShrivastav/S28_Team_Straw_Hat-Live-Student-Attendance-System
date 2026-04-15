import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL
const api = axios.create({
  baseURL: BASE_URL,
})

export const registerStudent = (formData) => api.post('/students/register', formData)
export const registerTeacher = (data) => api.post('/teachers/register', data)
export const teacherLogin = (data) => api.post('/teachers/login', data)
export const validateStudentPhoto = (formData) => api.post('/students/validate', formData)
export const getStudents = () => api.get('/students')
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const addStudentPhotos = (studentId, formData) => api.post(`/students/${studentId}/add-photos`, formData)
export const getStudentAttendanceStats = () => api.get(`/students/attendance-stats`)

export const takeAttendance = (formData) => api.post('/attendance/take', formData)
export const getSessions = () => api.get('/attendance/sessions')

export const getSchedules = () => api.get('/schedules')
export const createSchedule = (data) => api.post('/schedules', data)
export const updateSchedule = (id, data) => api.put(`/schedules/${id}`, data)
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`)
export const createSession = (data) => api.post('/sessions/create', data)
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data)
export const deleteSession = (id) => api.delete(`/sessions/${id}`)
export const skipSession = (id, data) => api.post(`/sessions/${id}/skip`, data)
export const endSession = (id, data) => api.post(`/sessions/${id}/end`, data)
export const getSessionsWeek = (date) => api.get('/sessions/week', { params: { date } })
export const getSessionsMonth = (month) => api.get('/sessions/month', { params: { month } })
export const getMonthlyAnalytics = (month) => api.get('/analytics/monthly', { params: { month } })
export const getLeaderboard = () => api.get('/gamification/leaderboard')
export const getStudentGamification = (id) => api.get(`/students/${id}/gamification`)
export const getEscalationAlerts = () => api.get('/alerts/escalation')

export const getSession = (sessionId) => api.get(`/attendance/session/${sessionId}`)
export const exportSessionCsvUrl = (sessionId) => `${api.defaults.baseURL}/attendance/export/${sessionId}`
export const updateAttendanceStatus = (sessionId, data) => api.post(`/attendance/session/${sessionId}/update-student`, data)

export const studentLogin = (email) => api.post('/students/login', { email })
export const getStudentAttendance = (studentId) => api.get(`/students/${studentId}/attendance`)

export default api
