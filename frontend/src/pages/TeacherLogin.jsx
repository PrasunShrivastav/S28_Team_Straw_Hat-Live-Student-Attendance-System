import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { teacherLogin } from '../api'

export default function TeacherLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!email.endsWith('@slrtce.in')) {
      return toast.error('Only @slrtce.in emails are allowed')
    }

    try {
      setLoading(true)
      const res = await teacherLogin({ email, password })
      if (res.data.success) {
        localStorage.setItem('teacher', JSON.stringify(res.data.teacher))
        toast.success(`Welcome back, ${res.data.teacher.name}!`)
        navigate('/teacher-dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-6">Teacher Login</h1>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
           <input type="email" className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder="teacher@slrtce.in" value={email} onChange={(e) => setEmail(e.target.value)} required pattern=".*@slrtce\.in$" title="Please use your @slrtce.in email address" />
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
           <input type="password" className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button disabled={loading} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors font-medium mt-4">
          {loading ? 'Logging in...' : 'Login as Teacher'}
        </button>
      </form>
      <div className="mt-4 text-center">
        <p className="text-slate-500 text-sm">
          Don't have an account?{' '}
          <Link to="/register/teacher" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
