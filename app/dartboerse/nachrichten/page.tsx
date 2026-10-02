"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";

import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  buyer_name: string | null;
  seller_name: string | null;
  updated_at: string;
  listing: {
    id: string;
    title: string;
    seller_name: string;
    status: string;
  } | null;
  messages: {
    message: string;
    created_at: string;
    sender_id: string;
    read_at: string | null;
  }[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function NachrichtenPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`market-inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dart_marketplace_messages",
        },
        () => void load(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dart_marketplace_offers",
        },
        () => void load(false),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function load(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/guest-login");
      return;
    }

    setUserId(auth.user.id);

    const { data, error } = await supabase
      .from("dart_marketplace_conversations")
      .select(
        `id,buyer_id,seller_id,buyer_name,seller_name,updated_at,
         listing:dart_marketplace_listings(id,title,seller_name,status),
         messages:dart_marketplace_messages(message,created_at,sender_id,read_at)`,
      )
      .or(`buyer_id.eq.${auth.user.id},seller_id.eq.${auth.user.id}`)
      .order("updated_at", { ascending: false });

    if (error) setError(error.message);
    setItems((data || []) as unknown as Conversation[]);
    setLoading(false);
  }

  const prepared = useMemo(() => {
    return items.map((item) => {
      const messages = [...(item.messages || [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      );
      const last = messages[0];
      const unread = messages.filter(
        (message) => message.sender_id !== userId && !message.read_at,
      ).length;

      const otherName =
        item.buyer_id === userId
          ? item.seller_name || item.listing?.seller_name || "Verkäufer"
          : item.buyer_name || "Interessent";

      return { item, messages, last, unread, otherName };
    });
  }, [items, userId]);

  const totalUnread = useMemo(
    () => prepared.reduce((sum, row) => sum + row.unread, 0),
    [prepared],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prepared.filter(({ item, otherName, last }) => {
      if (!q) return true;
      return `${item.listing?.title || ""} ${otherName} ${last?.message || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [prepared, query]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.28]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.78),rgba(3,5,9,.95)_48%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_16%,rgba(249,115,22,.16),transparent_28%),radial-gradient(circle_at_90%_28%,rgba(14,165,233,.10),transparent_26%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-24 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8">
        <Button asChild variant="outline" className="mb-4 h-11 rounded-2xl border-white/10 bg-white/[0.045] px-4 text-white/65 hover:bg-white/[0.06]/[0.09] hover:text-white">
          <Link href="/dartboerse">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zur Dartbörse
          </Link>
        </Button>

        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#0b0f15]/92 p-4 text-white shadow-[0_28px_90px_-50px_rgba(0,0,0,.98)] backdrop-blur-xl sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-orange-300">
                Dartbörse
              </div>
              <h1 className="mt-1 text-3xl font-black">Meine Nachrichten</h1>
              <p className="mt-2 text-white/42">
                Fragen, Preisangebote und Gegenangebote direkt klären.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="relative">
                <MessageCircle className="h-7 w-7 text-orange-300" />
                {totalUnread > 0 ? (
                  <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500/[0.08]0 px-1.5 text-[10px] font-black text-white ring-2 ring-slate-900">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                ) : null}
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-white/42">
                  Neue Nachrichten
                </div>
                <div className="text-xl font-black">{totalUnread}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, Angebot oder Nachricht suchen …"
            className="h-12 rounded-[18px] border-[#2a323d] bg-[#0d1117] pl-11 text-white placeholder:text-white/22 shadow-none focus:border-orange-400/40 focus:ring-2 focus:ring-orange-400/10"
          />
        </div>

        {error ? (
          <div className="mt-5 rounded-[18px] border border-rose-300/20 bg-rose-500/10 p-4 font-bold text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-orange-300" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="mt-5 rounded-[24px] border border-white/[0.08] bg-[#0b0f15]/92 shadow-[0_20px_70px_-52px_rgba(0,0,0,.95)]">
            <CardContent className="p-12 text-center">
              <Inbox className="mx-auto h-12 w-12 text-white/42" />
              <h2 className="mt-4 text-xl font-black">
                {query ? "Keine passende Unterhaltung" : "Noch keine Nachrichten"}
              </h2>
              <p className="mt-2 text-sm text-white/38">
                {query
                  ? "Ändere den Suchbegriff."
                  : "Öffne ein Inserat und nutze „Direktnachricht senden“."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-5 space-y-3">
            {filtered.map(({ item, last, unread, otherName }) => (
              <Link
                key={item.id}
                href={`/dartboerse/nachrichten/${item.id}`}
                className={`block rounded-[22px] border bg-[#10141b] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[#121821] ${
                  unread > 0
                    ? "border-orange-300 ring-2 ring-orange-300/15"
                    : "border-white/[0.08]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black ${
                      unread > 0
                        ? "bg-orange-500/[0.08]0 text-white"
                        : "bg-white/[0.05] text-white/38"
                    }`}
                  >
                    {initials(otherName) || <UserRound className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-black text-white">
                          {otherName}
                        </div>
                        <div className="truncate text-sm font-bold text-white/38">
                          {item.listing?.title || "Gelöschtes Angebot"}
                        </div>
                      </div>

                      {unread > 0 ? (
                        <span className="shrink-0 rounded-full bg-orange-500/[0.08]0 px-2.5 py-1 text-xs font-black text-white">
                          {unread > 99 ? "99+" : unread} neu
                        </span>
                      ) : (
                        <Mail className="h-5 w-5 shrink-0 text-white/42" />
                      )}
                    </div>

                    <div
                      className={`mt-2 line-clamp-2 text-sm ${
                        unread > 0
                          ? "font-semibold text-white"
                          : "text-white/50"
                      }`}
                    >
                      {last
                        ? `${last.sender_id === userId ? "Du: " : ""}${last.message}`
                        : "Unterhaltung wurde gestartet."}
                    </div>

                    <div className="mt-2 text-xs font-bold text-white/28">
                      {last
                        ? new Date(last.created_at).toLocaleString("de-AT")
                        : ""}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
