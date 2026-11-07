"use client"

import { Children, useEffect, useId, useState, type ReactNode } from "react"
import { LayoutGrid, Trophy, FileText, Settings } from "lucide-react"

const tabs = [
  { id: "overview", label: "Übersicht", icon: LayoutGrid },
  { id: "sport", label: "Sport", icon: Trophy },
  { id: "documents", label: "Dokumente", icon: FileText },
  { id: "account", label: "Konto", icon: Settings },
] as const

export function MemberWorkspace({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string>("overview")
  const id = useId()
  useEffect(() => {
    const navigate = () => {
      if (location.hash === "#vereinsunterlagen") setActive("documents")
      const target = location.hash.replace("#profil-", "")
      if (tabs.some(tab => tab.id === target)) setActive(target)
    }
    navigate()
    window.addEventListener("hashchange", navigate)
    return () => window.removeEventListener("hashchange", navigate)
  }, [])
  const panels = Children.toArray(children)
  return <div className="mp-workspace">
    <div className="mp-tabs" role="tablist" aria-label="Mein Profil">{tabs.map((tab,index) => <button key={tab.id} id={`${id}-tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`${id}-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} onClick={() => setActive(tab.id)} onKeyDown={event => {
      let next = index
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length
      else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length
      else if (event.key === "Home") next = 0
      else if (event.key === "End") next = tabs.length - 1
      else return
      event.preventDefault()
      setActive(tabs[next].id)
      document.getElementById(`${id}-tab-${tabs[next].id}`)?.focus()
    }}><tab.icon size={18}/>{tab.label}</button>)}</div>
    {tabs.map((tab,index) => <div className="mp-panel" key={tab.id} id={`${id}-panel-${tab.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab.id}`} tabIndex={0} hidden={active !== tab.id}>{panels[index]}</div>)}
  </div>
}
