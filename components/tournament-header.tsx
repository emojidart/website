import { Target } from "lucide-react"
import Link from "next/link"

interface TournamentHeaderProps {
  currentPot: number
}

export function TournamentHeader({ currentPot }: TournamentHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 md:p-6 bg-light-card text-light-text shadow-lg border-b border-light-border">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Target className="h-8 w-8 text-gold-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight text-gold-primary">Dart League Stats</h1>
        </Link>
        <p className="pot-display bg-light-card border border-light-border rounded-lg shadow-md p-3 text-xl font-semibold text-light-text flex items-center gap-2">
          Aktueller Pot: <span className="text-gold-primary text-2xl font-extrabold">{currentPot.toFixed(2)}</span> €
        </p>
      </div>
      {/* Admin Login Button entfernt, da er später hinzugefügt wird */}
    </header>
  )
}
