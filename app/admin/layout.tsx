import type React from "react"
import "./admin.css"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="emd-admin-shell">
      <div className="emd-admin-shell__background" aria-hidden="true" />
      <div className="emd-admin-shell__content">{children}</div>
    </div>
  )
}
