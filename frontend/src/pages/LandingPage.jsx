import { Link } from 'react-router-dom'
import { GraduationCap, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Welcome to Attendance System
        </h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto">
          Please select your role to continue registration and access your dashboard.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl px-4">
        <Link 
          to="/register/student" 
          className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group"
        >
          <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-600 mb-4">
            <GraduationCap size={48} />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Student</h2>
          <p className="text-center text-slate-500">Register with your @slrtce.in email and face photos.</p>
        </Link>

        <Link 
          to="/register/teacher" 
          className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group"
        >
          <div className="p-4 bg-indigo-100 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-colors text-indigo-600 mb-4">
            <Users size={48} />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Teacher</h2>
          <p className="text-center text-slate-500">Register to manage students and track attendance.</p>
        </Link>
      </div>
    </div>
  )
}
