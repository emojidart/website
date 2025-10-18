import { Game } from "@/components/game"

export default function GamePage({ params }: { params: { id: string } }) {
  return <Game challengeId={params.id} />
}
