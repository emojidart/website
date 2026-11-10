import { PageLoader } from "@/components/loading/loading"

export default function TerminalLoader({ label = "Bereich wird geöffnet" }: { label?: string }) {
  return <PageLoader label={label} fullPage />
}
