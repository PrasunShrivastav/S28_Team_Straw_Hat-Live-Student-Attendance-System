import { Link } from 'react-router-dom'
import { GraduationCap, Users, LogIn } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-12 px-4 space-y-10">

      {/* Hero */}
      <div className="text-center space-y-4 animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
          Welcome to Attendance System
        </h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
          Please select your role to continue registration and access your dashboard.
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          to="/register/student"
          className="group relative flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-blue-200"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 bg-blue-100 rounded-full mb-4 transition-all duration-300 group-hover:bg-blue-500 group-hover:scale-110 group-hover:rotate-[-4deg] group-hover:shadow-lg group-hover:shadow-blue-200">
              <GraduationCap size={44} className="text-blue-600 transition-colors duration-300 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-slate-800">Student</h2>
            <p className="text-center text-slate-500 text-sm leading-relaxed">
              Register with your @slrtce.in email and face photos.
            </p>
          </div>
        </Link>

        <Link
          to="/register/teacher"
          className="group relative flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-indigo-200"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 bg-indigo-100 rounded-full mb-4 transition-all duration-300 group-hover:bg-indigo-500 group-hover:scale-110 group-hover:rotate-[-4deg] group-hover:shadow-lg group-hover:shadow-indigo-200">
              <Users size={44} className="text-indigo-600 transition-colors duration-300 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-slate-800">Teacher</h2>
            <p className="text-center text-slate-500 text-sm leading-relaxed">
              Register to manage students and track attendance.
            </p>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full max-w-2xl">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-sm text-slate-400">already registered?</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Login Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/student-login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-all duration-200 hover:bg-slate-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-300 active:scale-95"
        >
          <LogIn size={16} />
          Student Login
        </Link>
        <Link
          to="/teacher-login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium transition-all duration-200 hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200 active:scale-95"
        >
          <LogIn size={16} />
          Teacher Login
        </Link>
      </div>

    </div>
  )
}