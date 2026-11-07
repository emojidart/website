"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { Suspense } from "react"
import SurvivalTvBoard from "@/components/survival/survival-tv-board"
export default function Page(){return <Suspense fallback={<SectionSkeleton kind="tournament" label="Bereich wird geladen…" />}><SurvivalTvBoard mode="single" /></Suspense>}
