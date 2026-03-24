"use client"

interface TournamentPageHeaderProps {
  title: string
  subtitle?: string
}

export function TournamentPageHeader({ title, subtitle }: TournamentPageHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
      <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

      <div className="p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}