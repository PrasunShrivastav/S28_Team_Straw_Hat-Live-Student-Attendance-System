import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { takeAttendance } from '../api'

export default function TakeAttendance() {
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!photo) return toast.error('Please select a group photo')

    const formData = new FormData()
    formData.append('group_photo', photo)

    try {
      setLoading(true)
      const res = await takeAttendance(formData)
      toast.success('Attendance completed')
      navigate(`/results/${res.data.session_id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Attendance failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Take Attendance</h1>
      <label className="block border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white cursor-pointer">
        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setPhoto(file)
            setPreview(URL.createObjectURL(file))
          }
        }} />
        <p>Drag & drop or click to upload group photo</p>
      </label>
      {preview && <img src={preview} alt="group preview" className="rounded-lg" />}
      <button onClick={submit} disabled={loading} className="px-4 py-2 rounded-lg bg-green-500 text-white disabled:opacity-60">
        {loading ? 'Processing...' : 'Process Attendance'}
      </button>
    </div>
  )
}
