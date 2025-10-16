"use server"

import { generateText } from "ai"

export interface DartAnalysisResult {
  success: boolean
  score: number
  multiplier: "Single" | "Double" | "Triple" | "Bull" | "Bullseye"
  segment: number
  confidence: number
  message?: string
}

export async function analyzeDartImage(imageDataUrl: string): Promise<DartAnalysisResult> {
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageDataUrl,
            },
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
- Confidence sollte deine Sicherheit der Erkennung widerspiegeln (0.0 - 1.0)

Antworte NUR mit dem JSON, ohne zusätzlichen Text!`,
            },
          ],
        },
      ],
    })

    console.log("[v0] AI Response:", text)

    // Parse AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        score: 0,
        multiplier: "Single",
        segment: 0,
        confidence: 0,
        message: "Konnte keine Dartscheibe oder Pfeil erkennen",
      }
    }

    const result = JSON.parse(jsonMatch[0]) as DartAnalysisResult

    // Calculate final score based on multiplier
    let finalScore = result.score
    if (result.multiplier === "Double") {
      finalScore = result.score * 2
    } else if (result.multiplier === "Triple") {
      finalScore = result.score * 3
    }

    return {
      ...result,
      score: finalScore,
    }
  } catch (error) {
    console.error("[v0] Error analyzing dart image:", error)
    return {
      success: false,
      score: 0,
      multiplier: "Single",
      segment: 0,
      confidence: 0,
      message: "Fehler bei der Analyse. Bitte versuche es erneut.",
    }
  }
}
