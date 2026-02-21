import SheetScanDemo from "@/components/SheetScanDemo"

export default function Page() {
  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Statistikblatt scannen (Auto-ROI + Checkbox count)</h1>
      <p style={{ marginTop: 6, color: "#444" }}>
        Foto hochladen → (optional) Marker → Blatt geradeziehen → Kästchenblock automatisch finden → Kreuze zählen (ohne KI).
      </p>
      <div style={{ marginTop: 16 }}>
        <SheetScanDemo />
      </div>
    </div>
  )
}