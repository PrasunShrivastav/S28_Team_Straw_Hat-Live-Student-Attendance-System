import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const BASE_URL = rawBaseUrl.replace(/\/+$/, "");
const api = axios.create({
  baseURL: BASE_URL,
});

export const registerStudent = (formData) =>
  api.post("/api/students/register", formData);
export const registerTeacher = (data) => api.post("/api/teachers/register", data);
export const teacherLogin = (data) => api.post("/api/teachers/login", data);
export const validateStudentPhoto = (formData) =>
  api.post("/api/students/validate", formData);
export const getStudents = () => api.get("/api/students");
export const deleteStudent = (id) => api.delete(`/api/students/${id}`);
export const addStudentPhotos = (studentId, formData) =>
  api.post(`/api/students/${studentId}/add-photos`, formData);
export const getStudentAttendanceStats = () =>
  api.get(`/api/students/attendance-stats`);

export const takeAttendance = (formData) =>
  api.post("/api/attendance/take", formData);
export const getSessions = () => api.get("/api/attendance/sessions");

export const getSchedules = () => api.get("/api/schedules");
export const createSchedule = (data) => api.post("/api/schedules", data);
export const updateSchedule = (id, data) => api.put(`/api/schedules/${id}`, data);
export const deleteSchedule = (id) => api.delete(`/api/schedules/${id}`);
export const createSession = (data) => api.post("/api/sessions/create", data);
export const updateSession = (id, data) => api.put(`/api/sessions/${id}`, data);
export const deleteSession = (id) => api.delete(`/api/sessions/${id}`);
export const skipSession = (id, data) => api.post(`/api/sessions/${id}/skip`, data);
export const endSession = (id, data) => api.post(`/api/sessions/${id}/end`, data);
export const getSessionsWeek = (date) =>
  api.get("/api/sessions/week", { params: { date } });
export const getSessionsMonth = (month) =>
  api.get("/api/sessions/month", { params: { month } });
export const getMonthlyAnalytics = (month) =>
  api.get("/api/analytics/monthly", { params: { month } });
export const getLeaderboard = () => api.get("/api/gamification/leaderboard");
export const getStudentGamification = (id) =>
  api.get(`/api/students/${id}/gamification`);
export const getEscalationAlerts = () => api.get("/api/alerts/escalation");

export const getSession = (sessionId) =>
  api.get(`/api/attendance/session/${sessionId}`);
export const exportSessionCsvUrl = (sessionId) =>
  `${api.defaults.baseURL}/api/attendance/export/${sessionId}`;
export const updateAttendanceStatus = (sessionId, data) =>
  api.post(`/api/attendance/session/${sessionId}/update-student`, data);

export const studentLogin = (email) => api.post("/api/students/login", { email });
export const getStudentAttendance = (studentId) =>
  api.get(`/api/students/${studentId}/attendance`);

export default api;
