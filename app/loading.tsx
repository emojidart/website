import { SectionSkeleton } from "@/components/loading/loading"

export default function Loading() {
  return <div className="emd-route-loading"><SectionSkeleton kind="cards" label="Inhalte werden geladen…" /></div>
}
