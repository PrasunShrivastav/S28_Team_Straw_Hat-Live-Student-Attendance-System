import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { registerTeacher } from '../api'

export default function TeacherRegister() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
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
      await registerTeacher({ name, email, password })
      toast.success('Teacher registered successfully')
      navigate('/teacher-dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-6">Register Teacher</h1>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input type="email" className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder="teacher@slrtce.in" value={email} onChange={(e) => setEmail(e.target.value)} required pattern=".*@slrtce\.in$" title="Please use your @slrtce.in email address" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder="Create a secure password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        <button disabled={loading} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors font-medium mt-4">
          {loading ? 'Registering...' : 'Register as Teacher'}
        </button>
      </form>
    </div>
  )
}
