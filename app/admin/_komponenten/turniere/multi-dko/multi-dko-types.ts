/** Multi-DKO: isolated types; existing single-DKO structures remain untouched. */
export type DkoDivision = 'open' | 'herren' | 'damen'
export type MachineAllocation = 'shared' | 'restricted'
export interface DivisionEntry {
  centralRegistrationId: string
  division: DkoDivision
}
export interface DkoLane {
  eventId: string
  division: DkoDivision
  label: string
  machineAllocation: MachineAllocation
  allowedMachineIds: string[]
}
export function partitionRegistrations<T extends { id: string }>(
  rows: T[], assignments: DivisionEntry[], division: DkoDivision
): T[] {
  const lookup = new Map(assignments.map(a => [a.centralRegistrationId, a.division]))
  return rows.filter(row => (lookup.get(row.id) ?? 'open') === division)
}
export function conflictsWithRunningMatch(machineId: string, occupiedMachineIds: ReadonlySet<string>): boolean {
  return occupiedMachineIds.has(machineId)
}
