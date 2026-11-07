"use client"

interface TournamentPageHeaderProps {
  title: string
  subtitle?: string
}

export function TournamentPageHeader({ title, subtitle }: TournamentPageHeaderProps) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-6">
      <div className="text-foreground h-2 bg-card  " />

      <div className="p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}