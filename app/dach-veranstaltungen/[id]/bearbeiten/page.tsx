"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileImage,
  Info,
  Loader2,
  MapPin,
  Save,
  ShieldAlert,
  Trophy,
  UserRound,
} from "lucide-react";

import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const REGIONS: Record<string, string[]> = {
  AT: [
    "Burgenland",
    "Kärnten",
    "Niederösterreich",
    "Oberösterreich",
    "Salzburg",
    "Steiermark",
    "Tirol",
    "Vorarlberg",
    "Wien",
  ],
  DE: [
    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen",
  ],
  CH: [
    "Aargau",
    "Appenzell Ausserrhoden",
    "Appenzell Innerrhoden",
    "Basel-Landschaft",
    "Basel-Stadt",
    "Bern",
    "Freiburg",
    "Genf",
    "Glarus",
    "Graubünden",
    "Jura",
    "Luzern",
    "Neuenburg",
    "Nidwalden",
    "Obwalden",
    "Schaffhausen",
    "Schwyz",
    "Solothurn",
    "St. Gallen",
    "Tessin",
    "Thurgau",
    "Uri",
    "Waadt",
    "Wallis",
    "Zug",
    "Zürich",
  ],
};
const POSTAL: Record<string, RegExp> = {
  AT: /^\d{4}$/,
  DE: /^\d{5}$/,
  CH: /^\d{4}$/,
};

type Form = {
  name: string;
  start_date: string;
  end_date: string;
  event_time: string;
  country_code: string;
  postal_code: string;
  city: string;
  street: string;
  region: string;
  discipline: string;
  format: string;
  entry_fee: string;
  max_participants: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  registration_url: string;
  startgeld_details: string;
  details: string;
  photo_url: string | null;
  event_status: string;
};

