// Umgebungsvariablen-Validierung für Netlify

export function validateEnv() {
  const required = {
    // VAPID Keys für Push-Benachrichtigungen
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

    // Resend
    RESEND_API_KEY:
      process.env.RESEND_API_KEY ||
      process.env.GUEST_RESEND_API_KEY,
  }

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error("[v0] Fehlende Umgebungsvariablen:", missing.join(", "))
    console.error(
      "[v0] Bitte setze diese Variablen in .env.local bzw. in Netlify → Environment variables"
    )
    return false
  }

  return true
}

export const env = {
  vapid: {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  resend: {
    apiKey:
      process.env.RESEND_API_KEY ||
      process.env.GUEST_RESEND_API_KEY ||
      "",
    fromEmail:
      process.env.RESEND_FROM_EMAIL ||
      "EMD VereinsApp <noreply@emojisdartverein.com>",
  },
}