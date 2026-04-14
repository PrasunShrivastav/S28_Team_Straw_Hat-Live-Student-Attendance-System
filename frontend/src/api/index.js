import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
})

export const registerStudent = (formData) => api.post('/students/register', formData)
export const registerTeacher = (data) => api.post('/teachers/register', data)
export const teacherLogin = (data) => api.post('/teachers/login', data)
export const validateStudentPhoto = (formData) => api.post('/students/validate', formData)
export const getStudents = () => api.get('/students')
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const addStudentPhotos = (studentId, formData) => api.post(`/students/${studentId}/add-photos`, formData)

export const takeAttendance = (formData) => api.post('/attendance/take', formData)
export const getSessions = () => api.get('/attendance/sessions')
export const getSession = (sessionId) => api.get(`/attendance/session/${sessionId}`)
export const exportSessionCsvUrl = (sessionId) => `${api.defaults.baseURL}/attendance/export/${sessionId}`

export const studentLogin = (email) => api.post('/students/login', { email })
export const getStudentAttendance = (studentId) => api.get(`/students/${studentId}/attendance`)

export default api
