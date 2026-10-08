import { cookies } from "next/headers"
import { checkToken, configured, COOKIE } from "@/lib/face-labor-auth"
import FaceLab from "./FaceLab"
export const dynamic = "force-dynamic"
export default async function Page() {
  const cookie = (await cookies()).get(COOKIE)?.value
  return <FaceLab access={checkToken(cookie)} enabled={configured()} />
}
