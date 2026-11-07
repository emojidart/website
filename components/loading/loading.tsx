import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"
import "./loading.css"

/** Purely presentational: never owns a timer, request, input or loading condition. */
export function LoadingIndicator({ className, size, style, ...props }: HTMLAttributes<HTMLSpanElement> & { size?: number | string }) {
  return <span {...props} style={size ? { width: size, height: size, ...style } : style} className={cn("emd-loading-indicator", className)} aria-hidden="true"><i/><i/><i/></span>
}

export function InlineLoader({ label = "Wird aktualisiert…", className, ...props }: HTMLAttributes<HTMLSpanElement> & { label?: string }) {
  return <span {...props} className={cn("emd-inline-loader", className)} role="status" aria-live="polite"><LoadingIndicator/><span>{label}</span></span>
}

export function PageLoader({ label = "Inhalte werden geladen…", description = "Dein EMD wird vorbereitet.", fullPage = false, className }: { label?: string; description?: string; fullPage?: boolean; className?: string }) {
  return <div className={cn("emd-page-loader", fullPage && "emd-page-loader-full", className)} role="status" aria-live="polite" aria-busy="true">
    <div className="emd-page-loader-content"><span className="emd-loading-brand" aria-hidden="true">EMD<span>·</span></span><LoadingIndicator className="emd-loading-indicator-lg"/><p>{label}</p>{description && <span className="emd-page-loader-description">{description}</span>}</div>
  </div>
}

export function LoadingBlock({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("emd-skeleton", className)} aria-hidden="true"/>
}

export type SkeletonKind = "cards" | "table" | "profile" | "lineup" | "tournament" | "form"
export function SectionSkeleton({ kind = "cards", rows = 3, label = "Inhalte werden geladen…", className }: { kind?: SkeletonKind; rows?: number; label?: string; className?: string }) {
  const count = Math.min(8, Math.max(1, rows))
  return <div className={cn("emd-section-skeleton", `emd-section-skeleton-${kind}`, className)} role="status" aria-live="polite" aria-busy="true">
    <span className="emd-loading-sr">{label}</span>
    {kind === "profile" ? <div className="emd-skeleton-profile"><LoadingBlock className="emd-skeleton-avatar"/><div className="emd-skeleton-copy"><LoadingBlock className="emd-skeleton-title"/><LoadingBlock className="emd-skeleton-text"/><LoadingBlock className="emd-skeleton-text-short"/></div></div> : <LoadingBlock className="emd-skeleton-title"/>}
    <div className="emd-skeleton-items">{Array.from({length:count},(_,index)=><div key={index} className="emd-skeleton-item">
      {kind === "lineup" && <LoadingBlock className="emd-skeleton-avatar-small"/>}
      {kind === "tournament" && <LoadingBlock className="emd-skeleton-date"/>}
      <div className="emd-skeleton-copy"><LoadingBlock className="emd-skeleton-text"/><LoadingBlock className="emd-skeleton-text-short"/>{(kind === "cards" || kind === "form") && <LoadingBlock className="emd-skeleton-field"/>}</div>
      {kind === "table" && <><LoadingBlock className="emd-skeleton-cell"/><LoadingBlock className="emd-skeleton-cell"/></>}
    </div>)}</div>
  </div>
}

/** Both labels participate in layout, so changing loading never changes button width. */
export function ButtonLoader({ loading, label, children }: { loading: boolean; label?: ReactNode; children: ReactNode }) {
  return <span className="emd-button-loading-state" data-loading={loading ? "true" : "false"} role={loading ? "status" : undefined} aria-live={loading ? "polite" : undefined}>
    <span className="emd-button-idle" aria-hidden={loading}>{children}</span>
    <span className="emd-button-busy" aria-hidden={!loading}><LoadingIndicator/><span>{label ?? children}</span></span>
  </span>
}
