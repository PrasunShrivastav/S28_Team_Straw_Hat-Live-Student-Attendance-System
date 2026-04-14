import { Plus, Trash2 } from 'lucide-react'

export default function StudentCard({ student, onDelete, onAddPhotos }) {
  const photoCount = student.photo_count || 1
  const badgeClass = photoCount >= 3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'

  return (
    <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
      <div className="relative">
        <img
          src={`http://localhost:5000/static/${student.photo_path}`}
          alt={student.name}
          className="h-44 w-full object-cover rounded-lg"
        />
        <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
          {photoCount} photo{photoCount > 1 ? 's' : ''}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{student.name}</h3>
      <p className="text-slate-500">Roll: {student.roll_number}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onAddPhotos(student)}
          className="flex items-center justify-center gap-2 bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600"
        >
          <Plus size={16} /> Add Photos
        </button>
        <button
          onClick={() => onDelete(student)}
          className="flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </div>
  )
}
