export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center px-4">
      <div className="rounded-[22px] border border-slate-200 bg-white px-7 py-6 text-center shadow-[0_18px_50px_-38px_rgba(15,23,42,.55)]">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
        <p className="mt-4 text-sm font-bold text-slate-600">Turnier wird geladen…</p>
      </div>
    </div>
  )
}
