type RegistrationLike = {
  player_id: string | number | null | undefined
  player_name: string
}

const DOUBLE_SUFFIX_REGEX = /\s\[(\d+)\]$/

export function formatShortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]

  const firstName = parts[0]
  const lastNameInitial = parts[parts.length - 1].charAt(0).toUpperCase()

  return `${firstName} ${lastNameInitial}.`
}

export function buildDoubleTeamName(playerName1: string, playerName2: string) {
  const short1 = formatShortName(playerName1)
  const short2 = formatShortName(playerName2)

  return `${short1} / ${short2}`
}

export function stripDoubleSuffix(name: string) {
  return (name || "").replace(DOUBLE_SUFFIX_REGEX, "").trim()
}

export function getBasePlayerId(playerId: string | number | null | undefined) {
  return String(playerId ?? "").trim()
}

export function isDoubleEntryName(name: string) {
  return DOUBLE_SUFFIX_REGEX.test(name || "")
}

export function getNextDoubleEntryData(
  playerId: number | string,
  playerName: string,
  registrations: RegistrationLike[],
) {
  const baseId = String(playerId)
  const baseName = stripDoubleSuffix(playerName)

  const relatedEntries = registrations.filter((registration) => {
    const registrationBaseId = getBasePlayerId(registration.player_id)
    const registrationBaseName = stripDoubleSuffix(registration.player_name)

    return registrationBaseId === baseId || registrationBaseName === baseName
  })

  const existingNumbers = relatedEntries.map((registration) => {
    const match = registration.player_name.match(DOUBLE_SUFFIX_REGEX)
    return match ? Number(match[1]) : 1
  })

  const nextNumber =
    existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2

  return {
    syntheticPlayerId: crypto.randomUUID(),
    syntheticPlayerName: `${baseName} [${nextNumber}]`,
    entryNumber: nextNumber,
  }
}
