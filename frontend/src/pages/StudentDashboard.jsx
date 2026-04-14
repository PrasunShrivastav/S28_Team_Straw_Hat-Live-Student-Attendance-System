export default function StudentDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-lg w-full">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          Student Dashboard
        </h1>
        <p className="text-slate-600 mb-8">
          Welcome to your student portal. You have been successfully registered into the Attendance System. Let your teacher securely track your attendance through face recognition!
        </p>
        
        <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center justify-center gap-2">
          <span>✅</span> Registration Completed
        </div>
      </div>
    </div>
  )
}
