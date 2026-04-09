import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  className?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4',
      className
    )}>
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
      )}
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}
