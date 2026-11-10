"use client"

import { Children, isValidElement, useId, type ReactNode } from "react"

/** Navigation keeps every match mounted, preserving score entry and live subscriptions. */
export function BracketRounds({ children, className = "" }: { children: ReactNode; className?: string }) {
  const id = useId()
  const rounds = Children.toArray(children)
  const labels = rounds.map((round, index) => {
    if (isValidElement<{ children?: ReactNode }>(round)) {
      const heading = Children.toArray(round.props.children).find(child => isValidElement(child) && child.type === "h2")
      if (isValidElement<{ children?: ReactNode }>(heading) && typeof heading.props.children === "string") return heading.props.children
    }
    return `Abschnitt ${index + 1}`
  })
  return <>
    <nav className="et-round-nav" aria-label="Turnierrunden">
      <label htmlFor={`${id}-select`}>Zur Runde springen
        <select id={`${id}-select`} defaultValue="" onChange={event => {
          const target = document.getElementById(event.target.value)
          target?.scrollIntoView({ behavior: "instant", block: "start" })
          target?.focus({ preventScroll: true })
          event.target.value = ""
        }}>
          <option value="" disabled>Runde auswählen…</option>
          {labels.map((label, index) => <option key={index} value={`${id}-${index}`}>{label}</option>)}
        </select>
      </label>
    </nav>
    <div className={className}>{rounds.map((round,index) => {
      const gridSpan = isValidElement<{ className?: string }>(round)
        ? (round.props.className || "").split(/\s+/).filter(token => /^(?:[\w-]+:)?col-span-/.test(token)).join(" ")
        : ""
      return <section className={`et-round min-w-0 ${gridSpan}`} id={`${id}-${index}`} key={isValidElement(round) ? round.key ?? index : index} tabIndex={-1} aria-label={labels[index]}>{round}</section>
    })}</div>
  </>
}
