"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
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
    className: "bg-gray-100 text-gray-700 border-gray-200",
    hint: "Noch nicht zur Prüfung eingereicht.",
  },
  pending: {
    label: "In Prüfung",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    hint: "Wartet auf die Freigabe durch den Verein.",
  },
  approved: {
    label: "Freigegeben",
    className: "bg-green-50 text-green-800 border-green-200",
    hint: "Öffentlich sichtbar.",
  },
  rejected: {
    label: "Änderung nötig",
    className: "bg-red-50 text-red-800 border-red-200",
    hint: "Bitte Hinweis prüfen und erneut einreichen.",
  },
  cancelled: {
    label: "Abgesagt",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    hint: "Die Veranstaltung ist als abgesagt markiert.",
  },
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-AT");
}

export default function MeineDachVeranstaltungenPage() {
  const router = useRouter();
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
    if (!auth.user) {
      router.push("/guest-login");
      return;
    }
    const { data, error } = await supabase
      .from("dach_events")
      .select(
        "id,name,start_date,end_date,event_time,city,country_code,discipline,photo_url,event_status,rejection_reason,cancellation_reason,cancelled_at,created_at,updated_at",
      )
      .eq("created_by", auth.user.id)
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.08),_transparent_30%),linear-gradient(to_bottom,_#f8fafc,_#ffffff)] pb-28 text-slate-950">
      <Header />

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-20 sm:px-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-2xl shadow-slate-300/60 sm:px-8 sm:py-9">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
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
              <Link href="/dach-veranstaltungen/neu">
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
                    ? "border-orange-300 bg-orange-50 shadow-lg shadow-orange-100"
                    : "border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-orange-50 group-hover:text-orange-600"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {active ? (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700">
                      Aktiv
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-3xl font-black">{value}</div>
                <div className="mt-0.5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  {label}
                </div>
              </button>
            );
          })}
        </section>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white/90 p-3 shadow-lg shadow-slate-200/40 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Veranstaltung, Ort oder Status suchen …"
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-4 text-base focus-visible:border-orange-400 focus-visible:ring-orange-200"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void loadEvents()}
              className="h-12 rounded-2xl border-slate-200 px-5"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Neu laden
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
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
                className="font-bold text-orange-700 hover:text-orange-800"
              >
                Filter zurücksetzen
              </button>
            ) : null}
          </div>
        </section>

        {message ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-[2rem] border border-slate-200 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="overflow-hidden rounded-[2rem] border-slate-200 shadow-lg shadow-slate-200/40">
            <CardContent className="p-10 text-center sm:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="mt-5 text-xl font-black">
                {events.length === 0
                  ? "Noch keine Veranstaltung vorhanden"
                  : "Keine passende Veranstaltung gefunden"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {events.length === 0
                  ? "Reiche dein erstes Turnier ein und verfolge anschließend hier den Freigabestatus."
                  : "Ändere die Suche oder wähle einen anderen Status aus."}
              </p>
              {events.length === 0 ? (
                <Button asChild className="mt-6 h-11 rounded-2xl px-6">
                  <Link href="/dach-veranstaltungen/neu">
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
                  className="group overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-lg shadow-slate-200/40 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <div className="flex min-h-[190px]">
                        <div className="relative w-28 shrink-0 overflow-hidden bg-slate-100 sm:w-40">
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
                              <h2 className="line-clamp-2 text-lg font-black leading-snug text-slate-950 sm:text-xl">
                                {event.name}
                              </h2>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays className="h-4 w-4 text-orange-600" />
                                  {formatDate(event.start_date)}
                                  {event.end_date !== event.start_date
                                    ? ` – ${formatDate(event.end_date)}`
                                    : ""}
                                </span>
                                {event.event_time ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4 text-orange-600" />
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

                          <div className="mt-3 text-sm font-bold text-slate-700">
                            {event.city}{" "}
                            <span className="text-slate-300">•</span>{" "}
                            {event.country_code}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {cfg.hint}
                          </p>

                          {event.event_status === "rejected" &&
                          event.rejection_reason ? (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
                              <span className="font-black">Hinweis:</span>{" "}
                              {event.rejection_reason}
                            </div>
                          ) : null}

                          {event.event_status === "cancelled" ? (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
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
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm">
                          <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/80 p-3">
                      {event.event_status === "approved" ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-slate-200 bg-white"
                        >
                          <Link href={`/dach-veranstaltungen/${event.id}`}>
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
                          className="rounded-xl border-slate-200 bg-white"
                        >
                          <Link
                            href={`/dach-veranstaltungen/${event.id}/bearbeiten`}
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
                          className="rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
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
                          className="rounded-xl border-slate-200 bg-white"
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
                          className="ml-auto rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
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
        <AlertDialogContent className="overflow-hidden rounded-[2rem] border-slate-200 p-0">
          <div className="bg-slate-950 px-6 py-5 text-white">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
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
                className="min-h-[110px] rounded-2xl border-slate-200"
              />
              <p className="text-xs text-slate-500">
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
        <AlertDialogContent className="rounded-[2rem] border-slate-200">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
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

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
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
