import type { ComponentProps } from "react"
import type { PlayerProfileCard } from "@/components/player-profile-card"

export function MemberPlayerCard({ player, rank, className = "" }: ComponentProps<typeof PlayerProfileCard>) {
  const winRate = player.total_matches_played > 0 ? ((player.total_matches_won / player.total_matches_played) * 100).toFixed(1) : "0.0"
  const difference = player.total_legs_won - player.total_legs_lost
  const stats = [
    ["Gesamtpunkte", player.total_points], ["Platzierungspunkte", player.placement_points],
    ["Bonuspunkte", player.bonus_points], ["Antritte", player.tournaments_played],
    ["Matches gespielt", player.total_matches_played], ["Matches gewonnen", player.total_matches_won],
    ["Matches verloren", player.total_matches_lost], ["Siegrate", `${winRate}%`],
    ["Legs gewonnen", player.total_legs_won], ["Legs verloren", player.total_legs_lost],
    ["Leg-Differenz", `${difference >= 0 ? "+" : ""}${difference}`],
  ]
  return <article className={`mp-player-card ${className}`}>
    <div className="mp-player-identity">{player.profile_picture_url ? <img src={player.profile_picture_url} alt={`Profilbild von ${player.player_name}`}/> : <span className="mp-player-avatar" aria-hidden="true">{player.player_name.charAt(0).toUpperCase()}</span>}<div><h2>{player.player_name}</h2><p>Rang {rank} in der Gesamtwertung</p></div></div>
    <dl className="mp-player-stats">{stats.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className={`mt-4 rounded-xl border p-4 text-sm ${player.tournaments_played >= 20 ? "border-emerald-400/30 text-emerald-200" : "border-border text-muted-foreground"}`}>
      <strong>{player.tournaments_played >= 20 ? "Für Finale qualifiziert" : "Nicht qualifiziert"}</strong>
      {player.tournaments_played < 20 && <p className="mt-1">Noch {20 - player.tournaments_played} Antritte benötigt</p>}
    </div>
  </article>
}
