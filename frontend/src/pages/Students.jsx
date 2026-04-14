import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { deleteStudent, getStudents, validateStudentPhoto } from '../api'
import StudentCard from '../components/StudentCard'

const MAX_PHOTOS = 5

import { deleteStudent, getStudents } from '../api'
import StudentCard from '../components/StudentCard'

export default function Students() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [slots, setSlots] = useState(Array.from({ length: MAX_PHOTOS }, () => ({ file: null, preview: '', status: 'idle' })))
  const [saving, setSaving] = useState(false)

  const loadStudents = async () => {
    try {
      const res = await getStudents()
      setStudents(res.data)
    } catch {
      toast.error('Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const filtered = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [students, search],
  )

  const onDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}?`)) return
    try {
      await deleteStudent(student.id)
      toast.success('Student deleted')
      loadStudents()
    } catch {
      toast.error('Delete failed')
    }
  }

  const onAddPhotos = (student) => {
    setSelectedStudent(student)
    setSlots(Array.from({ length: MAX_PHOTOS }, () => ({ file: null, preview: '', status: 'idle' })))
    setModalOpen(true)
  }

  const assignPhoto = async (index, file) => {
    if (!file) return
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, file, preview: URL.createObjectURL(file), status: 'validating' } : s)))

    const formData = new FormData()
    formData.append('photo', file)

    try {
      await validateStudentPhoto(formData)
      setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'valid' } : s)))
    } catch {
      setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'invalid' } : s)))
    }
  }

  const submitAdditionalPhotos = async () => {
    const files = slots.filter((s) => s.file).map((s) => s.file)
    if (!selectedStudent) return
    if (files.length === 0) return toast.error('Select at least one photo')

    const formData = new FormData()
    files.forEach((f) => formData.append('photos[]', f))

    try {
      setSaving(true)
      const res = await api.post(`/students/${selectedStudent.id}/add-photos`, formData)
      toast.success(`Updated to ${res.data.photo_count} photos`)
      setModalOpen(false)
      loadStudents()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add photos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Loading students...</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Students</h1>
      <input className="w-full md:w-96 p-3 rounded-lg border" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((student) => (
          <StudentCard key={student.id} student={student} onDelete={onDelete} onAddPhotos={onAddPhotos} />
        ))}
      </div>

      {modalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-xl p-4 w-full max-w-2xl space-y-3">
            <h2 className="text-lg font-semibold">Add More Photos — {selectedStudent.name}</h2>
            <p className="text-sm text-amber-600">Add photos from different angles for better accuracy.</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {slots.map((slot, index) => (
                <label key={index} className="h-28 rounded border bg-slate-50 overflow-hidden cursor-pointer text-xs flex items-center justify-center">
                  {slot.preview ? (
                    <img src={slot.preview} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <span>Upload {index + 1}</span>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => assignPhoto(index, e.target.files?.[0])} />
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-600">
              {slots.filter((s) => s.status === 'valid').length} valid / {slots.filter((s) => s.status === 'invalid').length} invalid
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-3 py-2 rounded bg-slate-200">Cancel</button>
              <button onClick={submitAdditionalPhotos} disabled={saving} className="px-3 py-2 rounded bg-green-500 text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Photos'}
              </button>
            </div>
          </div>
        </div>
      )}
        {filtered.map((student) => <StudentCard key={student.id} student={student} onDelete={onDelete} />)}
      </div>
    </div>
  )
}
