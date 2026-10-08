import { NextResponse } from "next/server"
import { COOKIE } from "@/lib/face-labor-auth"
export async function POST() { const r=NextResponse.json({ok:true}); r.cookies.set(COOKIE,"",{path:"/",maxAge:0,httpOnly:true}); return r }
