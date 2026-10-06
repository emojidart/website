import type { VisionHit } from "./scoring"

export type RecordedThrow = VisionHit & {
  id: string
  createdAt: number
  corrected?: boolean
  manual?: boolean
}

export type VisionGameState = {
  startScore: number
  doubleOut: boolean
  remaining: number
  turnStart: number
  currentTurn: RecordedThrow[]
  turns: RecordedThrow[][]
  finished: boolean
  bust: boolean
}

export function createGame(startScore = 501, doubleOut = true): VisionGameState {
  return {
    startScore,
    doubleOut,
    remaining: startScore,
    turnStart: startScore,
    currentTurn: [],
    turns: [],
    finished: false,
    bust: false,
  }
}

export function addThrow(
  state: VisionGameState,
  hit: VisionHit,
  flags: { corrected?: boolean; manual?: boolean } = {},
): VisionGameState {
  if (state.finished) return state

  const dart: RecordedThrow = {
    ...hit,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    corrected: flags.corrected,
    manual: flags.manual,
  }

  const currentTurn = [...state.currentTurn, dart]
  const tentative = state.remaining - dart.score
  const checkoutOk = tentative === 0 && (!state.doubleOut || dart.multiplier === 2)
  const bust = tentative < 0 || tentative === 1 || (tentative === 0 && !checkoutOk)

  if (bust) {
    return {
      ...state,
      remaining: state.turnStart,
      currentTurn: [],
      turns: [...state.turns, currentTurn],
      turnStart: state.turnStart,
      bust: true,
    }
  }

  if (checkoutOk) {
    return {
      ...state,
      remaining: 0,
      currentTurn: [],
      turns: [...state.turns, currentTurn],
      finished: true,
      bust: false,
    }
  }

  if (currentTurn.length >= 3) {
    return {
      ...state,
      remaining: tentative,
      currentTurn: [],
      turns: [...state.turns, currentTurn],
      turnStart: tentative,
      bust: false,
    }
  }

  return {
    ...state,
    remaining: tentative,
    currentTurn,
    bust: false,
  }
}

export function undoLastThrow(state: VisionGameState): VisionGameState {
  const history = [...state.turns.flat(), ...state.currentTurn]
  if (!history.length) return state

  const keep = history.slice(0, -1)
  let rebuilt = createGame(state.startScore, state.doubleOut)

  for (const dart of keep) {
    rebuilt = addThrow(rebuilt, dart, { corrected: dart.corrected, manual: dart.manual })
  }

  return rebuilt
}

export function replaceLastThrow(state: VisionGameState, hit: VisionHit): VisionGameState {
  return addThrow(undoLastThrow(state), hit, { corrected: true })
}

export function gameStats(state: VisionGameState) {
  const all = [...state.turns.flat(), ...state.currentTurn]
  const scored = all.reduce((sum, dart) => sum + dart.score, 0)
  const threeDartAverage = all.length ? (scored / all.length) * 3 : 0

  const turnScores = state.turns.map((turn) => turn.reduce((sum, dart) => sum + dart.score, 0))

  return {
    throws: all.length,
    scored,
    threeDartAverage,
    hundredPlus: turnScores.filter((score) => score >= 100).length,
    hundredFortyPlus: turnScores.filter((score) => score >= 140).length,
    maxes: turnScores.filter((score) => score === 180).length,
    doubles: all.filter((dart) => dart.multiplier === 2).length,
    triples: all.filter((dart) => dart.multiplier === 3).length,
  }
}
