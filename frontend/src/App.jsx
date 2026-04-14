import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import TeacherDashboard from './pages/TeacherDashboard'
import Register from './pages/Register'
import TeacherRegister from './pages/TeacherRegister'
import TeacherLogin from './pages/TeacherLogin'
import StudentLogin from './pages/StudentLogin'
import StudentDashboard from './pages/StudentDashboard'
import LandingPage from './pages/LandingPage'
import Students from './pages/Students'
import TakeAttendance from './pages/TakeAttendance'
import Results from './pages/Results'

export default function App() {
  const location = useLocation()
  // Hide the teacher dashboard navbar on landing, registration, student login, teacher login, and student dashboard pages
  const hideNavbar = ['/', '/register/student', '/register/teacher', '/student-login', '/teacher-login', '/student-dashboard'].includes(location.pathname)
  // Student pages use their own full-screen layout (no padding/bg from the wrapper)
  const isStudentFullscreen = ['/student-login', '/student-dashboard'].includes(location.pathname)

  return (
    <div className={`min-h-screen ${isStudentFullscreen ? '' : 'bg-slate-100'} ${!hideNavbar ? 'md:flex' : ''}`}>
      {!hideNavbar && <Navbar />}
      {isStudentFullscreen ? (
        <Routes>
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
        </Routes>
      ) : (
        <main className="flex-1 p-4 md:p-8">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/register/student" element={<Register />} />
            <Route path="/register/teacher" element={<TeacherRegister />} />
            <Route path="/teacher-login" element={<TeacherLogin />} />
            <Route path="/students" element={<Students />} />
            <Route path="/take-attendance" element={<TakeAttendance />} />
            <Route path="/results/:sessionId" element={<Results />} />
          </Routes>
        </main>
      )}
    </div>
  )
}