export default function BearbeitenPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [flyer, setFlyer] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, [id]);
  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/guest-login");
      return;
    }
    const { data, error } = await supabase
      .from("dach_events")
      .select("*")
      .eq("id", id)
      .eq("created_by", auth.user.id)
      .maybeSingle();
    if (error || !data) {
      setMessage(error?.message || "Veranstaltung nicht gefunden.");
      setLoading(false);
      return;
    }
    if (data.event_status === "cancelled") {
      setMessage(
        "Abgesagte Veranstaltungen zuerst unter ‘Meine Veranstaltungen’ neu einreichen.",
      );
      setLoading(false);
      return;
    }
    setForm({
      name: data.name || "",
      start_date: data.start_date || "",
      end_date: data.end_date || data.start_date || "",
      event_time: (data.event_time || "").slice(0, 5),
      country_code: data.country_code || "AT",
      postal_code: data.postal_code || "",
      city: data.city || "",
      street: data.street || "",
      region: data.region || "",
      discipline: data.discipline || "both",
      format: data.format || "single",
      entry_fee: data.entry_fee?.toString() || "",
      max_participants: data.max_participants?.toString() || "",
      organizer_name: data.organizer_name || "",
      organizer_email: data.organizer_email || "",
      organizer_phone: data.organizer_phone || "",
      registration_url: data.registration_url || "",
      startgeld_details: data.startgeld_details || "",
      details: data.details || "",
      photo_url: data.photo_url || null,
      event_status: data.event_status,
    });
    setLoading(false);
  }

  const setField = (key: keyof Form, value: string) =>
    setForm((old) => (old ? { ...old, [key]: value } : old));

  async function upload(userId: string) {
    if (!flyer) return form?.photo_url || null;
    const ext = flyer.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("dach-event-flyers")
      .upload(path, flyer, { contentType: flyer.type || undefined });
    if (error) throw error;
    return supabase.storage.from("dach-event-flyers").getPublicUrl(path).data
      .publicUrl;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Bitte neu anmelden.");
      if (
        !form.name.trim() ||
        !form.start_date ||
        !form.city.trim() ||
        !form.organizer_name.trim()
      )
        throw new Error("Bitte Name, Datum, Ort und Veranstalter ausfüllen.");
      if (!POSTAL[form.country_code].test(form.postal_code))
        throw new Error("Bitte eine gültige PLZ eingeben.");
      if (!form.region)
        throw new Error("Bitte Bundesland bzw. Kanton auswählen.");
      if (form.end_date < form.start_date)
        throw new Error("Enddatum darf nicht vor dem Startdatum liegen.");
      const photo_url = await upload(auth.user.id);
      const location = [
        form.street.trim(),
        `${form.postal_code} ${form.city.trim()}`,
        form.country_code,
      ]
        .filter(Boolean)
        .join(", ");
      const { error } = await supabase
        .from("dach_events")
        .update({
          name: form.name.trim(),
          event_date: form.start_date,
          start_date: form.start_date,
          end_date: form.end_date || form.start_date,
          event_time: form.event_time || null,
          country_code: form.country_code,
          postal_code: form.postal_code,
          city: form.city.trim(),
          street: form.street.trim() || null,
          region: form.region,
          location,
          discipline: form.discipline,
          mode: form.discipline,
          format: form.format,
          entry_fee: form.entry_fee
            ? Number(form.entry_fee.replace(",", "."))
            : null,
          max_participants: form.max_participants
            ? Number(form.max_participants)
            : null,
          organizer_name: form.organizer_name.trim(),
          organizer_email: form.organizer_email.trim() || null,
          organizer_phone: form.organizer_phone.trim() || null,
          registration_url: form.registration_url.trim() || null,
          startgeld_details: form.startgeld_details.trim() || null,
          details: form.details.trim() || null,
          photo_url,
          event_status: "pending",
        })
        .eq("id", id)
        .eq("created_by", auth.user.id);
      if (error) throw error;
      router.push("/dach-veranstaltungen/meine");
    } catch (err: any) {
      setMessage(
        err?.message || "Änderungen konnten nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <Header />
        <main className="flex min-h-[70vh] items-center justify-center px-4 pt-20">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-100 bg-white shadow-none">
              <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
            </div>
            <p className="text-sm font-semibold">
              Veranstaltung wird geladen …
            </p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="px-4 pb-28 pt-24">
          <Card className="mx-auto max-w-lg overflow-hidden rounded-[28px] border-slate-200 shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)] shadow-slate-200/60">
            <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <ShieldAlert className="h-8 w-8 text-orange-600" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-slate-950">
                Bearbeitung nicht möglich
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
              <Button
                className="mt-6 h-11 rounded-xl px-6"
                onClick={() => router.push("/dach-veranstaltungen/meine")}
              >
                Zurück zu meinen Veranstaltungen
              </Button>
            </CardContent>
          </Card>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.08),_transparent_30%),linear-gradient(to_bottom,_#f8fafc,_#ffffff)] pb-32 text-slate-950">
      <Header />

      <main className="w-full max-w-none px-2 pt-14 sm:px-4 sm:pt-16 lg:px-5 xl:px-6 2xl:px-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dach-veranstaltungen/meine")}
          className="mb-4 -ml-2 rounded-xl text-slate-600 hover:bg-white hover:text-slate-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Meine Veranstaltungen
        </Button>

        <section className="relative mb-6 overflow-hidden rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-2xl shadow-slate-300/60 sm:px-8 sm:py-9">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
                <CalendarDays className="h-7 w-7 text-orange-300" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                  Veranstaltung bearbeiten
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {form.name || "Veranstaltung ändern"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Änderungen werden nach dem Speichern erneut zur Prüfung
                  eingereicht.
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-100">
              <Info className="h-4 w-4" />
              Aktueller Status:{" "}
              {form.event_status === "approved"
                ? "Freigegeben"
                : form.event_status === "pending"
                  ? "In Prüfung"
                  : form.event_status}
            </div>
          </div>
        </section>

        <form onSubmit={save} className="space-y-5">
          <ModernSection
            eyebrow="Schritt 1"
            title="Veranstaltungsdaten"
            description="Name, Termin und Spielmodus."
            icon={<Trophy className="h-5 w-5" />}
          >
            <Field label="Veranstaltungsname *">
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                className="modern-input"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Startdatum *">
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setField("start_date", e.target.value)}
                  required
                  className="modern-input"
                />
              </Field>
              <Field label="Enddatum *">
                <Input
                  type="date"
                  min={form.start_date || undefined}
                  value={form.end_date}
                  onChange={(e) => setField("end_date", e.target.value)}
                  required
                  className="modern-input"
                />
              </Field>
              <Field label="Beginn">
                <Input
                  type="time"
                  value={form.event_time}
                  onChange={(e) => setField("event_time", e.target.value)}
                  className="modern-input"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dartart">
                <Select
                  value={form.discipline}
                  onValueChange={(v) => setField("discipline", v)}
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edart">E-Dart</SelectItem>
                    <SelectItem value="steeldart">Steel-Dart</SelectItem>
                    <SelectItem value="both">E-Dart & Steel-Dart</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Spielformat">
                <Select
                  value={form.format}
                  onValueChange={(v) => setField("format", v)}
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Einzel</SelectItem>
                    <SelectItem value="double">Doppel</SelectItem>
                    <SelectItem value="team">Mannschaft</SelectItem>
                    <SelectItem value="mixed">Gemischt / Sonstiges</SelectItem>
                    <SelectItem value="other">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </ModernSection>

          <ModernSection
            eyebrow="Schritt 2"
            title="Austragungsort"
            description="Die Adresse wird für die Karte und die Suche verwendet."
            icon={<MapPin className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Land *">
                <Select
                  value={form.country_code}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      country_code: v,
                      region: "",
                      postal_code: "",
                    })
                  }
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AT">Österreich</SelectItem>
                    <SelectItem value="DE">Deutschland</SelectItem>
                    <SelectItem value="CH">Schweiz</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="PLZ *">
                <Input
                  inputMode="numeric"
                  maxLength={form.country_code === "DE" ? 5 : 4}
                  value={form.postal_code}
                  onChange={(e) =>
                    setField("postal_code", e.target.value.replace(/\D/g, ""))
                  }
                  className="modern-input"
                  required
                />
              </Field>
              <Field label="Ort *">
                <Input
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  required
                  className="modern-input"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Straße / Lokal">
                <Input
                  value={form.street}
                  onChange={(e) => setField("street", e.target.value)}
                  className="modern-input"
                />
              </Field>
              <Field label="Bundesland / Kanton *">
                <Select
                  value={form.region}
                  onValueChange={(v) => setField("region", v)}
                >
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Bitte auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS[form.country_code].map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </ModernSection>

          <ModernSection
            eyebrow="Schritt 3"
            title="Veranstalter & Anmeldung"
            description="Kontakt, Anmeldung und Teilnehmerinformationen."
            icon={<UserRound className="h-5 w-5" />}
          >
            <Field label="Verein / Veranstalter *">
              <Input
                value={form.organizer_name}
                onChange={(e) => setField("organizer_name", e.target.value)}
                required
                className="modern-input"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kontakt-E-Mail">
                <Input
                  type="email"
                  value={form.organizer_email}
                  onChange={(e) => setField("organizer_email", e.target.value)}
                  className="modern-input"
                />
              </Field>
              <Field label="Telefon">
                <Input
                  value={form.organizer_phone}
                  onChange={(e) => setField("organizer_phone", e.target.value)}
                  className="modern-input"
                />
              </Field>
            </div>

            <Field label="Anmeldelink">
              <Input
                placeholder="https://…"
                value={form.registration_url}
                onChange={(e) => setField("registration_url", e.target.value)}
                className="modern-input"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Startgeld in €">
                <Input
                  inputMode="decimal"
                  value={form.entry_fee}
                  onChange={(e) => setField("entry_fee", e.target.value)}
                  className="modern-input"
                />
              </Field>
              <Field label="Maximale Teilnehmer">
                <Input
                  type="number"
                  min="1"
                  value={form.max_participants}
                  onChange={(e) => setField("max_participants", e.target.value)}
                  className="modern-input"
                />
              </Field>
            </div>

            <Field label="Startgeld-Details">
              <Input
                placeholder="z. B. 10 € pro Person, Jugend 5 €"
                value={form.startgeld_details}
                onChange={(e) => setField("startgeld_details", e.target.value)}
                className="modern-input"
              />
            </Field>
          </ModernSection>

          <ModernSection
            eyebrow="Schritt 4"
            title="Beschreibung & Flyer"
            description="Ergänzende Informationen und ein neuer Flyer."
            icon={<FileImage className="h-5 w-5" />}
          >
            <Field label="Beschreibung">
              <Textarea
                rows={7}
                value={form.details}
                onChange={(e) => setField("details", e.target.value)}
                placeholder="Modus, Preisgeld, Einlass, Anmeldung und weitere Hinweise …"
                className="min-h-[170px] resize-y rounded-2xl border-slate-200 bg-slate-50/60 px-4 py-3 focus-visible:border-orange-400 focus-visible:ring-orange-200"
              />
            </Field>

            <Field label="Neuen Flyer auswählen (optional)">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-orange-300 hover:bg-orange-50/30">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFlyer(e.target.files?.[0] || null)}
                  className="border-0 bg-transparent p-0 shadow-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {flyer
                    ? `Ausgewählt: ${flyer.name}`
                    : form.photo_url
                      ? "Der bestehende Flyer bleibt erhalten, solange kein neuer ausgewählt wird."
                      : "JPG, PNG, WEBP oder PDF."}
                </p>
              </div>
            </Field>
          </ModernSection>

          {message ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{message}</span>
            </div>
          ) : null}

          <div className="sticky bottom-20 z-20 rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-3 shadow-2xl shadow-slate-300/60 backdrop-blur-xl sm:bottom-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="hidden items-center gap-2 px-2 text-sm text-slate-500 sm:flex">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Nach dem Speichern erfolgt eine neue Freigabeprüfung.
              </div>
              <Button
                disabled={saving}
                className="h-12 w-full rounded-2xl bg-orange-600 px-7 text-base font-black shadow-lg shadow-orange-200 hover:bg-orange-700 sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-5 w-5" />
                )}
                {saving
                  ? "Änderungen werden gespeichert …"
                  : "Änderungen einreichen"}
              </Button>
            </div>
          </div>
        </form>
      </main>

      <style jsx global>{`
        .modern-input {
          height: 3rem;
          border-radius: 1rem;
          border-color: rgb(226 232 240);
          background: rgba(248, 250, 252, 0.72);
          padding-left: 1rem;
          padding-right: 1rem;
        }
        .modern-input:focus-visible {
          border-color: rgb(251 146 60);
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.16);
        }
      `}</style>

      <MobileBottomNav />
    </div>
  );
}

function ModernSection({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-slate-200 bg-white/95 shadow-lg shadow-slate-200/50">
      <CardContent className="p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              {icon}
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                {eyebrow}
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-7">{children}</div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs font-black uppercase tracking-[0.08em] text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
