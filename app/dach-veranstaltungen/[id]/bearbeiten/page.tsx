"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
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
      <div className="min-h-screen bg-[#050608]">
        <Header variant="app" title="Veranstaltung bearbeiten" subtitle="DACH Turniere" backHref="/dach-veranstaltungen/meine" />
        <main className="flex min-h-[70vh] items-center justify-center px-4 pt-20">
          <div className="flex flex-col items-center gap-3 text-white/35">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-black/25 shadow-none">
              <Loader2 className="h-7 w-7 animate-spin text-orange-200" />
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
      <div className="min-h-screen bg-[#050608]">
        <Header variant="app" title="Veranstaltung bearbeiten" subtitle="DACH Turniere" backHref="/dach-veranstaltungen/meine" />
        <main className="px-4 pb-28 pt-24">
          <Card className="mx-auto max-w-lg overflow-hidden rounded-[28px] border-white/[0.08] shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)] shadow-none">
            <div className="h-1.5 bg-gradient-to-r from-orange-500 to-sky-400" />
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/[0.08]">
                <ShieldAlert className="h-8 w-8 text-orange-200" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-white">
                Bearbeitung nicht möglich
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/50">{message}</p>
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-32 text-white">
      <Header variant="app" title="Veranstaltung bearbeiten" subtitle="DACH Turniere" backHref="/dach-veranstaltungen/meine" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.32]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_26%),radial-gradient(circle_at_88%_28%,rgba(249,115,22,.12),transparent_28%)]" />
      </div>


      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-10 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">

        <section className="relative mb-5 overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/35 p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/[0.13] blur-[70px]" />
          <div className="pointer-events-none absolute -bottom-20 left-[38%] h-48 w-48 rounded-full bg-sky-500/[0.08] blur-[65px]" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08] text-orange-100">
                <CalendarDays className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.20em] text-orange-200/65">
                  Veranstaltung bearbeiten
                </div>
                <h1 className="mt-1.5 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                  {form.name || "Veranstaltung ändern"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                  Änderungen werden nach dem Speichern erneut zur Prüfung eingereicht.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/[0.16] bg-amber-500/[0.08] px-4 py-2 text-xs font-bold text-amber-100">
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
                className="min-h-[170px] resize-y rounded-2xl border-white/[0.08] bg-[#050608]/60 px-4 py-3 focus-visible:border-orange-400 focus-visible:ring-orange-200"
              />
            </Field>

            <Field label="Neuen Flyer auswählen (optional)">
              <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#050608] p-4 transition hover:border-orange-300 hover:bg-orange-500/[0.07]">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFlyer(e.target.files?.[0] || null)}
                  className="border-0 bg-transparent p-0 shadow-none file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                />
                <p className="mt-2 text-xs text-white/35">
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
            <div className="flex items-start gap-3 rounded-2xl border border-red-300/[0.16] bg-red-500/[0.08] p-4 text-sm font-semibold text-red-200">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{message}</span>
            </div>
          ) : null}

          <div className="sticky bottom-20 z-20 rounded-[22px] border border-white/[0.08] bg-[#070a0f]/90 p-3 shadow-[0_22px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:bottom-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="hidden items-center gap-2 px-2 text-sm text-white/35 sm:flex">
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                Nach dem Speichern erfolgt eine neue Freigabeprüfung.
              </div>
              <Button
                disabled={saving}
                className="h-12 w-full rounded-2xl bg-orange-500 px-7 text-base font-black text-white shadow-[0_18px_46px_-26px_rgba(249,115,22,.5)] transition hover:bg-orange-400 sm:w-auto"
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
          border-color: rgba(255, 255, 255, 0.09);
          background: rgba(8, 12, 18, 0.95);
          color: white;
          padding-left: 1rem;
          padding-right: 1rem;
          box-shadow: none;
        }
        .modern-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
        .modern-input:focus-visible {
          border-color: rgba(253, 186, 116, 0.35);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.10);
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
    <Card className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/30 shadow-none backdrop-blur-xl">
      <CardContent className="p-0">
        <div className="border-b border-white/[0.07] bg-white/[0.025] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08] text-orange-100">
              {icon}
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200">
                {eyebrow}
              </div>
              <h2 className="mt-1 text-xl font-black text-white">
                {title}
              </h2>
              <p className="mt-1 text-sm text-white/35">{description}</p>
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
      <span className="block text-xs font-black uppercase tracking-[0.08em] text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}
