import { Game } from "@/components/game"

type Props = {
  params: Promise<{ id: string }>
}

export default async function GamePage({ params }: Props) {
  const { id } = await params

  return <Game challengeId={id} />
}