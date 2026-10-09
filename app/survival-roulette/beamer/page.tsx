"use client"
import { Suspense } from "react"
import SurvivalTvBoard from "@/components/survival/survival-tv-board"
export default function Page(){return <Suspense fallback={<div className="grid h-screen place-items-center bg-[#090b0e] text-white">Beamer wird geladen …</div>}><SurvivalTvBoard mode="double" /></Suspense>}
