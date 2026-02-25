"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export interface DartAnalysisResult {
  success: boolean
  score: number
  multiplier: "Single" | "Double" | "Triple" | "Bull" | "Bullseye"
  segment: number
  confidence: number
  message?: string
}

const FALLBACK: DartAnalysisResult = {
  success: false,
  score: 0,
  multiplier: "Single",
  segment: 0,
  confidence: 0,
  message: "Konnte keine Dartscheibe oder keinen Pfeil erkennen",
}

function safeJsonParse(text: string): any | null {
  // versucht das erste JSON-Objekt zu extrahieren
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export async function analyzeDartImage(imageDataUrl: string): Promise<DartAnalysisResult> {
  try {
    // Basic input guard
    if (!imageDataUrl?.startsWith("data:image/")) {
      return { ...FALLBACK, message: "Ungültiges Bildformat (DataURL erwartet)" }
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: imageDataUrl },
            {
              type: "text",
              text: `Analysiere dieses Bild einer Dartscheibe und erkenne wo der Pfeil gelandet ist.

WICHTIG: Antworte NUR mit einem JSON-Objekt in diesem exakten Format:
{
  "success": true/false,
  "score": Zahl (1-20 für Segment, 25 für Bull, 50 für Bullseye),
  "multiplier": "Single" oder "Double" oder "Triple" oder "Bull" oder "Bullseye",
  "segment": Segment-Nummer (1-20, oder 25 für Bull/Bullseye),
  "confidence": Zahl zwischen 0 und 1,
  "message": "Beschreibung was du siehst"
}

Regeln:
- Wenn du eine Dartscheibe siehst und einen Pfeil erkennst, setze success: true
- Wenn keine Dartscheibe oder kein Pfeil sichtbar ist, setze success: false
- Double = äußerer Ring, Triple = innerer Ring
- Bull = grüner Ring in der Mitte (25 Punkte)
- Bullseye = rotes Zentrum (50 Punkte)
- Confidence sollte deine Sicherheit widerspiegeln (0.0 - 1.0)

Antworte NUR mit dem JSON, ohne zusätzlichen Text!`,
            },
          ],
        },
      ],
    })

    const parsed = safeJsonParse(text)
    if (!parsed) return FALLBACK

    // Normalize + validate
    const success = !!parsed.success
    const multiplier = parsed.multiplier as DartAnalysisResult["multiplier"]
    const segment = Number(parsed.segment ?? 0)
    const baseScore = Number(parsed.score ?? 0)
    const confidence = clamp01(Number(parsed.confidence ?? 0))
    const message = typeof parsed.message === "string" ? parsed.message : undefined

    if (!success) {
      return {
        ...FALLBACK,
        confidence,
        message: message || FALLBACK.message,
      }
    }

    // Score calc
    let finalScore = baseScore
    if (multiplier === "Double") finalScore = baseScore * 2
    if (multiplier === "Triple") finalScore = baseScore * 3

    return {
      success: true,
      score: finalScore,
      multiplier,
      segment,
      confidence,
      message,
    }
  } catch (error) {
    console.error("Error analyzing dart image:", error)
    return {
      ...FALLBACK,
      message: "Fehler bei der Analyse. Bitte versuche es erneut.",
    }
  }
}