import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { registerStudent, validateStudentPhoto } from '../api'

const MAX_PHOTOS = 5

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { registerStudent, validateStudentPhoto } from '../api'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [slots, setSlots] = useState(Array.from({ length: MAX_PHOTOS }, () => ({ file: null, preview: '', status: 'idle', error: '' })))
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const selectedCount = useMemo(() => slots.filter((s) => s.file).length, [slots])

  const validatePhoto = async (file, index) => {
    const formData = new FormData()
    formData.append('photo', file)

    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, status: 'validating', error: '' } : slot)))

    try {
      await validateStudentPhoto(formData)
      setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, status: 'valid' } : slot)))
    } catch (err) {
      setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, status: 'invalid', error: err.response?.data?.message || 'Validation failed' } : slot)))
    }
  }

  const assignPhotoToSlot = async (index, file) => {
    if (!file) return
    setSlots((prev) => prev.map((slot, i) => (i === index ? { file, preview: URL.createObjectURL(file), status: 'idle', error: '' } : slot)))
    await validatePhoto(file, index)
  }

  const removeSlotPhoto = (index) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { file: null, preview: '', status: 'idle', error: '' } : slot)))
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    const files = slots.filter((s) => s.file).map((s) => s.file)
    if (files.length === 0) return toast.error('Please add at least one photo')

    const invalid = slots.some((s) => s.file && s.status === 'invalid')
    if (invalid) return toast.error('Please fix invalid photos before submitting')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [faceValid, setFaceValid] = useState(null)

  const onPhotoChange = async (file) => {
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setFaceValid(null)

    const formData = new FormData()
    formData.append('photo', file)

    try {
      await validateStudentPhoto(formData)
      setFaceValid(true)
      toast.success('Face validation passed')
    } catch (err) {
      setFaceValid(false)
      toast.error(err.response?.data?.message || 'Face validation failed')
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!photo) return toast.error('Please upload photo')

    const formData = new FormData()
    formData.append('name', name)
    formData.append('roll_number', rollNumber)
    files.forEach((file) => formData.append('photos[]', file))

    try {
      setLoading(true)
      setProgress(15)
      const timer = setInterval(() => setProgress((p) => Math.min(p + 10, 90)), 250)
      const res = await registerStudent(formData)
      clearInterval(timer)
      setProgress(100)
      toast.success(`Registered with ${res.data.photo_count} photos`)
    formData.append('photo', photo)

    try {
      setLoading(true)
      await registerStudent(formData)
      toast.success('Student registered successfully')
      navigate('/students')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 400)
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Register Student</h1>
      <p className="text-amber-600 text-sm">Add photos from different angles for better accuracy.</p>

      <input className="w-full p-3 rounded-lg border" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="w-full p-3 rounded-lg border" placeholder="Roll Number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {slots.map((slot, index) => (
          <div key={index} className="relative bg-white border rounded-lg p-2 h-40 flex items-center justify-center">
            {!slot.file ? (
              <label className="cursor-pointer text-center text-sm text-slate-500">
                <span className="block">Upload</span>
                <span className="block">slot {index + 1}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => assignPhotoToSlot(index, e.target.files?.[0])}
                />
              </label>
            ) : (
              <>
                <img src={slot.preview} alt={`slot-${index + 1}`} className="h-full w-full object-cover rounded" />
                <button
                  type="button"
                  onClick={() => removeSlotPhoto(index)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-1 left-1 right-1 bg-white/90 rounded px-1 py-0.5 text-[10px]">
                  {slot.status === 'validating' && 'Validating...'}
                  {slot.status === 'valid' && <span className="text-green-700 flex items-center gap-1"><CheckCircle2 size={12} /> Valid</span>}
                  {slot.status === 'invalid' && <span className="text-red-700 flex items-center gap-1"><XCircle size={12} /> Invalid</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">{selectedCount} / {MAX_PHOTOS} photos selected (minimum 1, maximum 5)</p>

      {loading && (
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className="bg-green-500 h-2 transition-all" style={{ width: `${progress}%` }} />
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Register Student</h1>
      <input className="w-full p-3 rounded-lg border" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="w-full p-3 rounded-lg border" placeholder="Roll Number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
      <input type="file" accept="image/*" className="w-full p-3 rounded-lg border bg-white" onChange={(e) => e.target.files[0] && onPhotoChange(e.target.files[0])} required />

      {preview && (
        <div>
          <img src={preview} alt="preview" className="h-64 rounded-lg object-cover" />
          {faceValid === true && <p className="text-green-600 mt-2">Exactly one face detected ✅</p>}
          {faceValid === false && <p className="text-red-600 mt-2">Face validation failed ❌</p>}
        </div>
      )}

      <button disabled={loading} className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-60">
        {loading ? 'Registering...' : 'Register Student'}
      </button>
    </form>
  )
}
