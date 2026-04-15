import { Link, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { LayoutDashboard, Users, Camera, LogOut, Calendar, BarChart3 } from 'lucide-react'

const navItems = [
  { to: '/teacher-dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
  { to: '/teacher-schedule', label: 'Schedule', icon: Calendar },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/take-attendance', label: 'Take Attendance', icon: Camera },
  { to: '/analytics/monthly', label: 'Monthly Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: Calendar },
]

export default function Navbar() {
  const navigate = useNavigate()
  const teacherStr = localStorage.getItem('teacher')
  
  if (!teacherStr) {
    return <Navigate to="/teacher-login" />
  }

  const handleLogout = () => {
    localStorage.removeItem('teacher')
    navigate('/teacher-login')
  }

  return (
    <aside className="w-full md:w-72 bg-slate-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        <Link to="/" className="text-xl font-bold block mb-8">Face Attendance</Link>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                  isActive ? 'bg-slate-700' : 'hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      </div>
      
      <div className="mt-8">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 w-full text-red-400 hover:bg-slate-800 transition text-left"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
