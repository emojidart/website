"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { MessageCircle } from "lucide-react"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export function MarketplaceUnreadBadge({
  compact = false,
}: {
  compact?: boolean
}) {
  const [userId, setUserId] = useState("")
  const [count, setCount] = useState(0)

  useEffect(() => {
    void loadCount()
  }, [])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`market-unread-badge-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dart_marketplace_messages",
        },
        () => void loadCount(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  async function loadCount() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setUserId("")
      setCount(0)
      return
    }

    setUserId(auth.user.id)

    const { data: conversations, error: conversationError } = await supabase
      .from("dart_marketplace_conversations")
      .select("id")
      .or(`buyer_id.eq.${auth.user.id},seller_id.eq.${auth.user.id}`)

    if (conversationError || !conversations?.length) {
      setCount(0)
      return
    }

    const ids = conversations.map((item) => item.id)
    const { count: unreadCount, error } = await supabase
      .from("dart_marketplace_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", ids)
      .neq("sender_id", auth.user.id)
      .is("read_at", null)

    if (!error) setCount(unreadCount || 0)
  }

  if (!userId) return null

  return (
    <Link
      href="/dartboerse/nachrichten"
      className={`relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700 ${
        compact ? "h-10 w-10" : "h-10 gap-2 px-3"
      }`}
      aria-label={`${count} ungelesene Dartbörsen-Nachrichten`}
    >
      <MessageCircle className="h-5 w-5" />
      {!compact ? <span>Nachrichten</span> : null}

      {count > 0 ? (
        <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1.5 text-[10px] font-black text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  )
}
