import type { ReactNode } from "react"
import { MemberSurface } from "@/components/members/member-surface"
export default function Layout({ children }: { children: ReactNode }) { return <MemberSurface>{children}</MemberSurface> }
