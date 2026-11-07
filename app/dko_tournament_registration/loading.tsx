import { SectionSkeleton } from "@/components/loading/loading"

export default function Loading() {
  return <div className="emd-route-loading"><SectionSkeleton kind="tournament" label="Turnier wird geladen…" /></div>
}
