"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  BadgeEuro,
  Check,
  HandCoins,
  Loader2,
  RotateCcw,
  Send,
  Tag,
  UserRound,
  X,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Message = {
  id: string
  sender_id: string
  message: string
  read_at: string | null
  created_at: string
}

type OfferStatus = "pending" | "accepted" | "rejected" | "countered" | "withdrawn"

type Offer = {
  id: string
  conversation_id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_by: string
  amount: number
  currency: string
  status: OfferStatus
  parent_offer_id: string | null
  created_at: string
  responded_at: string | null
}

type Conversation = {
  id: string
  buyer_id: string
  seller_id: string
  buyer_name: string | null
  seller_name: string | null
  listing: {
    id: string
    title: string
    status: string
    price: number | null
    price_type: string
  } | null
}

const offerStatus: Record<OfferStatus, { label: string; className: string }> = {
  pending: { label: "Offen", className: "bg-amber-100 text-amber-800" },
  accepted: { label: "Angenommen", className: "bg-green-100 text-green-800" },
  rejected: { label: "Abgelehnt", className: "bg-red-100 text-red-800" },
  countered: { label: "Gegenangebot", className: "bg-blue-100 text-blue-800" },
  withdrawn: { label: "Zurückgezogen", className: "bg-slate-200 text-slate-700" },
}

function money(value: number | null | undefined) {
  if (typeof value !== "number") return "Preis auf Anfrage"
  return value.toLocaleString("de-AT", { style: "currency", currency: "EUR" })
}

