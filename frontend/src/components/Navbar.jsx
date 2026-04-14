import { Link, NavLink } from 'react-router-dom'
import { LayoutDashboard, UserPlus, Users, Camera } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Home Page', icon: LayoutDashboard },
  { to: '/teacher-dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/take-attendance', label: 'Take Attendance', icon: Camera },
]

export default function Navbar() {
  return (
    <aside className="w-full md:w-72 bg-slate-900 text-white min-h-screen p-4">
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
    </aside>
  )
}
