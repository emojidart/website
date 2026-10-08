import { createHmac, timingSafeEqual } from "node:crypto"

export const COOKIE = "emd_face_lab_auth"
const lifespan = 8 * 60 * 60
function secret() { return process.env.EMD_FACE_LAB_SECRET || "" }
export function configured() { return secret().length >= 16 && (process.env.EMD_FACE_LAB_PASSWORD || "").length >= 12 }
function signature(time: string) { return createHmac("sha256", secret()).update("emd-face-lab:" + time).digest("hex") }
export function newToken() { const ts = Math.floor(Date.now()/1000).toString(); return `${ts}.${signature(ts)}` }
export function checkToken(token?: string) {
  if (!configured() || !token) return false
  const [ts, mac, extra] = token.split(".")
  if (!ts || !mac || extra || !/^\d+$/.test(ts) || !/^[a-f0-9]{64}$/.test(mac)) return false
  const age = Date.now()/1000 - Number(ts)
  if (age < 0 || age > lifespan) return false
  return timingSafeEqual(Buffer.from(mac,"hex"), Buffer.from(signature(ts),"hex"))
}
export function checkPassword(password: string) {
  const expected = process.env.EMD_FACE_LAB_PASSWORD || ""
  if (!configured()) return false
  const a = createHmac("sha256", secret()).update(password).digest()
  const b = createHmac("sha256", secret()).update(expected).digest()
  return timingSafeEqual(a,b)
}
