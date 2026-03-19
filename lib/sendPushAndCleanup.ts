import { getFirebaseAdmin } from "@/lib/firebase-admin"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendPushAndCleanup(tokens: string[], message: any) {
  const admin = getFirebaseAdmin()

  const cleanTokens = Array.from(new Set((tokens || []).filter(Boolean)))

  if (cleanTokens.length === 0) {
    return { success: 0, failed: 0 }
  }

  const res = await admin.messaging().sendEachForMulticast({
    tokens: cleanTokens,
    ...message,
  })

  const invalidTokens: string[] = []

  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code

      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(cleanTokens[i])
      }
    }
  })

  if (invalidTokens.length > 0) {
    console.log("[push] deleting invalid tokens:", invalidTokens.length)

    await supabase
      .from("fcm_tokens")
      .delete()
      .in("token", invalidTokens)
  }

  return {
    success: res.successCount,
    failed: res.failureCount,
  }
}