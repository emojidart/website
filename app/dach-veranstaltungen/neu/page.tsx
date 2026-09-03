"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Info,
  CheckCircle2,
  FileImage,
  Loader2,
  MapPin,
  Send,
  ShieldAlert,
  Trophy,
  UserRound,
} from "lucide-react";

import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type AccessState = "loading" | "allowed" | "signed-out" | "blocked";

type FormState = {
  name: string;
  eventType: string;
  startDate: string;
  endDate: string;
  eventTime: string;
  countryCode: string;
  postalCode: string;
  city: string;
  street: string;
  region: string;
  discipline: string;
  format: string;
  entryFee: string;
  startgeldDetails: string;
  maxParticipants: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  registrationUrl: string;
  registrationDeadline: string;
  details: string;
};

const initialForm: FormState = {
  name: "",
  eventType: "tournament",
  startDate: "",
  endDate: "",
  eventTime: "19:00",
  countryCode: "AT",
  postalCode: "",
  city: "",
  street: "",
  region: "",
  discipline: "edart",
  format: "single",
  entryFee: "",
  startgeldDetails: "",
  maxParticipants: "",
  organizerName: "",
  organizerEmail: "",
  organizerPhone: "",
  registrationUrl: "",
  registrationDeadline: "",
  details: "",
};

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

const POSTAL_PATTERNS: Record<string, RegExp> = {
  AT: /^\d{4}$/,
  DE: /^\d{5}$/,
  CH: /^\d{4}$/,
};

const POSTAL_HINTS: Record<string, string> = {
  AT: "4 Ziffern, z. B. 5020",
  DE: "5 Ziffern, z. B. 80331",
  CH: "4 Ziffern, z. B. 8001",
};

function cleanUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function NeueVeranstaltungPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("loading");
  const [form, setForm] = useState<FormState>(initialForm);
  const [flyer, setFlyer] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!active) return;
      if (!user) {
        setAccess("signed-out");
        return;
      }

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("is_blocked")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error || profile?.is_blocked) {
        setAccess("blocked");
        return;
      }

      setForm((old) => ({
        ...old,
        organizerEmail: user.email || old.organizerEmail,
      }));
      setAccess("allowed");
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, []);

  const setField = (field: keyof FormState, value: string) => {
    setForm((old) => ({ ...old, [field]: value }));
  };

  const handleCountryChange = (countryCode: string) => {
    setForm((old) => ({
      ...old,
      countryCode,
      region: "",
      postalCode: "",
    }));
  };

  const postalCodeIsValid =
    !form.postalCode.trim() ||
    POSTAL_PATTERNS[form.countryCode].test(form.postalCode.trim());

  async function uploadFlyer(userId: string) {
    if (!flyer) return null;

    const extension = flyer.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("dach-event-flyers")
      .upload(path, flyer, {
        cacheControl: "3600",
        upsert: false,
        contentType: flyer.type || undefined,
      });

    if (error) throw error;
    return supabase.storage.from("dach-event-flyers").getPublicUrl(path).data
      .publicUrl;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSuccess(false);

    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) throw new Error("Bitte melde dich zuerst an.");

      if (!form.startDate || !form.city.trim() || !form.organizerName.trim()) {
        throw new Error("Bitte fülle Datum, Ort und Veranstalter aus.");
      }

      if (form.endDate && form.endDate < form.startDate) {
        throw new Error("Das Enddatum darf nicht vor dem Startdatum liegen.");
      }

      if (!form.postalCode.trim()) {
        throw new Error("Bitte gib die PLZ ein.");
      }

      if (!POSTAL_PATTERNS[form.countryCode].test(form.postalCode.trim())) {
        throw new Error(
          `Bitte gib eine gültige PLZ ein (${POSTAL_HINTS[form.countryCode]}).`,
        );
      }

      if (!form.region) {
        throw new Error("Bitte wähle ein Bundesland bzw. einen Kanton aus.");
      }

      const photoUrl = await uploadFlyer(user.id);
      const location = [
        form.street.trim(),
        `${form.postalCode.trim()} ${form.city.trim()}`.trim(),
        form.countryCode,
      ]
        .filter(Boolean)
        .join(", ");

      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const geocodeResponse = await fetch("/api/dach-events/geocode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            street: form.street.trim(),
            postalCode: form.postalCode.trim(),
            city: form.city.trim(),
            countryCode: form.countryCode,
          }),
        });

        const geocodeData = await geocodeResponse.json().catch(() => null);

        latitude =
          typeof geocodeData?.latitude === "number"
            ? geocodeData.latitude
            : null;
        longitude =
          typeof geocodeData?.longitude === "number"
            ? geocodeData.longitude
            : null;
      } catch (geocodeError) {
        console.error("[DachVeranstaltungNeu] Geocoding:", geocodeError);
      }

      const { error } = await supabase.from("dach_events").insert({
        name: form.name.trim(),
        event_type: form.eventType,
        event_date: form.startDate,
        start_date: form.startDate,
        end_date: form.endDate || form.startDate,
        event_time: form.eventTime || null,
        location,
        country_code: form.countryCode,
        postal_code: form.postalCode.trim() || null,
        city: form.city.trim(),
        street: form.street.trim() || null,
        region: form.region.trim() || null,
        mode: form.discipline,
        discipline: form.discipline,
        format: form.format,
        entry_fee: form.entryFee
          ? Number(form.entryFee.replace(",", "."))
          : null,
        startgeld_details: form.startgeldDetails.trim() || null,
        max_participants: form.maxParticipants
          ? Number(form.maxParticipants)
          : null,
        organizer_name: form.organizerName.trim(),
        organizer_email: form.organizerEmail.trim() || null,
        organizer_phone: form.organizerPhone.trim() || null,
        registration_url: cleanUrl(form.registrationUrl),
        registration_deadline: form.registrationDeadline
          ? new Date(form.registrationDeadline).toISOString()
          : null,
        details: form.details.trim() || null,
        photo_url: photoUrl,
        source: "external",
        event_status: "pending",
        latitude,
        longitude,
        created_by: user.id,
      });

      if (error) throw error;

      setSuccess(true);
      setMessage(
        "Die Veranstaltung wurde eingereicht und wartet jetzt auf die Freigabe durch den Verein.",
      );
      setForm((old) => ({
        ...initialForm,
        organizerEmail: old.organizerEmail,
      }));
      setFlyer(null);
    } catch (error: any) {
      setMessage(
        error?.message || "Die Veranstaltung konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (access === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[#f5f6f8] text-slate-950">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (access !== "allowed") {
    return (
      <div className="min-h-screen flex flex-col bg-[#f5f6f8] text-slate-950">
        <Header />
        <main className="flex-grow px-4 pt-24 pb-28">
          <Card className="mx-auto max-w-md rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)]">
            <CardContent className="p-6 text-center">
              <ShieldAlert className="w-12 h-12 mx-auto text-orange-600 mb-4" />
              <h1 className="text-2xl font-black">Anmeldung erforderlich</h1>
              <p className="text-gray-600 mt-2">
                {access === "blocked"
                  ? "Mit diesem Zugang kann derzeit keine Veranstaltung erstellt werden."
                  : "Registrierte Mitglieder und freigeschaltete Gäste können Veranstaltungen einreichen."}
              </p>
              <div className="grid gap-2 mt-6">
                <Button onClick={() => router.push("/guest-login")}>
                  Zum Gast-Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dach-veranstaltungen")}
                >
                  Zur Übersicht
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
    <div className="min-h-screen overflow-x-hidden bg-[#f6f7f9] pb-24 text-slate-950">
      <Header />

      <main className="w-full pt-14 sm:pt-16">
        <section className="relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.30),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_36%)]" />
          <div className="relative w-full max-w-none px-3 pb-20 pt-8 sm:px-4 sm:pb-24 sm:pt-12 lg:px-5 xl:px-6 2xl:px-8">
            <button
              type="button"
              onClick={() => router.push("/dach-veranstaltungen")}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Zur Übersicht
            </button>

            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                <CalendarDays className="h-4 w-4" />
                DACH Veranstaltungskalender
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                Veranstaltung einreichen
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Trage dein Dartturnier schnell und übersichtlich ein. Nach einer kurzen Prüfung wird die Veranstaltung im Kalender veröffentlicht.
              </p>
            </div>
          </div>
        </section>

        <div className="relative z-10 -mt-10 w-full max-w-none px-2 pb-10 sm:px-4 lg:px-5 xl:px-6 2xl:px-8">
          <div className="mb-4 grid gap-2 sm:grid-cols-3 xl:gap-3">
            {["Daten eintragen", "Prüfung durch den Verein", "Veröffentlichung im Kalender"].map((label, index) => (
              <div key={label} className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_12px_34px_-30px_rgba(15,23,42,0.35)]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-black text-orange-600">
                  {index + 1}
                </span>
                <span className="text-xs font-bold text-slate-700 sm:text-sm">{label}</span>
              </div>
            ))}
          </div>

          <div className="mb-5 flex items-start gap-3 rounded-[18px] border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-[0_12px_34px_-30px_rgba(15,23,42,0.3)]">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <p><strong>Hinweis:</strong> Felder mit einem Stern sind Pflichtfelder. Je vollständiger die Angaben sind, desto schneller kann die Veranstaltung freigegeben werden.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid items-start gap-4 xl:grid-cols-2 xl:gap-5 [&_input]:h-12 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:bg-slate-50/70 [&_input]:transition [&_input]:focus-visible:bg-white [&_button[role=combobox]]:h-12 [&_button[role=combobox]]:rounded-xl [&_button[role=combobox]]:border-slate-200 [&_button[role=combobox]]:bg-slate-50/70"
          >
            <Section
              title="Veranstaltung"
              icon={<Trophy className="w-5 h-5" />}
            >
              <Field label="Name der Veranstaltung *">
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Art">
                  <Select
                    value={form.eventType}
                    onValueChange={(v) => setField("eventType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tournament">Turnier</SelectItem>
                      <SelectItem value="party">Vereinsfest / Party</SelectItem>
                      <SelectItem value="announcement">Ankündigung</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dartart">
                  <Select
                    value={form.discipline}
                    onValueChange={(v) => setField("discipline", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edart">E-Dart</SelectItem>
                      <SelectItem value="steeldart">Steel-Dart</SelectItem>
                      <SelectItem value="both">Beides</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Startdatum *">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setField("startDate", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Enddatum">
                  <Input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(e) => setField("endDate", e.target.value)}
                  />
                </Field>
                <Field label="Beginn">
                  <Input
                    type="time"
                    value={form.eventTime}
                    onChange={(e) => setField("eventTime", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Spielart">
                  <Select
                    value={form.format}
                    onValueChange={(v) => setField("format", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Einzel</SelectItem>
                      <SelectItem value="double">Doppel</SelectItem>
                      <SelectItem value="team">Mannschaft</SelectItem>
                      <SelectItem value="mixed">
                        Gemischt / Sonstiges
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Max. Teilnehmer">
                  <Input
                    type="number"
                    min="1"
                    value={form.maxParticipants}
                    onChange={(e) =>
                      setField("maxParticipants", e.target.value)
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section title="Ort" icon={<MapPin className="w-5 h-5" />}>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Land *">
                  <Select
                    value={form.countryCode}
                    onValueChange={handleCountryChange}
                  >
                    <SelectTrigger>
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
                    value={form.postalCode}
                    inputMode="numeric"
                    maxLength={form.countryCode === "DE" ? 5 : 4}
                    placeholder={POSTAL_HINTS[form.countryCode]}
                    onChange={(e) =>
                      setField("postalCode", e.target.value.replace(/\D/g, ""))
                    }
                    className={
                      !postalCodeIsValid
                        ? "border-red-400 focus-visible:ring-red-400"
                        : ""
                    }
                    required
                  />
                  {!postalCodeIsValid ? (
                    <span className="mt-1 block text-xs font-semibold text-red-600">
                      Ungültige PLZ – erwartet: {POSTAL_HINTS[form.countryCode]}
                      .
                    </span>
                  ) : null}
                </Field>
                <Field label="Ort *">
                  <Input
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Straße / Lokal">
                  <Input
                    value={form.street}
                    onChange={(e) => setField("street", e.target.value)}
                  />
                </Field>
                <Field label="Bundesland / Kanton *">
                  <Select
                    value={form.region}
                    onValueChange={(v) => setField("region", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS[form.countryCode].map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section
              title="Veranstalter und Anmeldung"
              icon={<UserRound className="w-5 h-5" />}
            >
              <Field label="Verein / Veranstalter *">
                <Input
                  value={form.organizerName}
                  onChange={(e) => setField("organizerName", e.target.value)}
                  required
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Kontakt-E-Mail">
                  <Input
                    type="email"
                    value={form.organizerEmail}
                    onChange={(e) => setField("organizerEmail", e.target.value)}
                  />
                </Field>
                <Field label="Telefon">
                  <Input
                    value={form.organizerPhone}
                    onChange={(e) => setField("organizerPhone", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Anmeldelink">
                  <Input
                    placeholder="https://..."
                    value={form.registrationUrl}
                    onChange={(e) =>
                      setField("registrationUrl", e.target.value)
                    }
                  />
                </Field>
                <Field label="Anmeldeschluss">
                  <Input
                    type="datetime-local"
                    value={form.registrationDeadline}
                    onChange={(e) =>
                      setField("registrationDeadline", e.target.value)
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section
              title="Kosten, Beschreibung und Flyer"
              icon={<FileImage className="w-5 h-5" />}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Eintritt in €">
                  <Input
                    inputMode="decimal"
                    value={form.entryFee}
                    onChange={(e) => setField("entryFee", e.target.value)}
                  />
                </Field>
                <Field label="Startgeld">
                  <Input
                    placeholder="z. B. 10 € pro Person"
                    value={form.startgeldDetails}
                    onChange={(e) =>
                      setField("startgeldDetails", e.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Beschreibung">
                <textarea
                  value={form.details}
                  onChange={(e) => setField("details", e.target.value)}
                  rows={7}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  placeholder="Modus, Preisgeld, Einlass, Anmeldung und weitere Hinweise …"
                />
              </Field>
              <Field label="Flyer (JPG, PNG, WEBP oder PDF; max. 8 MB)">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFlyer(e.target.files?.[0] || null)}
                />
              </Field>
            </Section>

            {message ? (
              <div
                className={`xl:col-span-2 rounded-2xl border p-4 text-sm font-semibold shadow-none ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
              >
                <div className="flex gap-2 items-start">
                  {success ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{message}</span>
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-20 z-20 rounded-[20px] border border-slate-200 bg-white/95 p-3.5 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:bottom-4 xl:col-span-2">
              <Button
                type="submit"
                disabled={saving}
                className="h-14 w-full rounded-xl bg-orange-500 text-base font-black text-white shadow-none hover:bg-orange-600"
              >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
                {saving ? "Wird eingereicht …" : "Zur Freigabe einreichen"}
                {!saving ? <ChevronRight className="ml-2 h-5 w-5" /> : null}
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Die Veröffentlichung erfolgt erst nach der Freigabe.
              </p>
            </div>
          </form>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_50px_-40px_rgba(15,23,42,0.5)] sm:rounded-[26px]">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5 lg:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
            {icon}
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">Bitte möglichst vollständig ausfüllen</p>
          </div>
        </div>
        <div className="space-y-5 bg-slate-50/30 p-4 sm:p-5 lg:p-6">{children}</div>
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
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
