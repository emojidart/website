import { SectionSkeleton } from "@/components/loading/loading"

export default function Loading() {
  return <div className="emd-route-loading"><SectionSkeleton kind="profile" label="Spieler werden geladen…" /></div>
}