export default function UnterhaltungPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const [userId, setUserId] = useState("")
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [text, setText] = useState("")
  const [offerAmount, setOfferAmount] = useState("")
  const [counterFor, setCounterFor] = useState<Offer | null>(null)
  const [offerOpen, setOfferOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [savingOffer, setSavingOffer] = useState(false)
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const isBuyer = conversation?.buyer_id === userId
  const counterpartName = conversation
    ? isBuyer
      ? conversation.seller_name || "Verkäufer"
      : conversation.buyer_name || "Interessent"
    : ""
  const ownName = conversation
    ? isBuyer
      ? conversation.buyer_name || "Du"
      : conversation.seller_name || "Du"
    : "Du"
  const canTrade = conversation?.listing?.status !== "sold"

  const feed = useMemo(() => {
    const rows: Array<
      | { type: "message"; date: string; item: Message }
      | { type: "offer"; date: string; item: Offer }
    > = [
      ...messages.map((item) => ({ type: "message" as const, date: item.created_at, item })),
      ...offers.map((item) => ({ type: "offer" as const, date: item.created_at, item })),
    ]
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [messages, offers])

  useEffect(() => {
    void load()
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [feed.length])

  useEffect(() => {
    if (!loading && searchParams.get("offer") === "1") {
      setOfferOpen(true)
    }
  }, [loading, searchParams])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`market-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dart_marketplace_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const next = payload.new as Message
          setMessages((old) => (old.some((m) => m.id === next.id) ? old : [...old, next]))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dart_marketplace_offers",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => void loadOffers(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId])

  async function loadOffers() {
    const { data, error } = await supabase
      .from("dart_marketplace_offers")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at")

    if (error) setError(error.message)
    else setOffers((data || []) as Offer[])
  }

  async function load() {
    setLoading(true)
    setError("")

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      router.push("/guest-login")
      return
    }

    setUserId(auth.user.id)

    const { data: c, error: cError } = await supabase
      .from("dart_marketplace_conversations")
      .select(
        "id,buyer_id,seller_id,buyer_name,seller_name,listing:dart_marketplace_listings(id,title,status,price,price_type)",
      )
      .eq("id", conversationId)
      .maybeSingle()

    if (cError || !c) {
      setError(cError?.message || "Unterhaltung nicht gefunden.")
      setLoading(false)
      return
    }

    setConversation(c as unknown as Conversation)

    const { data: m, error: mError } = await supabase
      .from("dart_marketplace_messages")
      .select("id,sender_id,message,read_at,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at")

    if (mError) setError(mError.message)
    setMessages((m || []) as Message[])
    await loadOffers()

    await supabase
      .from("dart_marketplace_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", auth.user.id)
      .is("read_at", null)

    setLoading(false)
  }

  async function send() {
    const value = text.trim()
    if (!value || !userId) return

    setSending(true)
    setError("")

    const { error } = await supabase.from("dart_marketplace_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      message: value,
    })

    if (error) setError(error.message)
    else setText("")

    setSending(false)
  }

  function openOffer(parent?: Offer) {
    setCounterFor(parent || null)
    setOfferAmount(parent ? String(parent.amount) : "")
    setOfferOpen(true)
  }

  async function submitOffer() {
    const amount = Number(offerAmount.replace(",", "."))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Bitte einen gültigen Betrag eingeben.")
      return
    }

    setSavingOffer(true)
    setError("")

    const { error } = await supabase.rpc("create_marketplace_offer", {
      p_conversation_id: conversationId,
      p_amount: amount,
      p_parent_offer_id: counterFor?.id || null,
    })

    if (error) setError(error.message)
    else {
      setOfferOpen(false)
      setCounterFor(null)
      setOfferAmount("")
      await loadOffers()
    }

    setSavingOffer(false)
  }

  async function respondToOffer(offer: Offer, action: "accept" | "reject" | "withdraw") {
    setBusyOfferId(offer.id)
    setError("")

    const { error } = await supabase.rpc("respond_marketplace_offer", {
      p_offer_id: offer.id,
      p_action: action,
    })

    if (error) setError(error.message)
    else {
      await loadOffers()
      if (action === "accept") {
        setConversation((old) =>
          old?.listing ? { ...old, listing: { ...old.listing, status: "reserved" } } : old,
        )
      }
    }

    setBusyOfferId(null)
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] pb-24">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-20">
        <Button asChild variant="outline" className="mb-4 rounded-xl">
          <Link href="/dartboerse/nachrichten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nachrichten
          </Link>
        </Button>

        <div className="overflow-hidden rounded-[28px] border border border-slate-200 bg-white shadow-none">
          <div className="border-b bg-slate-950 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase text-orange-300">
                  Unterhaltung zum Angebot
                </div>
                <h1 className="mt-1 truncate text-xl font-black">
                  {conversation?.listing?.title || "Dartbörse"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-bold text-white">
                    <UserRound className="h-3.5 w-3.5" />
                    Unterhaltung mit {counterpartName || "Nutzer"}
                  </span>
                  <span>{isBuyer ? "Du bist Käufer" : "Du bist Verkäufer"}</span>
                  {conversation?.listing?.price != null ? (
                    <span>· Inserat: {money(conversation.listing.price)}</span>
                  ) : null}
                  {conversation?.listing?.status === "reserved" ? (
                    <span className="rounded-full bg-amber-500 px-2 py-1 font-black text-white">
                      RESERVIERT
                    </span>
                  ) : null}
                </div>
              </div>

              {canTrade ? (
                <Button
                  type="button"
                  onClick={() => openOffer()}
                  className="shrink-0 rounded-xl bg-orange-500 hover:bg-orange-600"
                >
                  <HandCoins className="mr-2 h-4 w-4" />
                  Preis anbieten
                </Button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <>
              <div className="h-[55vh] space-y-3 overflow-y-auto bg-[#f5f6f8] p-4 sm:p-6">
                {feed.length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-500">
                    Schreibe eine Nachricht oder gib direkt ein Preisangebot ab.
                  </div>
                ) : null}

                {feed.map((row) => {
                  if (row.type === "message") {
                    const message = row.item
                    const own = message.sender_id === userId
                    return (
                      <div key={`m-${message.id}`} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-[18px] px-4 py-3 text-sm shadow-sm ${
                            own
                              ? "rounded-br-md bg-orange-500 text-white"
                              : "rounded-bl-md border bg-white text-slate-800"
                          }`}
                        >
                          <div
                            className={`mb-1 text-[11px] font-black ${
                              own ? "text-orange-100" : "text-slate-500"
                            }`}
                          >
                            {own ? "Du" : counterpartName || "Nutzer"}
                          </div>
                          <p className="whitespace-pre-wrap break-words">{message.message}</p>
                          <div className={`mt-1 text-[10px] ${own ? "text-orange-100" : "text-slate-400"}`}>
                            {new Date(message.created_at).toLocaleString("de-AT")}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  const offer = row.item
                  const own = offer.created_by === userId
                  const canAnswer = offer.status === "pending" && !own
                  const canWithdraw = offer.status === "pending" && own
                  const cfg = offerStatus[offer.status]

                  return (
                    <div key={`o-${offer.id}`} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className="w-full max-w-md overflow-hidden rounded-[18px] border border-orange-200 border border-slate-200 bg-white shadow-none">
                        <div className="flex items-center justify-between gap-3 bg-orange-50 px-4 py-3">
                          <div className="flex items-center gap-2 font-black text-orange-900">
                            <BadgeEuro className="h-5 w-5" />
                            {offer.parent_offer_id ? "Gegenangebot" : "Preisangebot"}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </div>

                        <div className="p-4">
                          <div className="text-xs font-bold uppercase text-slate-500">
                            {own
                              ? `${ownName} bietet`
                              : `${counterpartName || "Nutzer"} bietet dir`}
                          </div>
                          <div className="mt-1 text-3xl font-black text-slate-950">{money(Number(offer.amount))}</div>
                          <div className="mt-2 text-xs text-slate-400">
                            {new Date(offer.created_at).toLocaleString("de-AT")}
                          </div>

                          {canAnswer ? (
                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <Button
                                size="sm"
                                disabled={busyOfferId === offer.id}
                                onClick={() => void respondToOffer(offer, "accept")}
                                className="rounded-xl bg-green-600 hover:bg-green-700"
                              >
                                <Check className="mr-1 h-4 w-4" />
                                Annehmen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyOfferId === offer.id}
                                onClick={() => openOffer(offer)}
                                className="rounded-xl"
                              >
                                <RotateCcw className="mr-1 h-4 w-4" />
                                Gegenangebot
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyOfferId === offer.id}
                                onClick={() => void respondToOffer(offer, "reject")}
                                className="rounded-xl border-red-200 text-red-700"
                              >
                                <X className="mr-1 h-4 w-4" />
                                Ablehnen
                              </Button>
                            </div>
                          ) : null}

                          {canWithdraw ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyOfferId === offer.id}
                              onClick={() => void respondToOffer(offer, "withdraw")}
                              className="mt-3 rounded-xl text-red-600"
                            >
                              Angebot zurückziehen
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="border-t p-4">
                {offerOpen ? (
                  <div className="mb-4 rounded-[18px] border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-900">
                          {counterFor ? "Gegenangebot senden" : "Preis anbieten"}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Nach der Annahme wird das Inserat automatisch reserviert.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOfferOpen(false)}
                        className="rounded-full p-2 hover:bg-white"
                        aria-label="Preisangebot schließen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          inputMode="decimal"
                          placeholder="z. B. 45,00"
                          className="h-11 rounded-xl bg-white pl-9"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => void submitOffer()}
                        disabled={savingOffer || !offerAmount.trim()}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600"
                      >
                        {savingOffer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandCoins className="mr-2 h-4 w-4" />}
                        Senden
                      </Button>
                    </div>
                  </div>
                ) : null}

                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  placeholder="Nachricht schreiben …"
                  className="min-h-[90px] rounded-[18px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                />

                {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openOffer()}
                    disabled={!canTrade}
                    className="rounded-xl"
                  >
                    <HandCoins className="mr-2 h-4 w-4" />
                    Preis anbieten
                  </Button>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{text.length}/2000</span>
                    <Button
                      onClick={() => void send()}
                      disabled={sending || !text.trim()}
                      className="rounded-xl bg-orange-500 hover:bg-orange-600"
                    >
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Senden
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
