"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  Box,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Tag,
  Truck,
  X,
  ZoomIn,
} from "lucide-react";

import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Listing = {
  id: string;
  created_by: string;
  title: string;
  category: string;
  description: string | null;
  condition: string;
  price: number | null;
  price_type: string;
  country_code: string;
  postal_code: string | null;
  city: string;
  shipping_available: boolean;
  pickup_available: boolean;
  seller_name: string;
  seller_email: string | null;
  seller_phone: string | null;
  status: "approved" | "reserved" | "sold";
  created_at: string;
};
const categoryLabels: Record<string, string> = {
  complete_darts: "Komplette Darts",
  barrels: "Barrels",
  shafts: "Schäfte",
  flights: "Flights",
  tips: "Spitzen",
  boards: "Dartscheiben",
  machines: "Dartautomaten",
  lighting: "Beleuchtung",
  surrounds: "Surrounds",
  mats: "Matten",
  cases: "Taschen & Cases",
  spare_parts: "Ersatzteile",
  other: "Sonstiges",
};
const conditionLabels: Record<string, string> = {
  new: "Neu",
  like_new: "Wie neu",
  good: "Gut",
  used: "Gebraucht",
  defective: "Defekt",
};

export default function DartboerseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Listing | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!galleryOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryOpen(false);
      if (event.key === "ArrowLeft" && images.length > 1) {
        setIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        setIndex((current) => (current + 1) % images.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [galleryOpen, images.length]);

  useEffect(() => {
    void supabase.auth
      .getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id || ""));
    void (async () => {
      const { data, error } = await supabase
        .from("dart_marketplace_listings")
        .select("*")
        .eq("id", id)
        .in("status", ["approved", "reserved", "sold"])
        .maybeSingle();
      if (error) setError(error.message);
      setItem(data as Listing | null);
      if (data) {
        const { data: imgs } = await supabase
          .from("dart_marketplace_images")
          .select("image_url")
          .eq("listing_id", id)
          .order("sort_order");
        setImages((imgs || []).map((row: any) => row.image_url));
      }
      setLoading(false);
    })();
  }, [id]);

  async function startConversation(openOffer = false) {
    if (!item) return;
    setStartingChat(true);
    setChatError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push(
        `/guest-login?redirect=${encodeURIComponent(`/dartboerse/${item.id}`)}`,
      );
      return;
    }
    if (auth.user.id === item.created_by) {
      setChatError("Das ist dein eigenes Inserat.");
      setStartingChat(false);
      return;
    }
    const { data: existing } = await supabase
      .from("dart_marketplace_conversations")
      .select("id")
      .eq("listing_id", item.id)
      .eq("buyer_id", auth.user.id)
      .eq("seller_id", item.created_by)
      .maybeSingle();
    if (existing?.id) {
      router.push(`/dartboerse/nachrichten/${existing.id}${openOffer ? "?offer=1" : ""}`);
      return;
    }
    const { data: created, error } = await supabase
      .from("dart_marketplace_conversations")
      .insert({
        listing_id: item.id,
        buyer_id: auth.user.id,
        seller_id: item.created_by,
      })
      .select("id")
      .single();
    if (error) {
      setChatError(error.message);
      setStartingChat(false);
      return;
    }
    router.push(`/dartboerse/nachrichten/${created.id}${openOffer ? "?offer=1" : ""}`);
  }

  const price =
    item?.price_type === "free"
      ? "Zu verschenken"
      : item?.price == null
        ? "Preis auf Anfrage"
        : `${item.price.toLocaleString("de-AT", { style: "currency", currency: "EUR" })}${item.price_type === "negotiable" ? " VB" : ""}`;
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pt-20">
        <Button asChild variant="outline" className="mb-4 rounded-xl">
          <Link href="/dartboerse">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zur Dartbörse
          </Link>
        </Button>
        {loading ? (
          <div className="py-24 text-center text-slate-500">
            Angebot wird geladen …
          </div>
        ) : error ? (
          <div className="py-24 text-center text-red-600">{error}</div>
        ) : !item ? (
          <Card className="rounded-3xl">
            <CardContent className="p-12 text-center">
              <Box className="mx-auto h-12 w-12 text-slate-300" />
              <h1 className="mt-4 text-xl font-black">
                Angebot nicht gefunden
              </h1>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <div className="space-y-5">
              <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
                <div className="relative overflow-hidden bg-slate-100">
                  <button
                    type="button"
                    onClick={() => images.length && setGalleryOpen(true)}
                    className="group relative block h-[420px] w-full sm:h-[560px] lg:h-[640px]"
                    aria-label="Bild vergrößern"
                  >
                    {images.length ? (
                      <Image
                        src={images[index]}
                        alt={`${item.title} – Bild ${index + 1}`}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 65vw"
                        className="object-contain p-3 transition duration-500 group-hover:scale-[1.015] sm:p-5"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-slate-200">
                        <Box className="h-20 w-20 text-slate-300" />
                        <span className="text-sm font-bold text-slate-400">
                          Kein Bild vorhanden
                        </span>
                      </div>
                    )}

                    {images.length ? (
                      <>
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent" />
                        <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-black text-white shadow-lg backdrop-blur-md">
                          <ZoomIn className="h-4 w-4" />
                          Vergrößern
                        </span>
                      </>
                    ) : null}
                  </button>

                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setIndex((current) =>
                            (current - 1 + images.length) % images.length,
                          )
                        }
                        className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/95 text-slate-900 shadow-xl transition hover:scale-105 hover:bg-white"
                        aria-label="Vorheriges Bild"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setIndex((current) => (current + 1) % images.length)
                        }
                        className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/95 text-slate-900 shadow-xl transition hover:scale-105 hover:bg-white"
                        aria-label="Nächstes Bild"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>

                      <span className="absolute bottom-4 left-4 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-black text-white shadow-lg backdrop-blur">
                        {index + 1} von {images.length}
                      </span>
                    </>
                  ) : null}

                  {item.status !== "approved" ? (
                    <span
                      className={`absolute left-4 top-4 rounded-full px-4 py-2 text-xs font-black text-white shadow-lg ${
                        item.status === "sold" ? "bg-slate-900" : "bg-amber-600"
                      }`}
                    >
                      {item.status === "sold" ? "VERKAUFT" : "RESERVIERT"}
                    </span>
                  ) : null}
                </div>

                {images.length > 1 ? (
                  <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
                    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {images.map((image, imageIndex) => (
                        <button
                          key={`${image}-${imageIndex}`}
                          type="button"
                          onClick={() => setIndex(imageIndex)}
                          className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-24 sm:w-32 ${
                            imageIndex === index
                              ? "border-orange-500 ring-2 ring-orange-100"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                          aria-label={`Bild ${imageIndex + 1} anzeigen`}
                        >
                          <Image
                            src={image}
                            alt={`${item.title} – Vorschau ${imageIndex + 1}`}
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
              <Card className="rounded-[2rem]">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-800">
                      <Tag className="mr-1 inline h-3 w-3" />
                      {categoryLabels[item.category]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      {conditionLabels[item.condition]}
                    </span>
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                    {item.title}
                  </h1>
                  <div className="mt-4 flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {[item.postal_code, item.city]
                      .filter(Boolean)
                      .join(" ")} · {item.country_code}
                  </div>
                  <div className="mt-7 border-t pt-6">
                    <h2 className="text-lg font-black">Beschreibung</h2>
                    <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">
                      {item.description || "Keine Beschreibung vorhanden."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-5">
              <Card className="rounded-[2rem] border-orange-200 bg-gradient-to-br from-white to-orange-50">
                <CardContent className="p-6">
                  <div className="text-sm font-black uppercase tracking-wide text-orange-700">
                    Preis
                  </div>
                  <div className="mt-2 text-3xl font-black">{price}</div>
                  <div className="mt-5 grid gap-2 text-sm font-bold text-slate-700">
                    {item.shipping_available ? (
                      <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                        <Truck className="h-5 w-5 text-orange-600" />
                        Versand möglich
                      </div>
                    ) : null}
                    {item.pickup_available ? (
                      <div className="flex items-center gap-2 rounded-xl bg-white p-3">
                        <PackageCheck className="h-5 w-5 text-orange-600" />
                        Abholung möglich
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[2rem]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-lg font-black">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Verkäufer kontaktieren
                  </div>
                  <div className="mt-4 font-black">{item.seller_name}</div>
                  <div className="mt-4 grid gap-2">
                    {currentUserId !== item.created_by ? (
                      <>
                        <Button
                          type="button"
                          onClick={() => void startConversation(true)}
                          disabled={startingChat || item.status === "sold"}
                          className="rounded-xl bg-orange-600 hover:bg-orange-700"
                        >
                          {startingChat ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Tag className="mr-2 h-4 w-4" />
                          )}
                          Preis anbieten
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void startConversation(false)}
                          disabled={startingChat || item.status === "sold"}
                          className="rounded-xl"
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Direktnachricht senden
                        </Button>
                      </>
                    ) : (
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link href="/dartboerse/nachrichten">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Meine Nachrichten
                        </Link>
                      </Button>
                    )}
                    {item.seller_email ? (
                      <Button asChild variant="outline" className="rounded-xl">
                        <a
                          href={`mailto:${item.seller_email}?subject=${encodeURIComponent(`Dartbörse: ${item.title}`)}`}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          E-Mail senden
                        </a>
                      </Button>
                    ) : null}
                    {item.seller_phone ? (
                      <Button asChild variant="outline" className="rounded-xl">
                        <a href={`tel:${item.seller_phone}`}>
                          <Phone className="mr-2 h-4 w-4" />
                          Anrufen
                        </a>
                      </Button>
                    ) : null}
                    {chatError ? (
                      <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
                        {chatError}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Die Plattform vermittelt nur den Kontakt. Prüfe Artikel und
                    Verkäufer sorgfältig und vermeide unsichere Vorauszahlungen.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      {mounted && galleryOpen && images.length
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/95 p-2 backdrop-blur-sm sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label={`Bildergalerie: ${item?.title || "Dartbörse"}`}
              onClick={() => setGalleryOpen(false)}
            >
              <div
                className="relative flex h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl sm:rounded-3xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white sm:px-5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black sm:text-base">
                      {item?.title}
                    </div>
                    <div className="mt-0.5 text-xs text-white/50">
                      Bild {index + 1} von {images.length}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGalleryOpen(false)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg transition hover:scale-105 hover:bg-slate-100"
                    aria-label="Galerie schließen"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative flex-1 overflow-hidden">
                  <Image
                    src={images[index]}
                    alt={`${item?.title || "Dartbörse"} – Bild ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain p-3 sm:p-6"
                  />

                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setIndex((current) =>
                            (current - 1 + images.length) % images.length,
                          )
                        }
                        className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-xl transition hover:scale-105 sm:left-5"
                        aria-label="Vorheriges Bild"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setIndex((current) => (current + 1) % images.length)
                        }
                        className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-xl transition hover:scale-105 sm:right-5"
                        aria-label="Nächstes Bild"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  ) : null}
                </div>

                {images.length > 1 ? (
                  <div className="border-t border-white/10 bg-slate-900 px-3 py-3 sm:px-5">
                    <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {images.map((image, imageIndex) => (
                        <button
                          key={`modal-${image}-${imageIndex}`}
                          type="button"
                          onClick={() => setIndex(imageIndex)}
                          className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-20 sm:w-28 ${
                            imageIndex === index
                              ? "border-orange-500"
                              : "border-white/15 hover:border-white/35"
                          }`}
                          aria-label={`Bild ${imageIndex + 1} anzeigen`}
                        >
                          <Image
                            src={image}
                            alt={`Vorschau ${imageIndex + 1}`}
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      <MobileBottomNav />
    </div>
  );
}
