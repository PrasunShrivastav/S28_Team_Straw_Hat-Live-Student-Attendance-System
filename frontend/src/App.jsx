import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import TeacherDashboard from './pages/TeacherDashboard'
import Register from './pages/Register'
import TeacherRegister from './pages/TeacherRegister'
import StudentDashboard from './pages/StudentDashboard'
import LandingPage from './pages/LandingPage'
import Students from './pages/Students'
import TakeAttendance from './pages/TakeAttendance'
import Results from './pages/Results'

export default function App() {
  const location = useLocation()
  // Hide the teacher dashboard navbar on landing, registration, and student pages
  const hideNavbar = ['/', '/register/student', '/register/teacher', '/student-dashboard'].includes(location.pathname)

  return (
    <div className={`min-h-screen bg-slate-100 ${!hideNavbar ? 'md:flex' : ''}`}>
      {!hideNavbar && <Navbar />}
      <main className="flex-1 p-4 md:p-8">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/register/student" element={<Register />} />
          <Route path="/register/teacher" element={<TeacherRegister />} />
          <Route path="/students" element={<Students />} />
          <Route path="/take-attendance" element={<TakeAttendance />} />
          <Route path="/results/:sessionId" element={<Results />} />
        </Routes>
      </main>
    </div>
  )
}
