"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Status = "draft" | "pending" | "approved" | "rejected" | "cancelled";
type EventRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  event_time: string | null;
  city: string;
  country_code: string;
  discipline: string | null;
  photo_url: string | null;
  event_status: Status;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

const statusConfig: Record<
  Status,
  { label: string; className: string; hint: string }
> = {
  draft: {
    label: "Entwurf",
    className: "bg-white/5 text-white/55 border-white/10",
    hint: "Noch nicht zur Prüfung eingereicht.",
  },
  pending: {
    label: "In Prüfung",
    className: "bg-amber-500/10 text-amber-200 border-amber-300/20",
    hint: "Wartet auf die Freigabe durch den Verein.",
  },
  approved: {
    label: "Freigegeben",
    className: "bg-emerald-500/10 text-emerald-200 border-emerald-300/20",
    hint: "Öffentlich sichtbar.",
  },
  rejected: {
    label: "Änderung nötig",
    className: "bg-red-500/10 text-red-200 border-red-300/20",
    hint: "Bitte Hinweis prüfen und erneut einreichen.",
  },
  cancelled: {
    label: "Abgesagt",
    className: "bg-white/5 text-white/65 border-white/10",
    hint: "Die Veranstaltung ist als abgesagt markiert.",
  },
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-AT");
}

type AccessState = "loading" | "allowed" | "signed-out" | "blocked";

export default function MeineDachVeranstaltungenPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("loading");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [message, setMessage] = useState("");
  const [cancelEvent, setCancelEvent] = useState<EventRow | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<EventRow | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  async function loadEvents() {
    setLoading(true);
    setMessage("");

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      setAccess("signed-out");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_blocked")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || profile?.is_blocked) {
      setAccess("blocked");
      setLoading(false);
      return;
    }

    setAccess("allowed");

    const { data, error } = await supabase
      .from("dach_events")
      .select(
        "id,name,start_date,end_date,event_time,city,country_code,discipline,photo_url,event_status,rejection_reason,cancellation_reason,cancelled_at,created_at,updated_at",
      )
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    setEvents((data || []) as EventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesStatus =
        statusFilter === "all" || event.event_status === statusFilter;
      const matchesQuery =
        !q ||
        `${event.name} ${event.city} ${event.country_code} ${statusConfig[event.event_status].label}`
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [events, query, statusFilter]);

  const counts = useMemo(
    () => ({
      all: events.length,
      pending: events.filter((e) => e.event_status === "pending").length,
      approved: events.filter((e) => e.event_status === "approved").length,
      cancelled: events.filter((e) => e.event_status === "cancelled").length,
    }),
    [events],
  );

  async function cancelSelectedEvent() {
    if (!cancelEvent) return;

    setSavingId(cancelEvent.id);
    setMessage("");

    const { error } = await supabase
      .from("dach_events")
      .update({
        event_status: "cancelled",
        cancellation_reason: cancellationReason.trim() || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", cancelEvent.id);

    if (error) {
      setMessage(error.message);
    } else {
      setCancelEvent(null);
      setCancellationReason("");
      await loadEvents();
    }

    setSavingId(null);
  }

  async function reactivateEvent(id: string) {
    setSavingId(id);
    setMessage("");

    const { error } = await supabase
      .from("dach_events")
      .update({
        event_status: "pending",
        cancellation_reason: null,
        cancelled_at: null,
      })
      .eq("id", id);

    if (error) setMessage(error.message);
    else await loadEvents();

    setSavingId(null);
  }

  async function removeSelectedEvent() {
    if (!deleteEvent) return;

    setSavingId(deleteEvent.id);
    setMessage("");

    const { error } = await supabase
      .from("dach_events")
      .delete()
      .eq("id", deleteEvent.id);

    if (error) {
      setMessage(error.message);
    } else {
      setDeleteEvent(null);
      await loadEvents();
    }

    setSavingId(null);
  }

  if (access === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[#050608] text-white">
        <Header variant="app" title="Meine Veranstaltungen" subtitle="Öffentliche Turniere" backHref="/turniere" />
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
          <div
            className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.32]"
            style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
        </div>
        <main className="relative z-10 flex flex-grow items-center justify-center px-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-200" />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (access !== "allowed") {
    return (
      <div className="min-h-screen flex flex-col bg-[#050608] text-white">
        <Header variant="app" title="Meine Veranstaltungen" subtitle="Öffentliche Turniere" backHref="/turniere" />

        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
          <div
            className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.32]"
            style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_26%),radial-gradient(circle_at_88%_28%,rgba(249,115,22,.12),transparent_28%)]" />
        </div>

        <main className="relative z-10 flex flex-grow items-center justify-center px-4 pb-28 pt-24">
          <Card className="w-full max-w-md rounded-[28px] border border-white/10 bg-black/40 shadow-[0_30px_100px_-55px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <CardContent className="p-6 text-center sm:p-7">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10">
                <ShieldAlert className="h-7 w-7 text-orange-200" />
              </div>

              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                Öffentliche Turniere
              </div>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-white">
                {access === "blocked" ? "Zugang derzeit nicht möglich" : "Anmeldung erforderlich"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {access === "blocked"
                  ? "Mit diesem Zugang können derzeit keine eigenen Veranstaltungen verwaltet werden."
                  : "Melde dich als freigeschalteter Gast an, um deine eingereichten Veranstaltungen zu sehen und zu bearbeiten."}
              </p>

              <div className="mt-6 grid gap-2">
                {access !== "blocked" ? (
                  <Button
                    onClick={() => router.push("/guest-login")}
                    className="h-11 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600"
                  >
                    Zum Gast-Login
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={() => router.push("/turniere")}
                  className="h-11 rounded-xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10"
                >
                  Zur Turnierübersicht
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050608] pb-28 text-white">
      <Header variant="app" title="Meine Veranstaltungen" subtitle="Öffentliche Turniere" backHref="/turniere" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.32]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_26%),radial-gradient(circle_at_88%_28%,rgba(249,115,22,.12),transparent_28%)]" />
      </div>


      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] space-y-5 px-2 pt-14 sm:px-4 sm:pt-16 lg:px-5 xl:px-6 2xl:px-8">
        <div>
          <Button
            asChild
            variant="ghost"
            className="-ml-2 rounded-xl text-white/50 hover:bg-black/25 hover:text-white"
          >
            <Link href="/turniere">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zur Turnierübersicht
            </Link>
          </Button>
        </div>

        <section className="relative overflow-hidden rounded-[28px] bg-black/30 backdrop-blur-xl px-6 py-7 text-white shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] sm:px-8 sm:py-9">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                DACH-Veranstaltungen
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Meine Veranstaltungen
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Behalte Freigaben im Blick, aktualisiere deine Turniere oder
                sage Veranstaltungen mit wenigen Klicks ab.
              </p>
            </div>
            <Button
              asChild
              className="h-12 rounded-2xl bg-orange-600 px-5 font-black shadow-lg shadow-orange-950/30 hover:bg-orange-500"
            >
              <Link href="/turniere/neu">
                <Plus className="mr-2 h-5 w-5" />
                Neue Veranstaltung
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Gesamt", counts.all, CalendarDays, "all"],
            ["In Prüfung", counts.pending, Clock3, "pending"],
            ["Freigegeben", counts.approved, CheckCircle2, "approved"],
            ["Abgesagt", counts.cancelled, XCircle, "cancelled"],
          ].map(([label, value, Icon, filter]: any) => {
            const active = statusFilter === filter;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`group rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-orange-300/[0.20] bg-orange-500/[0.10]"
                    : "border-white/10 bg-black/25 shadow-none hover:-translate-y-0.5 hover:border-white/15 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-orange-600 text-white" : "bg-white/5 text-white/50 group-hover:bg-orange-500/10 group-hover:text-orange-200"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {active ? (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-200">
                      Aktiv
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-3xl font-black">{value}</div>
                <div className="mt-0.5 text-[11px] font-black uppercase tracking-[0.1em] text-white/35">
                  {label}
                </div>
              </button>
            );
          })}
        </section>

        <section className="rounded-[1.6rem] border border-white/10 bg-black/30 p-3 shadow-lg shadow-none backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/25" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Veranstaltung, Ort oder Status suchen …"
                className="h-12 rounded-2xl border-white/10 bg-black/25/[0.035] pl-12 pr-4 text-base focus-visible:border-orange-400 focus-visible:ring-orange-200"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void loadEvents()}
              className="h-12 rounded-2xl border-white/10 px-5"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Neu laden
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between px-1 text-xs text-white/35">
            <span>
              {filtered.length} von {events.length} Veranstaltungen
            </span>
            {query || statusFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
                className="font-bold text-orange-200 hover:text-orange-800"
              >
                Filter zurücksetzen
              </button>
            ) : null}
          </div>
        </section>

        {message ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm font-semibold text-red-700">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-[28px] border border-white/10 bg-black/25 shadow-none"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="overflow-hidden rounded-[28px] border-white/10 shadow-lg shadow-none">
            <CardContent className="p-10 text-center sm:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                <Search className="h-8 w-8 text-white/25" />
              </div>
              <h2 className="mt-5 text-xl font-black">
                {events.length === 0
                  ? "Noch keine Veranstaltung vorhanden"
                  : "Keine passende Veranstaltung gefunden"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                {events.length === 0
                  ? "Reiche dein erstes Turnier ein und verfolge anschließend hier den Freigabestatus."
                  : "Ändere die Suche oder wähle einen anderen Status aus."}
              </p>
              {events.length === 0 ? (
                <Button asChild className="mt-6 h-11 rounded-2xl px-6">
                  <Link href="/turniere/neu">
                    <Plus className="mr-2 h-4 w-4" />
                    Erste Veranstaltung anlegen
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mt-6 rounded-2xl"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Filter zurücksetzen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.map((event) => {
              const cfg = statusConfig[event.event_status];
              const busy = savingId === event.id;

              return (
                <Card
                  key={event.id}
                  className="group overflow-hidden rounded-[28px] border-white/10 bg-black/25 shadow-lg shadow-none transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)]"
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <div className="flex min-h-[190px]">
                        <div className="relative w-28 shrink-0 overflow-hidden bg-white/5 sm:w-40">
                          {event.photo_url ? (
                            <img
                              src={event.photo_url}
                              alt={`Flyer: ${event.name}`}
                              className="h-full min-h-[190px] w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full min-h-[190px] items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
                              <CalendarDays className="h-10 w-10 text-white/55" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="line-clamp-2 text-lg font-black leading-snug text-white sm:text-xl">
                                {event.name}
                              </h2>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/35">
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays className="h-4 w-4 text-orange-200" />
                                  {formatDate(event.start_date)}
                                  {event.end_date !== event.start_date
                                    ? ` – ${formatDate(event.end_date)}`
                                    : ""}
                                </span>
                                {event.event_time ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4 text-orange-200" />
                                    {event.event_time.slice(0, 5)} Uhr
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${cfg.className}`}
                            >
                              {cfg.label}
                            </Badge>
                          </div>

                          <div className="mt-3 text-sm font-bold text-white/65">
                            {event.city}{" "}
                            <span className="text-slate-300">•</span>{" "}
                            {event.country_code}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-white/35">
                            {cfg.hint}
                          </p>

                          {event.event_status === "rejected" &&
                          event.rejection_reason ? (
                            <div className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-xs font-semibold leading-5 text-red-200">
                              <span className="font-black">Hinweis:</span>{" "}
                              {event.rejection_reason}
                            </div>
                          ) : null}

                          {event.event_status === "cancelled" ? (
                            <div className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-xs font-semibold leading-5 text-red-200">
                              <div className="font-black uppercase tracking-wide">
                                Veranstaltung abgesagt
                              </div>
                              <div className="mt-1">
                                {event.cancellation_reason
                                  ? `Grund: ${event.cancellation_reason}`
                                  : "Es wurde kein Absagegrund angegeben."}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {busy ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25/75 backdrop-blur-sm">
                          <Loader2 className="h-7 w-7 animate-spin text-orange-200" />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-white/10 bg-black/25/[0.035]/80 p-3">
                      {event.event_status === "approved" ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-white/10 bg-black/25"
                        >
                          <Link href={`/turniere/${event.id}`}>
                            <Eye className="mr-1.5 h-4 w-4" />
                            Ansehen
                          </Link>
                        </Button>
                      ) : null}

                      {event.event_status !== "cancelled" ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-white/10 bg-black/25"
                        >
                          <Link
                            href={`/turniere/${event.id}/bearbeiten`}
                          >
                            <Edit3 className="mr-1.5 h-4 w-4" />
                            Bearbeiten
                          </Link>
                        </Button>
                      ) : null}

                      {event.event_status !== "cancelled" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setCancelEvent(event);
                            setCancellationReason("");
                          }}
                          className="rounded-xl border-red-300/20 bg-black/25 text-red-700 hover:bg-red-500/10 hover:text-red-200"
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Absagen
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void reactivateEvent(event.id)}
                          className="rounded-xl border-white/10 bg-black/25"
                        >
                          <RotateCcw className="mr-1.5 h-4 w-4" />
                          Neu einreichen
                        </Button>
                      )}

                      {["draft", "rejected", "cancelled"].includes(
                        event.event_status,
                      ) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setDeleteEvent(event)}
                          className="ml-auto rounded-xl text-red-600 hover:bg-red-500/10 hover:text-red-700"
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Löschen
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog
        open={Boolean(cancelEvent)}
        onOpenChange={(open) => {
          if (!open && !savingId) {
            setCancelEvent(null);
            setCancellationReason("");
          }
        }}
      >
        <AlertDialogContent className="overflow-hidden rounded-[28px] border-white/10 p-0">
          <div className="bg-black/30 backdrop-blur-xl px-6 py-5 text-white">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/100/15">
              <XCircle className="h-7 w-7 text-red-300" />
            </div>
            <AlertDialogHeader className="mt-3">
              <AlertDialogTitle className="text-center text-xl text-white">
                Veranstaltung wirklich absagen?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-slate-300">
                <span className="font-bold text-white">
                  {cancelEvent?.name}
                </span>{" "}
                bleibt im Kalender sichtbar, wird aber deutlich als abgesagt
                markiert.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-900">
                Absagegrund (optional)
              </label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="z. B. zu wenige Anmeldungen, Lokal nicht verfügbar oder organisatorische Gründe"
                className="min-h-[110px] rounded-2xl border-white/10"
              />
              <p className="text-xs text-white/35">
                Der Grund wird öffentlich bei der Veranstaltung angezeigt.
              </p>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={Boolean(savingId)}
                className="rounded-xl"
              >
                Zurück
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void cancelSelectedEvent();
                }}
                disabled={Boolean(savingId)}
                className="rounded-xl bg-red-600 hover:bg-red-700"
              >
                {savingId ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Wirklich absagen
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteEvent)}
        onOpenChange={(open) => {
          if (!open && !savingId) setDeleteEvent(null);
        }}
      >
        <AlertDialogContent className="rounded-[28px] border-white/10">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Veranstaltung löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Möchtest du{" "}
              <span className="font-bold text-slate-900">
                „{deleteEvent?.name}“
              </span>{" "}
              wirklich dauerhaft löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(savingId)}
              className="rounded-xl"
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void removeSelectedEvent();
              }}
              disabled={Boolean(savingId)}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {savingId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Veranstaltung löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </div>
  );
}
