export default function AttendanceBadge({ status }) {
  const styles = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    unknown: 'bg-amber-100 text-amber-700',
  }

  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>
}
