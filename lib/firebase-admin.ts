import admin from "firebase-admin"

function parseServiceAccountFromEnv(): any {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var")

  // Netlify: entweder direkt JSON oder Base64
  try {
    return JSON.parse(raw)
  } catch {
    const decoded = Buffer.from(raw, "base64").toString("utf8")
    return JSON.parse(decoded)
  }
}

export function getFirebaseAdmin() {
  if (admin.apps.length) return admin

  const serviceAccount = parseServiceAccountFromEnv()
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  return admin
}
