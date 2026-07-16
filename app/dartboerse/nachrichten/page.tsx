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
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header />

      <main className="mx-auto max-w-4xl px-4 pt-20">
        <Button asChild variant="outline" className="mb-4 rounded-xl">
          <Link href="/dartboerse">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zur Dartbörse
          </Link>
        </Button>

        <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-orange-300">
                Dartbörse
              </div>
              <h1 className="mt-1 text-3xl font-black">Meine Nachrichten</h1>
              <p className="mt-2 text-slate-300">
                Fragen, Preisangebote und Gegenangebote direkt klären.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="relative">
                <MessageCircle className="h-7 w-7 text-orange-300" />
                {totalUnread > 0 ? (
                  <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-black text-white ring-2 ring-slate-900">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                ) : null}
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-slate-300">
                  Neue Nachrichten
                </div>
                <div className="text-xl font-black">{totalUnread}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, Angebot oder Nachricht suchen …"
            className="h-12 rounded-2xl bg-white pl-11"
          />
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-orange-600" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="mt-5 rounded-[2rem]">
            <CardContent className="p-12 text-center">
              <Inbox className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-xl font-black">
                {query ? "Keine passende Unterhaltung" : "Noch keine Nachrichten"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
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
                className={`block rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  unread > 0
                    ? "border-orange-300 ring-2 ring-orange-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black ${
                      unread > 0
                        ? "bg-orange-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {initials(otherName) || <UserRound className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-black text-slate-950">
                          {otherName}
                        </div>
                        <div className="truncate text-sm font-bold text-slate-500">
                          {item.listing?.title || "Gelöschtes Angebot"}
                        </div>
                      </div>

                      {unread > 0 ? (
                        <span className="shrink-0 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-black text-white">
                          {unread > 99 ? "99+" : unread} neu
                        </span>
                      ) : (
                        <Mail className="h-5 w-5 shrink-0 text-slate-300" />
                      )}
                    </div>

                    <div
                      className={`mt-2 line-clamp-2 text-sm ${
                        unread > 0
                          ? "font-semibold text-slate-900"
                          : "text-slate-600"
                      }`}
                    >
                      {last
                        ? `${last.sender_id === userId ? "Du: " : ""}${last.message}`
                        : "Unterhaltung wurde gestartet."}
                    </div>

                    <div className="mt-2 text-xs font-bold text-slate-400">
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
