import admin from "firebase-admin"
import fs from "fs"
import path from "path"

function loadServiceAccount() {
  const p = path.join(
    process.cwd(),
    "lib",
    "emd-vereinsapp-firebase-adminsdk-fbsvc-6bf4e9d1d8.json"
  )

  if (!fs.existsSync(p)) {
    throw new Error(`[firebase-admin] JSON not found at: ${p}`)
  }

  const raw = fs.readFileSync(p, "utf8")
  return JSON.parse(raw)
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount()

  admin.initializeApp({
    credential: admin.credential.cert(
      serviceAccount as admin.ServiceAccount
    ),
  })
}

export const firebaseAdmin = admin
