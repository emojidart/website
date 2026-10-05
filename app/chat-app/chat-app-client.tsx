"use client";

import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Clock,
  Hash,
  X,
  ArrowLeft,
  Shield,
  Users,
  Info,
  Coffee,
  Paperclip,
  FileText,
  Image as ImageIcon,
  BarChart3,
  CheckCircle2,
    Search,
  FlaskConical,
  MoreVertical,
  Smile,
  Star,
  Reply,
  Pencil,
  Trash2,
  Newspaper,
  ClipboardList,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo, ChangeEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import ChatLineupPanel from "./chat-lineup-panel";
import ChatUpdatesPanel from "./chat-updates-panel";
import ChatMatchCard, { MATCH_CARD_PREFIX, parseChatMatchCardMessage } from "./chat-match-card";

type ChatScope = "team" | "captains" | "club" | "freizeit" | "vorstand" | "community" | "test";

// GLOBAL room ids (müssen zum SQL passen)
const CLUB_ROOM_ID = "11111111-1111-1111-1111-111111111111";
const FREIZEIT_ROOM_ID = "22222222-2222-2222-2222-222222222222";
const VORSTAND_ROOM_ID = "33333333-3333-3333-3333-333333333333";
const CAPTAINS_ROOM_ID = "44444444-4444-4444-4444-444444444444";
const COMMUNITY_ROOM_ID = "55555555-5555-5555-5555-555555555555";
const TEST_ROOM_ID = "66666666-6666-6666-6666-666666666666";
const TEST_CHAT_EMAILS = new Set([
  "wilhelmer.jimmy@gmail.com",
  "wilhelmerjimmy3@gmail.com",
]);

const CHAT_EMOJIS = ["😀","😂","😍","🥰","😎","🤔","😅","😭","😡","👍","👎","👏","🙌","🙏","💪","👌","❤️","🧡","🔥","🎯","🏆","🍻","🎉","🎂","✅","❌","👀","🤝","🤣","😉","😊","🥳"];
type ChatFilter = "all" | "unread" | "favorites";

// Rollen-Tabelle (falls du sie anders benannt hast, hier anpassen)
const ROLE_TABLE = "club_roles";
const ROLE_COL = "role";
const ROLE_PROFILE_COL = "user_id";

// Wer darf in den Vorstand-Chat?
const BOARD_ROLES = ["Vorstand", "Kassier", "Schriftführer"];

type ChatMessage = {
  id: string;
  user_id: string; // FK -> user_profiles.id (NOT auth.uid)
  message: string;
  room_id: string; // uuid as string
  scope: ChatScope;
  created_at: string;
  reply_to_message_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;

  message_type?: "text" | "poll";

  attachment_url?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;

  sender_player_id?: string | null;
  sender?: { name: string; photo_url: string | null } | null;
};

type ChatMessageRead = {
  message_id: string;
  user_id: string;
  read_at: string;
};

type ChatReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

type LastMessagePreview = {
  id: string;
  user_id: string;
  message: string | null;
  room_id: string;
  scope: ChatScope;
  created_at: string;
  message_type?: "text" | "poll";
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
};

type TeamRoom = {
  id: string; // ✅ chat_rooms.id (teams.chat_room_id)
  team_id: string; // ✅ teams.id (für Members-Liste)
  name: string;
  description: string | null;
  created_at?: string;
  logo_url?: string | null;
  role?: string | null; // Player | Captain | Co-Captain
  membership_visible_from?: string | null; // ab diesem Zeitpunkt darf die Team-Historie sichtbar sein
};

type UserProfileLite = {
  id: string;
  user_id: string;
  player_id: string | null;
  is_guest: boolean | null;
  is_blocked: boolean | null;
  blocked_reason: string | null;
};

type TeamMember = {
  player_id: string;
  name: string;
  photo_url: string | null;
  role: string | null;
};

type VorstandMember = {
  player_id: string;
  name: string;
  photo_url: string | null;
  role: string | null;
};

type ChatPoll = {
  id: string;
  message_id: string;
  question: string;
  allows_multiple: boolean;
  created_by: string;
  created_at: string;
};

type ChatPollOption = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
};

type ChatPollVote = {
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

function formatTimeVienna(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      timeZone: "Europe/Vienna",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatDateShortVienna(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      timeZone: "Europe/Vienna",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function dateKeyVienna(iso: string) {
  try {
    const dt = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Vienna",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(dt);
    const y = parts.find((p) => p.type === "year")?.value ?? "1970";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function dateLabelVienna(iso: string) {
  try {
    const now = new Date();
    const todayKey = dateKeyVienna(now.toISOString());
    const msgKey = dateKeyVienna(iso);

    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yKey = dateKeyVienna(yest.toISOString());

    if (msgKey === todayKey) return "Heute";
    if (msgKey === yKey) return "Gestern";
    const d = formatDateShortVienna(iso);
    return d || "—";
  } catch {
    return formatDateShortVienna(iso) || "—";
  }
}

function initials(name: string) {
  const n = (name || "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}

export default function TeamChatPage() {
  const { session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlScopeRaw = searchParams.get("scope") as ChatScope | null;
  const urlScope: ChatScope | null =
    urlScopeRaw &&
    (["team", "captains", "club", "freizeit", "vorstand", "community", "test"] as const).includes(
      urlScopeRaw,
    )
      ? urlScopeRaw
      : null;

  const urlRoomId = searchParams.get("room_id");
  const urlTabRaw = (searchParams.get("tab") || "").toLowerCase();
  const urlMatchId = searchParams.get("match_id");
  const urlTeamId = searchParams.get("team_id");
  const urlDraft = searchParams.get("draft");
  const urlNativeReply = searchParams.get("native_reply");
  const isMessengerApp = searchParams.get("source") === "messenger-app";

  const [activationCode, setActivationCode] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const activateMessenger = async () => {
    const code = activationCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setActivationError("Bitte einen 6-stelligen Aktivierungscode eingeben.");
      return;
    }

    setActivationLoading(true);
    setActivationError(null);

    try {
      let deviceId = "";
      if (typeof window !== "undefined") {
        deviceId = window.localStorage.getItem("emd_messenger_device_id") || "";
        if (!deviceId) {
          deviceId =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `emd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          window.localStorage.setItem("emd_messenger_device_id", deviceId);
        }
      }

      const { data, error } = await supabase.functions.invoke("messenger-activation", {
        body: {
          action: "activate",
          code,
          deviceId,
          deviceName: "EMD Messenger Android",
          platform: "android",
          appVersion: "1.0",
        },
      });

      if (error) {
        let message = error.message || "Aktivierung fehlgeschlagen.";
        try {
          const context = (error as any)?.context;
          if (context?.json) {
            const body = await context.json();
            if (body?.error) message = body.error;
          }
        } catch {}
        throw new Error(message);
      }

      if (!data?.tokenHash) {
        throw new Error(data?.error || "Messenger-Sitzung konnte nicht erstellt werden.");
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "email",
      });

      if (verifyError) throw verifyError;

      if (typeof window !== "undefined") {
        window.location.replace("/chat-app?source=messenger-app");
      }
    } catch (error: any) {
      setActivationError(error?.message || "Aktivierung fehlgeschlagen.");
    } finally {
      setActivationLoading(false);
    }
  };

  const deepLinkParams = {
    roomId: urlRoomId,
    scope: urlScope,
  };

  const [profile, setProfile] = useState<UserProfileLite | null>(null);
  const isTestUser = useMemo(
    () => TEST_CHAT_EMAILS.has((session?.user?.email || "").trim().toLowerCase()),
    [session?.user?.email],
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [clubVisibleFrom, setClubVisibleFrom] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pollsByMessage, setPollsByMessage] = useState<
    Record<string, ChatPoll>
  >({});
  const [pollOptionsByPoll, setPollOptionsByPoll] = useState<
    Record<string, ChatPollOption[]>
  >({});
  const [pollVotesByPoll, setPollVotesByPoll] = useState<
    Record<string, ChatPollVote[]>
  >({});

  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionsInput, setPollOptionsInput] = useState(["", ""]);
  const [pollSending, setPollSending] = useState(false);
  const [pollVoteNamesByOption, setPollVoteNamesByOption] = useState<
    Record<string, string[]>
  >({});
  const [openPollVotesForOption, setOpenPollVotesForOption] = useState<
    string | null
  >(null);
  const [openPollVotesOptionLabel, setOpenPollVotesOptionLabel] = useState<
    string | null
  >(null);
  const [readByMessage, setReadByMessage] = useState<
    Record<string, Set<string>>
  >({});
  const [readNamesByMessage, setReadNamesByMessage] = useState<
    Record<string, string[]>
  >({});
  const [openReadsFor, setOpenReadsFor] = useState<string | null>(null);
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);
  const [openImageName, setOpenImageName] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const nativeDraftApplied = useRef(false);
  const nativeReplySent = useRef(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [roomReady, setRoomReady] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const messagesCacheRef = useRef<Record<string, ChatMessage[]>>({});
  const markingRef = useRef(false);

  const [chatRooms, setChatRooms] = useState<TeamRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<TeamRoom | null>(null);

  // selectedScope determines which chat is shown
  const [selectedScope, setSelectedScope] = useState<ChatScope>("community");

  const currentRoomId = useMemo(() => {
    if (selectedScope === "club") return CLUB_ROOM_ID;
    if (selectedScope === "freizeit") return FREIZEIT_ROOM_ID;
    if (selectedScope === "vorstand") return VORSTAND_ROOM_ID;
    if (selectedScope === "captains") return CAPTAINS_ROOM_ID;
    if (selectedScope === "community") return COMMUNITY_ROOM_ID;
    if (selectedScope === "test") return TEST_ROOM_ID;
    return selectedRoom?.id ?? null; // ✅ chat_rooms.id
  }, [selectedScope, selectedRoom?.id]);

  const [roomsLoading, setRoomsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [appSection, setAppSection] = useState<"chats" | "updates" | "lineup">("chats");

  useEffect(() => {
    if (urlDraft && !nativeDraftApplied.current) {
      nativeDraftApplied.current = true;
      setNewMessage(urlDraft);
    }
  }, [urlDraft]);

  useEffect(() => {
    if (urlTabRaw === "aufstellung" || urlTabRaw === "lineup") {
      setAppSection("lineup");
      setMobileChatOpen(false);
      return;
    }
    if (urlTabRaw === "aktuell" || urlTabRaw === "updates") {
      setAppSection("updates");
      setMobileChatOpen(false);
      return;
    }
    if (urlTabRaw === "chats" || urlScope || urlRoomId) {
      setAppSection("chats");

      // Push-/Deep-Link auf dem Handy: direkt den eigentlichen Chat öffnen.
      if (
        (urlScope || urlRoomId) &&
        typeof window !== "undefined" &&
        window.innerWidth < 1024
      ) {
        setMobileChatOpen(true);
      }
    }
  }, [urlTabRaw, urlScope, urlRoomId]);
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
  const [favoriteChats, setFavoriteChats] = useState<Set<string>>(new Set());
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [myDisplayName, setMyDisplayName] = useState("Du");
  const [typingByRoom, setTypingByRoom] = useState<Record<string, { name: string; userId: string; expiresAt: number }>>({});
  const typingChannelRef = useRef<any>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [messageMenuPosition, setMessageMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, ChatReaction[]>>({});

  // Vorstand (club_roles.role = "Vorstand") can see/write in all chats
  const [isVorstand, setIsVorstand] = useState(false);
  const [canSeeVorstandChat, setCanSeeVorstandChat] = useState(false);

  const fetchIsVorstand = async () => {
    if (!profile?.user_id) return;
    const { data, error } = await supabase
      .from("club_roles")
      .select("role")
      .eq("user_id", profile?.user_id);

    if (!error && data) {
      const isV = data.some((r: any) => r.role === "Vorstand");
      setIsVorstand(isV);
      setCanSeeVorstandChat(isV);
    }
  };

  const [vorstandMembers, setVorstandMembers] = useState<VorstandMember[]>([]);
  const vorstandPlayerIdSet = useMemo(() => {
    return new Set(
      (vorstandMembers || []).map((m) => m.player_id).filter(Boolean),
    );
  }, [vorstandMembers]);

  // unreadCounts key: `${roomId}:${scope}`
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessagesByRoom, setLastMessagesByRoom] = useState<
    Record<string, LastMessagePreview | null>
  >({});

  // Team members (selected team) for Team-Chat header
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // GLOBAL captains/co-captains across all teams
  const [globalCaptains, setGlobalCaptains] = useState<TeamMember[]>([]);
  const [globalCaptainsLoading, setGlobalCaptainsLoading] = useState(false);

  const applyInitialSelection = (rooms: TeamRoom[]) => {
    const init = deepLinkParams;
    if (!init.scope && !init.roomId) return;

    const scopeToUse: ChatScope = init.scope ?? "team";

    if (scopeToUse === "test" && !isTestUser) return;
    if (scopeToUse === "vorstand" && !canSeeVorstandChat && !isVorstand) return;

    if (scopeToUse === "captains") {
      setSelectedScope("captains");
      return;
    }

    if (scopeToUse !== "team") {
      setSelectedScope(scopeToUse);
      return;
    }

    if (!init.roomId) return;

    setSelectedScope("team");

    const found = rooms.find((r) => r.id === init.roomId) ?? null;
    if (found) {
      setSelectedRoom(found);
      return;
    }
  };

  useEffect(() => {
    applyDeepLinkToExistingRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    urlRoomId,
    urlScope,
    chatRooms,
    selectedRoom?.id,
    selectedScope,
    canSeeVorstandChat,
    isVorstand,
  ]);

  const applyDeepLinkToExistingRooms = () => {
    const init = deepLinkParams;
    if (!init.scope && !init.roomId) return;

    const scopeToUse: ChatScope = init.scope ?? "team";

    if (scopeToUse === "test" && !isTestUser) return;
    if (scopeToUse === "vorstand" && !canSeeVorstandChat && !isVorstand) return;

    if (scopeToUse === "captains") {
      if (selectedScope !== "captains") {
        setSelectedScope("captains");
      }
      return;
    }

    if (scopeToUse !== "team") {
      if (selectedScope !== scopeToUse) {
        setSelectedScope(scopeToUse);
      }
      return;
    }

    if (!chatRooms.length || !init.roomId) return;

    if (selectedScope !== "team") {
      setSelectedScope("team");
    }

    const found = chatRooms.find((r) => r.id === init.roomId) ?? null;

    if (!found) {
      return;
    }

    if (selectedRoom?.id !== found.id) {
      setSelectedRoom(found);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;

    // Gäste dürfen nur in den Community-Chat.
    if (profile.is_guest && !isTestUser) {
      setSelectedScope("community");
      setChatRooms([]);
      setSelectedRoom(null);
      setRoomsLoading(false);
      return;
    }

    // Vorstand sieht ALLE Team-Chats (auch ohne Spieler-Zuordnung)
    if (isVorstand) {
      fetchAllTeamRooms();
      return;
    }

    // Alle anderen: nur eigene Team-Chats (über team_members)
    if (profile.player_id) {
      fetchMyTeamRooms(profile.player_id);
    } else {
      setChatRooms([]);
      setSelectedRoom(null);
      setRoomsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.player_id, profile?.is_guest, isVorstand]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    if (!messages.length || appSection !== "chats") return;

    const id = requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });

    return () => cancelAnimationFrame(id);
  }, [messages, appSection]);

  useEffect(() => {
    messagesRef.current = messages;
    if (currentRoomId) {
      messagesCacheRef.current[`${selectedScope}:${currentRoomId}`] = messages;
    }
  }, [messages, currentRoomId, selectedScope]);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Load global captains once profile exists
  useEffect(() => {
    if (!profile?.id) return;
    fetchAllCaptains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Aktualisiert Badges in der Chatliste auch dann,
  // wenn eine neue Nachricht in einem anderen Raum reinkommt.
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("chat_list_unread_counts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          fetchUnreadCounts(chatRooms);
          fetchLastMessagePreviews(chatRooms);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, chatRooms.length]);

  // Load board access + board members once profile exists
  useEffect(() => {
    if (!profile?.id) return;
    fetchVorstandAccess();
    fetchIsVorstand();
    fetchVorstandMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!currentRoomId || !mobileChatOpen) return;
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;

    // Bei Push-/Deep-Link wird der Chat auf Mobile direkt sichtbar.
    // Dann auch als besucht markieren, sobald die Chatansicht offen ist.
    const id = window.setTimeout(() => {
      markCurrentAsVisited();
    }, 80);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileChatOpen, currentRoomId, selectedScope]);

  useEffect(() => {
    if (!currentRoomId) return;

    // WhatsApp-artig: bereits geladene Räume sofort aus dem Speicher zeigen.
    // Supabase aktualisiert danach unsichtbar im Hintergrund.
    const cacheKey = `${selectedScope}:${currentRoomId}`;
    const cachedMessages = messagesCacheRef.current[cacheKey];
    if (cachedMessages) {
      setMessages(cachedMessages);
      setRoomReady(true);
    } else {
      // Kein sichtbarer Ladezustand beim Raumwechsel. Der Bereich bleibt ruhig,
      // bis die ersten Daten da sind.
      setMessages([]);
      setRoomReady(false);
    }

    void fetchMessages();

    // Wichtig:
    // Auf Handy startet die Seite mit der Chatliste.
    // Nur weil im Hintergrund ein Raum vorausgewählt ist, darf er NICHT automatisch als gelesen markiert werden.
    // Gelesen wird erst, wenn der Chat wirklich geöffnet ist. Auf Desktop ist der Chat sichtbar, daher dort weiterhin markieren.
    const shouldMarkAsVisited =
      typeof window !== "undefined" &&
      (window.innerWidth >= 1024 || mobileChatOpen);

    if (shouldMarkAsVisited) {
      markCurrentAsVisited();
    }

    // ✅ Team members brauchen TEAM-ID, nicht room-id
    if (selectedScope === "team" && selectedRoom?.team_id) {
      fetchTeamMembers(selectedRoom.team_id);
    } else {
      setTeamMembers([]);
    }

    const unsubMsg = subscribeToMessages();
    const unsubReads = subscribeToReads();
    const unsubPollVotes = subscribeToPollVotes();
    const unsubReactions = subscribeToReactions();

    return () => {
      unsubMsg?.();
      unsubReads?.();
      unsubPollVotes?.();
      unsubReactions?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId]);

  const canSeeCaptainChat = useMemo(() => {
    // Zugriff auf globalen Captain-Chat, wenn du in irgendeinem Team Captain/Co-Captain bist
    return chatRooms.some(
      (r) => r.role === "Captain" || r.role === "Co-Captain",
    );
  }, [chatRooms]);

  useEffect(() => {
    if (!currentRoomId || appSection !== "chats") return;

    const id = requestAnimationFrame(() => {
      scrollToBottom("auto");
    });

    return () => cancelAnimationFrame(id);
  }, [currentRoomId, selectedRoom?.id, selectedScope, messages.length, appSection]);

  useEffect(() => {
    if (!messages.length) return;
    if (document.visibilityState !== "visible") return;
    if (!document.hasFocus()) return;
    markMessagesAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId, selectedScope, messages.length]);

  const selectedRoomName = useMemo(() => {
    if (selectedScope === "community") return "EMD Community";
    if (selectedScope === "test") return "🧪 Jimmy Testchat";
    if (selectedScope === "club") return "Vereinsinfo";
    if (selectedScope === "freizeit") return "Freizeit";
    if (selectedScope === "vorstand") return "Vorstand";
    if (selectedScope === "captains") return "Captain-Chat";
    if (!selectedRoom) return "Team-Chat";
    return selectedRoom.name;
  }, [selectedRoom, selectedScope]);

  const unreadKey = (roomId: string, scope: ChatScope) => `${roomId}:${scope}`;

  const lastPreviewKey = (roomId: string, scope: ChatScope) =>
    `${roomId}:${scope}`;

  const getLastPreviewText = (preview?: LastMessagePreview | null) => {
    if (!preview) return "Noch keine Nachrichten";
    if ((preview.message || "").startsWith(MATCH_CARD_PREFIX)) return "📋 Spiel & Zusage";
    if (preview.message_type === "poll") return "📊 Umfrage";
    if (preview.attachment_name) {
      if (preview.attachment_type?.startsWith("image/"))
        return `📷 ${preview.attachment_name}`;
      if (preview.attachment_type === "application/pdf")
        return `📄 ${preview.attachment_name}`;
      return `📎 ${preview.attachment_name}`;
    }
    const text = (preview.message || "").trim();
    return text || "Nachricht";
  };

  const getVisibleFromForChat = (
    roomId: string,
    scope: ChatScope,
    roomsOverride?: TeamRoom[],
  ) => {
    if (scope === "club" || scope === "freizeit") {
      return clubVisibleFrom;
    }

    if (scope === "team") {
      const rooms = roomsOverride ?? chatRooms;
      return rooms.find((room) => room.id === roomId)?.membership_visible_from ?? null;
    }

    // Community, Vorstand und Captain-Chat bleiben unverändert.
    return null;
  };

  const fetchLastMessagePreviews = async (roomsOverride?: TeamRoom[]) => {
    const rooms = roomsOverride ?? chatRooms;
    const targets: Array<{
      roomId: string;
      scope: ChatScope;
      visibleFrom?: string | null;
    }> = [
      { roomId: COMMUNITY_ROOM_ID, scope: "community", visibleFrom: null },
    ];

    if (isTestUser) {
      targets.push({ roomId: TEST_ROOM_ID, scope: "test", visibleFrom: null });
    }

    if (!profile?.is_guest) {
      targets.push(
        { roomId: CLUB_ROOM_ID, scope: "club", visibleFrom: clubVisibleFrom },
        { roomId: FREIZEIT_ROOM_ID, scope: "freizeit", visibleFrom: clubVisibleFrom },
      );
    }

    if (canSeeVorstandChat)
      targets.push({ roomId: VORSTAND_ROOM_ID, scope: "vorstand", visibleFrom: null });
    if (canSeeCaptainChat || isVorstand)
      targets.push({ roomId: CAPTAINS_ROOM_ID, scope: "captains", visibleFrom: null });
    rooms.forEach((room) =>
      targets.push({
        roomId: room.id,
        scope: "team",
        visibleFrom: room.membership_visible_from ?? null,
      }),
    );

    try {
      const next: Record<string, LastMessagePreview | null> = {};

      await Promise.all(
        targets.map(async (target) => {
          let previewQuery = supabase
            .from("chat_messages")
            .select(
              "id,user_id,message,room_id,scope,created_at,message_type,attachment_name,attachment_type,attachment_size",
            )
            .eq("room_id", target.roomId)
            .eq("scope", target.scope);

          if (target.visibleFrom) {
            previewQuery = previewQuery.gte("created_at", target.visibleFrom);
          }

          const { data, error } = await previewQuery
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error) {
            next[lastPreviewKey(target.roomId, target.scope)] =
              (data as LastMessagePreview | null) ?? null;
          }
        }),
      );

      setLastMessagesByRoom(next);
    } catch (error) {
      console.error("Error fetching last message previews:", error);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;
    if (roomsLoading) return;
    fetchLastMessagePreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.id,
    roomsLoading,
    chatRooms.length,
    canSeeVorstandChat,
    canSeeCaptainChat,
    isVorstand,
  ]);

  useEffect(() => {
    if (!currentRoomId) return;
    if (!messages.length) return;

    const latest = messages[messages.length - 1];

    // Beim schnellen Raumwechsel darf die letzte Nachricht des vorherigen
    // Chats nicht kurz als Vorschau des neuen Chats gespeichert werden.
    if (latest.room_id !== currentRoomId || latest.scope !== selectedScope) return;

    setLastMessagesByRoom((prev) => ({
      ...prev,
      [lastPreviewKey(currentRoomId, selectedScope)]:
        latest as LastMessagePreview,
    }));
  }, [currentRoomId, selectedScope, messages]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  const isImageFile = (type?: string | null) => {
    return !!type && type.startsWith("image/");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) {
      setSelectedFiles([]);
      return;
    }

    const validFiles: File[] = [];

    for (const file of files) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Dateityp nicht erlaubt",
          description: `${file.name}: Erlaubt sind JPG, PNG, WEBP und PDF.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Datei zu groß",
          description: `${file.name}: Maximal 10 MB erlaubt.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    setSelectedFiles(validFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!currentRoomId) {
      throw new Error("Kein roomId vorhanden");
    }

    const safeName = file.name
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_");

    const filePath = `${currentRoomId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("uploadError", uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

    return {
      attachment_url: publicUrl,
      attachment_path: filePath,
      attachment_name: file.name,
      attachment_type: file.type,
      attachment_size: file.size,
    };
  };

  const loadPollDataForMessages = async (messageRows: ChatMessage[]) => {
    const pollMessages = messageRows.filter((m) => m.message_type === "poll");
    if (pollMessages.length === 0) {
      setPollsByMessage({});
      setPollOptionsByPoll({});
      setPollVotesByPoll({});
      return;
    }

    const messageIds = pollMessages.map((m) => m.id);

    const { data: pollsData, error: pollsError } = await supabase
      .from("chat_polls")
      .select("id,message_id,question,allows_multiple,created_by,created_at")
      .in("message_id", messageIds);

    if (pollsError) {
      console.error("loadPollDataForMessages pollsError", pollsError);
      return;
    }

    const polls = (pollsData as ChatPoll[]) || [];
    const pollIds = polls.map((p) => p.id);

    const nextPollsByMessage: Record<string, ChatPoll> = {};
    polls.forEach((p) => {
      nextPollsByMessage[p.message_id] = p;
    });
    setPollsByMessage(nextPollsByMessage);

    if (pollIds.length === 0) {
      setPollOptionsByPoll({});
      setPollVotesByPoll({});
      return;
    }

    const { data: optionsData, error: optionsError } = await supabase
      .from("chat_poll_options")
      .select("id,poll_id,label,position")
      .in("poll_id", pollIds)
      .order("position", { ascending: true });

    if (optionsError) {
      console.error("loadPollDataForMessages optionsError", optionsError);
      return;
    }

    const nextOptionsByPoll: Record<string, ChatPollOption[]> = {};
    ((optionsData as ChatPollOption[]) || []).forEach((opt) => {
      if (!nextOptionsByPoll[opt.poll_id]) nextOptionsByPoll[opt.poll_id] = [];
      nextOptionsByPoll[opt.poll_id].push(opt);
    });
    setPollOptionsByPoll(nextOptionsByPoll);

    const { data: votesData, error: votesError } = await supabase
      .from("chat_poll_votes")
      .select("poll_id,option_id,user_id,created_at")
      .in("poll_id", pollIds);

    if (votesError) {
      console.error("loadPollDataForMessages votesError", votesError);
      return;
    }

    const voteRows = (votesData as ChatPollVote[]) || [];

    const nextVotesByPoll: Record<string, ChatPollVote[]> = {};
    voteRows.forEach((vote) => {
      if (!nextVotesByPoll[vote.poll_id]) nextVotesByPoll[vote.poll_id] = [];
      nextVotesByPoll[vote.poll_id].push(vote);
    });
    setPollVotesByPoll(nextVotesByPoll);

    const voteUserIds = Array.from(
      new Set(voteRows.map((v) => v.user_id).filter(Boolean)),
    );

    if (voteUserIds.length === 0) {
      setPollVoteNamesByOption({});
      return;
    }

    const { data: voteProfiles, error: voteProfilesError } = await supabase
      .from("user_profiles")
      .select("id,player_id")
      .in("id", voteUserIds);

    if (voteProfilesError) {
      console.error(
        "loadPollDataForMessages voteProfilesError",
        voteProfilesError,
      );
      setPollVoteNamesByOption({});
      return;
    }

    const votePlayerIds = Array.from(
      new Set(
        ((voteProfiles as any[]) || []).map((p) => p.player_id).filter(Boolean),
      ),
    );

    const votePlayerMap = new Map<string, string>();

    if (votePlayerIds.length > 0) {
      const { data: votePlayers, error: votePlayersError } = await supabase
        .from("club_players")
        .select("id,name")
        .in("id", votePlayerIds);

      if (votePlayersError) {
        console.error(
          "loadPollDataForMessages votePlayersError",
          votePlayersError,
        );
        setPollVoteNamesByOption({});
        return;
      }

      ((votePlayers as any[]) || []).forEach((p) => {
        if (p?.id) votePlayerMap.set(p.id, p.name);
      });
    }

    const voteProfileToName = new Map<string, string>();
    ((voteProfiles as any[]) || []).forEach((p) => {
      const name = p?.player_id
        ? (votePlayerMap.get(p.player_id) ?? "Unbekannt")
        : "Unbekannt";
      voteProfileToName.set(p.id, name);
    });

    const nextPollVoteNamesByOption: Record<string, string[]> = {};
    voteRows.forEach((vote) => {
      if (!nextPollVoteNamesByOption[vote.option_id])
        nextPollVoteNamesByOption[vote.option_id] = [];
      nextPollVoteNamesByOption[vote.option_id].push(
        voteProfileToName.get(vote.user_id) ?? "Unbekannt",
      );
    });

    Object.keys(nextPollVoteNamesByOption).forEach((optionId) => {
      nextPollVoteNamesByOption[optionId] = nextPollVoteNamesByOption[
        optionId
      ].sort((a, b) => a.localeCompare(b));
    });

    setPollVoteNamesByOption(nextPollVoteNamesByOption);
  };

  const resetPollForm = () => {
    setPollQuestion("");
    setPollOptionsInput(["", ""]);
  };

  const addPollOptionField = () => {
    setPollOptionsInput((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, ""];
    });
  };

  const updatePollOptionField = (index: number, value: string) => {
    setPollOptionsInput((prev) =>
      prev.map((item, i) => (i === index ? value : item)),
    );
  };

  const removePollOptionField = (index: number) => {
    setPollOptionsInput((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const sendPoll = async () => {
    if (!profile?.id) return;
    if (!currentRoomId) return;

    const cleanQuestion = pollQuestion.trim();
    const cleanOptions = pollOptionsInput.map((o) => o.trim()).filter(Boolean);

    if (!cleanQuestion) {
      toast({
        title: "Frage fehlt",
        description: "Bitte gib eine Frage ein.",
        variant: "destructive",
      });
      return;
    }

    if (cleanOptions.length < 2) {
      toast({
        title: "Zu wenig Optionen",
        description: "Bitte mindestens 2 Optionen eingeben.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPollSending(true);

      const { data: insertedMessage, error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          user_id: profile.id,
          message: "",
          room_id: currentRoomId,
          scope: selectedScope,
          message_type: "poll",
        })
        .select("id")
        .single();

      if (msgError) throw msgError;

      const messageId = insertedMessage.id;

      const { data: insertedPoll, error: pollError } = await supabase
        .from("chat_polls")
        .insert({
          message_id: messageId,
          question: cleanQuestion,
          allows_multiple: false,
          created_by: profile.id,
        })
        .select("id")
        .single();

      if (pollError) throw pollError;

      const pollId = insertedPoll.id;

      const optionRows = cleanOptions.map((label, index) => ({
        poll_id: pollId,
        label,
        position: index,
      }));

      const { error: optionsError } = await supabase
        .from("chat_poll_options")
        .insert(optionRows);

      if (optionsError) throw optionsError;

      setPollDialogOpen(false);
      resetPollForm();
      await fetchMessages();
    } catch (error: any) {
      console.error("sendPoll error", error);
      toast({
        title: "Fehler",
        description:
          error?.message || "Abstimmung konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setPollSending(false);
    }
  };

  const voteOnPoll = async (pollId: string, optionId: string) => {
    if (!profile?.id) return;

    try {
      const existingVotes = pollVotesByPoll[pollId] || [];
      const myVotes = existingVotes.filter((v) => v.user_id === profile.id);

      if (myVotes.some((v) => v.option_id === optionId)) {
        return;
      }

      if (myVotes.length > 0) {
        const { error: deleteError } = await supabase
          .from("chat_poll_votes")
          .delete()
          .eq("poll_id", pollId)
          .eq("user_id", profile.id);

        if (deleteError) throw deleteError;
      }

      const { error: insertError } = await supabase
        .from("chat_poll_votes")
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: profile.id,
        });

      if (insertError) throw insertError;

      await loadPollDataForMessages(messagesRef.current);
    } catch (error: any) {
      console.error("voteOnPoll error", error);
      toast({
        title: "Fehler",
        description:
          error?.message || "Stimme konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const loadMyProfile = async () => {
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id,is_guest,is_blocked,blocked_reason")
        .eq("user_id", session!.user.id)
        .maybeSingle();

      if (error) throw error;

      if ((data as any)?.is_blocked) {
        toast({
          title: "Zugang gesperrt",
          description:
            (data as any)?.blocked_reason ||
            "Dein Zugang wurde gesperrt. Bitte wende dich an den Verein.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        router.push("/member-login");
        setProfile(null);
        return;
      }

      if ((data as any)?.is_guest) {
        setMyDisplayName(session?.user?.email?.split("@")[0] || "Du");
        setSelectedScope("community");
        setSelectedRoom(null);
        setClubVisibleFrom(null);
      } else if ((data as any)?.player_id) {
        const { data: clubPlayer, error: clubPlayerError } = await supabase
          .from("club_players")
          .select("club_joined_at,created_at,name")
          .eq("id", (data as any).player_id)
          .maybeSingle();

        if (clubPlayerError) {
          console.error("loadMyProfile club_players error", clubPlayerError);
          setClubVisibleFrom(null);
        } else {
          // Bevorzugt echtes Beitrittsdatum, sonst Zeitpunkt der Anlage des Mitglieds.
          setClubVisibleFrom(
            (clubPlayer as any)?.club_joined_at ??
              (clubPlayer as any)?.created_at ??
              null,
          );
          if ((clubPlayer as any)?.name) setMyDisplayName((clubPlayer as any).name);
        }
      } else {
        setClubVisibleFrom(null);
      }

      setProfile((data as any) ?? null);
    } catch (e) {
      console.error("loadMyProfile error", e);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchAllTeamRooms = async () => {
    try {
      setRoomsLoading(true);

      const { data: teams, error } = await supabase
        .from("teams")
        .select("id, name, description, created_at, logo_url, chat_room_id")
        .order("name", { ascending: true });

      if (error) throw error;

      const rooms: TeamRoom[] =
        (teams || [])
          .map((t: any) => {
            if (!t?.id || !t?.chat_room_id) return null;
            return {
              id: t.chat_room_id, // ✅ chat_rooms.id
              team_id: t.id, // ✅ teams.id
              name: t.name,
              description: t.description ?? null,
              created_at: t.created_at,
              logo_url: t.logo_url ?? null,
              role: "Vorstand",
            } as TeamRoom;
          })
          .filter(Boolean) || [];

      rooms.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setChatRooms(rooms);

      const isTeamDeepLink =
        (deepLinkParams.scope ?? "team") === "team" && !!deepLinkParams.roomId;

      // ✅ URL-Auswahl anwenden (nur 1x)
      applyInitialSelection(rooms);

      if (
        !["club", "freizeit", "vorstand", "captains"].includes(selectedScope) &&
        !isTeamDeepLink
      ) {
        let nextSelected = selectedRoom;
        if (!nextSelected && rooms.length > 0) nextSelected = rooms[0];
        if (nextSelected && !rooms.find((r) => r.id === nextSelected!.id))
          nextSelected = rooms[0] ?? null;
        setSelectedRoom(nextSelected ?? null);
      }

      setTimeout(() => fetchUnreadCounts(rooms), 150);
      setTimeout(() => fetchLastMessagePreviews(rooms), 200);
    } catch (error) {
      console.error("Error fetching all team rooms:", error);
      toast({
        title: "Fehler",
        description: "Die Team-Chats konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchMyTeamRooms = async (playerId: string) => {
    try {
      setRoomsLoading(true);

      const { data: memberships, error: membershipsError } = await supabase
        .from("team_members")
        .select(
          "role, joined_at, created_at, teams:teams(id, name, description, created_at, logo_url, chat_room_id)",
        )
        .eq("player_id", playerId)
        .is("left_at", null);

      if (membershipsError) throw membershipsError;

      const rooms: TeamRoom[] =
        (memberships || [])
          .map((m: any) => {
            const t = m.teams;
            if (!t?.id || !t?.chat_room_id) return null;
            return {
              id: t.chat_room_id, // ✅ chat_rooms.id
              team_id: t.id, // ✅ teams.id
              name: t.name,
              description: t.description ?? null,
              created_at: t.created_at,
              logo_url: t.logo_url ?? null,
              role: m.role ?? null,
              membership_visible_from: m.joined_at ?? m.created_at ?? null,
            } as TeamRoom;
          })
          .filter(Boolean) || [];

      rooms.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setChatRooms(rooms);

      const isTeamDeepLink =
        (deepLinkParams.scope ?? "team") === "team" && !!deepLinkParams.roomId;

      // ✅ URL-Auswahl anwenden (nur 1x)
      applyInitialSelection(rooms);

      if (
        !["club", "freizeit", "vorstand", "captains"].includes(selectedScope) &&
        !isTeamDeepLink
      ) {
        let nextSelected = selectedRoom;
        if (!nextSelected && rooms.length > 0) nextSelected = rooms[0];
        if (nextSelected && !rooms.find((r) => r.id === nextSelected!.id))
          nextSelected = rooms[0] ?? null;
        setSelectedRoom(nextSelected ?? null);
      }

      setTimeout(() => fetchUnreadCounts(rooms), 150);
      setTimeout(() => fetchLastMessagePreviews(rooms), 200);
    } catch (error) {
      console.error("Error fetching my team rooms:", error);
      toast({
        title: "Fehler",
        description: "Deine Team-Chats konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      setMembersLoading(true);

      const { data: mems, error: memErr } = await supabase
        .from("team_members")
        .select("player_id, role")
        .eq("team_id", teamId)
        .is("left_at", null);

      if (memErr) throw memErr;

      const rows = (mems as any[] | null) ?? [];
      const playerIds = Array.from(
        new Set(rows.map((r) => r.player_id).filter(Boolean)),
      );

      if (playerIds.length === 0) {
        setTeamMembers([]);
        return;
      }

      const { data: players, error: pErr } = await supabase
        .from("club_players")
        .select("id, name, photo_url")
        .in("id", playerIds);

      if (pErr) throw pErr;

      const pMap = new Map<
        string,
        { name: string; photo_url: string | null }
      >();
      (players as any[] | null)?.forEach((p) => {
        if (p?.id)
          pMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null });
      });

      const full: TeamMember[] = rows
        .map((r) => {
          const p = pMap.get(r.player_id);
          if (!p) return null;
          return {
            player_id: r.player_id,
            name: p.name,
            photo_url: p.photo_url ?? null,
            role: r.role ?? null,
          } as TeamMember;
        })
        .filter(Boolean) as any;

      const roleRank = (role: string | null) => {
        if (role === "Captain") return 0;
        if (role === "Co-Captain") return 1;
        return 2;
      };

      full.sort((a, b) => {
        const rr = roleRank(a.role) - roleRank(b.role);
        if (rr !== 0) return rr;
        return (a.name || "").localeCompare(b.name || "");
      });

      setTeamMembers(full);
    } catch (e) {
      console.error("fetchTeamMembers error", e);
      setTeamMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchAllCaptains = async () => {
    try {
      setGlobalCaptainsLoading(true);

      const { data: mems, error: memErr } = await supabase
        .from("team_members")
        .select("player_id, role")
        .in("role", ["Captain", "Co-Captain"])
        .is("left_at", null);

      if (memErr) throw memErr;

      const rows = (mems as any[] | null) ?? [];
      const playerIds = Array.from(
        new Set(rows.map((r) => r.player_id).filter(Boolean)),
      );

      if (playerIds.length === 0) {
        setGlobalCaptains([]);
        return;
      }

      const { data: players, error: pErr } = await supabase
        .from("club_players")
        .select("id, name, photo_url")
        .in("id", playerIds);

      if (pErr) throw pErr;

      const pMap = new Map<
        string,
        { name: string; photo_url: string | null }
      >();
      (players as any[] | null)?.forEach((p) => {
        if (p?.id)
          pMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null });
      });

      const unique: TeamMember[] = playerIds
        .map((pid) => {
          const p = pMap.get(pid);
          if (!p) return null;
          const roles = rows
            .filter((r) => r.player_id === pid)
            .map((r) => r.role);
          const role = roles.includes("Captain") ? "Captain" : "Co-Captain";
          return { player_id: pid, name: p.name, photo_url: p.photo_url, role };
        })
        .filter(Boolean) as any;

      unique.sort((a, b) => {
        const rank = (r: string | null) => (r === "Captain" ? 0 : 1);
        const rr = rank(a.role) - rank(b.role);
        if (rr !== 0) return rr;
        return (a.name || "").localeCompare(b.name || "");
      });

      setGlobalCaptains(unique);
    } catch (e) {
      console.error("fetchAllCaptains error", e);
      setGlobalCaptains([]);
    } finally {
      setGlobalCaptainsLoading(false);
    }
  };

  const fetchVorstandAccess = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from(ROLE_TABLE)
        .select(`${ROLE_COL}`)
        .eq(ROLE_PROFILE_COL, session!.user.id)
        .in(ROLE_COL, BOARD_ROLES);

      if (error) throw error;
      setCanSeeVorstandChat(((data as any[]) ?? []).length > 0);
    } catch (e) {
      console.error("fetchVorstandAccess error", e);
      setCanSeeVorstandChat(false);
    }
  };

  const fetchVorstandMembers = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from(ROLE_TABLE)
        .select(`${ROLE_PROFILE_COL}, role`)
        .in("role", BOARD_ROLES);

      if (rolesError) throw rolesError;

      const authUserIds = Array.from(
        new Set(
          ((roles as any[]) || [])
            .map((r) => r?.[ROLE_PROFILE_COL])
            .filter(Boolean),
        ),
      );

      if (authUserIds.length === 0) {
        setVorstandMembers([]);
        return;
      }

      const roleByAuthUserId = new Map<string, string>();
      ((roles as any[]) || []).forEach((r) => {
        const uid = r?.[ROLE_PROFILE_COL];
        if (uid) roleByAuthUserId.set(uid, r.role);
      });

      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, user_id, player_id")
        .in("user_id", authUserIds);

      if (profilesError) throw profilesError;

      const playerIds = Array.from(
        new Set(
          ((profiles as any[]) || []).map((p) => p.player_id).filter(Boolean),
        ),
      );

      if (playerIds.length === 0) {
        setVorstandMembers([]);
        return;
      }

      const { data: players, error: playersError } = await supabase
        .from("club_players")
        .select("id, name, photo_url")
        .in("id", playerIds);

      if (playersError) throw playersError;

      const playerMap = new Map<
        string,
        { name: string; photo_url: string | null }
      >();
      ((players as any[]) || []).forEach((p) => {
        if (p?.id)
          playerMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null });
      });

      const members: TeamMember[] = ((profiles as any[]) || [])
        .map((p) => {
          const info = playerMap.get(p.player_id);
          if (!info) return null;
          const role = roleByAuthUserId.get(p.user_id) ?? "Vorstand";
          return {
            player_id: p.player_id,
            name: info.name,
            photo_url: info.photo_url,
            role,
          };
        })
        .filter(Boolean) as any;

      members.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setVorstandMembers(members);
    } catch (e) {
      console.error("fetchVorstandMembers error", e);
      setVorstandMembers([]);
    }
  };

  const fetchMessages = async () => {
    if (selectedScope === "test" && !isTestUser) {
      setSelectedScope("community");
      setMessages([]);
      return;
    }

    if (
      profile?.is_guest &&
      selectedScope !== "community" &&
      !(selectedScope === "test" && isTestUser)
    ) {
      setSelectedScope("community");
      setMessages([]);
      return;
    }

    if (selectedScope === "team") {
      if (!selectedRoom) {
        setMessages([]);
        return;
      }
    }

    if (selectedScope === "captains" && !canSeeCaptainChat && !isVorstand) {
      setMessages([]);
      return;
    }

    if (selectedScope === "vorstand" && !canSeeVorstandChat && !isVorstand) {
      setMessages([]);
      return;
    }

    const roomId = currentRoomId;
    if (!roomId) {
      setMessages([]);
      return;
    }

    try {
      const visibleFrom = getVisibleFromForChat(
        roomId,
        selectedScope,
        selectedScope === "team" && selectedRoom ? [selectedRoom] : undefined,
      );

      let messagesQuery = supabase
        .from("chat_messages")
        .select(
          `
  id,
  user_id,
  message,
  room_id,
  scope,
  created_at,
  reply_to_message_id,
  edited_at,
  deleted_at,
  message_type,
  attachment_url,
  attachment_path,
  attachment_name,
  attachment_type,
  attachment_size
`,
        )
        .eq("room_id", roomId)
        .eq("scope", selectedScope);

      if (visibleFrom) {
        messagesQuery = messagesQuery.gte("created_at", visibleFrom);
      }

      const { data: messagesData, error: messagesError } = await messagesQuery
        .order("created_at", { ascending: true })
        .limit(200);

      if (messagesError) throw messagesError;

      const rows = (messagesData as any[]) || [];
      if (rows.length === 0) {
        const cacheKey = `${selectedScope}:${roomId}`;
        messagesCacheRef.current[cacheKey] = [];
        setMessages([]);
        setRoomReady(true);
        return;
      }

      const profileIds = Array.from(new Set(rows.map((r) => r.user_id)));

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id,player_id,is_guest,user_id")
        .in("id", profileIds);

      const profileToPlayer = new Map<string, string>();
      (profiles as any[] | null)?.forEach((p) => {
        if (p?.id && p?.player_id) profileToPlayer.set(p.id, p.player_id);
      });

      const playerIds = Array.from(
        new Set(
          (profiles as any[] | null)?.map((p) => p.player_id).filter(Boolean) ??
            [],
        ),
      );

      const { data: players } = await supabase
        .from("club_players")
        .select("id,name,photo_url")
        .in("id", playerIds);

      const playerMap = new Map<
        string,
        { name: string; photo_url: string | null }
      >();
      (players as any[] | null)?.forEach((p) => {
        playerMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null });
      });

      const guestAuthUserIds = Array.from(
        new Set(
          ((profiles as any[] | null) ?? [])
            .filter((p) => p?.is_guest)
            .map((p) => p.user_id)
            .filter(Boolean),
        ),
      );

      const guestNameMap = new Map<string, string>();

      if (guestAuthUserIds.length > 0) {
        const { data: guests } = await supabase
          .from("guest_requests")
          .select("auth_user_id,full_name,player_name")
          .in("auth_user_id", guestAuthUserIds);

        (guests as any[] | null)?.forEach((g) => {
          if (!g?.auth_user_id) return;
          guestNameMap.set(
            g.auth_user_id,
            g.player_name || g.full_name || "Gast",
          );
        });
      }

      const profileInfoMap = new Map<string, any>();
      (profiles as any[] | null)?.forEach((p) => {
        if (p?.id) profileInfoMap.set(p.id, p);
      });

      const withSender = rows.map((r) => {
        const displayRow = r.deleted_at
          ? {
              ...r,
              message: "Diese Nachricht wurde gelöscht",
              message_type: "text",
              attachment_url: null,
              attachment_path: null,
              attachment_name: null,
              attachment_type: null,
              attachment_size: null,
            }
          : r;
        const info = profileInfoMap.get(displayRow.user_id);
        const playerId = profileToPlayer.get(displayRow.user_id);

        let sender = playerId ? (playerMap.get(playerId) ?? null) : null;

        if (!sender && info?.is_guest) {
          sender = {
            name: guestNameMap.get(info.user_id) || "Gast",
            photo_url: null,
          };
        }

        if (!sender) {
          sender = { name: "Unbekannt", photo_url: null };
        }

        return { ...displayRow, sender_player_id: playerId ?? null, sender };
      });

      const cacheKey = `${selectedScope}:${roomId}`;
      messagesCacheRef.current[cacheKey] = withSender as any;
      setMessages(withSender as any);
      setRoomReady(true);
      await loadReadsForMessageIds(withSender.map((m: any) => m.id));
      await loadPollDataForMessages(withSender as any);
      await loadReactionsForMessageIds(withSender.map((m: any) => m.id));
    } catch (error) {
      setRoomReady(true);
      console.error("Error fetching messages:", error);
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      // Absichtlich kein sichtbarer Loading-State: Chatwechsel bleiben sofort.
    }
  };

  const loadReadsForMessageIds = async (messageIds: string[]) => {
    if (!messageIds.length) {
      setReadByMessage({});
      return;
    }

    const { data, error } = await supabase
      .from("chat_message_reads")
      .select("message_id,user_id,read_at")
      .in("message_id", messageIds);

    if (error) {
      console.error("loadReadsForMessageIds error", error);
      setReadByMessage({});
      return;
    }

    const next: Record<string, Set<string>> = {};
    const userIds = new Set<string>();

    ((data as any[]) || []).forEach((r) => {
      if (!next[r.message_id]) next[r.message_id] = new Set();
      next[r.message_id].add(r.user_id);
      userIds.add(r.user_id);
    });

    setReadByMessage(next);

    // ✅ jetzt Namen holen für alle user_ids (user_profiles.id)
    const ids = Array.from(userIds);
    if (ids.length === 0) {
      setReadNamesByMessage({});
      return;
    }

    const { data: profs, error: profErr } = await supabase
      .from("user_profiles")
      .select("id,player_id")
      .in("id", ids);
    if (profErr) {
      console.error("loadReads profiles error", profErr);
      setReadNamesByMessage({});
      return;
    }

    const playerIds = Array.from(
      new Set(((profs as any[]) || []).map((p) => p.player_id).filter(Boolean)),
    );
    const playerMap = new Map<string, string>();

    if (playerIds.length > 0) {
      const { data: players, error: pErr } = await supabase
        .from("club_players")
        .select("id,name")
        .in("id", playerIds);
      if (!pErr) {
        ((players as any[]) || []).forEach((p) => {
          if (p?.id) playerMap.set(p.id, p.name);
        });
      }
    }

    const profileToName = new Map<string, string>();
    ((profs as any[]) || []).forEach((p) => {
      const name = p?.player_id
        ? (playerMap.get(p.player_id) ?? "Unbekannt")
        : "Unbekannt";
      profileToName.set(p.id, name);
    });

    const nextNames: Record<string, string[]> = {};
    Object.entries(next).forEach(([messageId, set]) => {
      nextNames[messageId] = Array.from(set)
        .map((uid) => profileToName.get(uid) ?? "Unbekannt")
        .sort((a, b) => a.localeCompare(b));
    });

    setReadNamesByMessage(nextNames);
  };

  const markMessagesAsRead = async () => {
    if (markingRef.current) return;
    markingRef.current = true;

    try {
      if (!profile?.id) return;

      // 👇 Nur markieren wenn Tab wirklich aktiv ist
      if (document.visibilityState !== "visible") return;
      if (!document.hasFocus()) return;

      const roomId = currentRoomId;
      if (!roomId) return;

      const foreign = messages.filter((m) => m.user_id !== profile.id);
      if (foreign.length === 0) return;

      const slice = foreign.slice(-80);

      const rows = slice.map((m) => ({
        message_id: m.id,
        user_id: profile.id,
      }));

      const { error } = await supabase.from("chat_message_reads").upsert(rows, {
        onConflict: "message_id,user_id",
      });

      if (error) {
        console.error("markMessagesAsRead error", error);
        return;
      }

      await loadReadsForMessageIds(messages.map((m) => m.id));
    } finally {
      markingRef.current = false;
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("emd-chat-favorites");
      if (raw) setFavoriteChats(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  const toggleFavoriteChat = (key: string) => {
    setFavoriteChats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { window.localStorage.setItem("emd-chat-favorites", JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel("emd_chat_typing_v1")
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (!payload?.room_id || !payload?.scope || !payload?.user_id) return;
        if (payload.user_id === profile.id) return;
        const key = `${payload.room_id}:${payload.scope}`;
        setTypingByRoom((prev) => {
          const next = { ...prev };
          if (payload.active) {
            next[key] = {
              name: payload.name || "Jemand",
              userId: payload.user_id,
              expiresAt: Date.now() + 2600,
            };
          } else {
            delete next[key];
          }
          return next;
        });
      })
      .subscribe();
    typingChannelRef.current = channel;

    const prune = window.setInterval(() => {
      const now = Date.now();
      setTypingByRoom((prev) => {
        let changed = false;
        const next = { ...prev };
        (Object.entries(next) as Array<[string, { name: string; userId: string; expiresAt: number }]>).forEach(([key, value]) => {
          if (value.expiresAt < now) { delete next[key]; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      window.clearInterval(prune);
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const sendTypingState = (active: boolean) => {
    if (!profile?.id || !currentRoomId || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        room_id: currentRoomId,
        scope: selectedScope,
        user_id: profile.id,
        name: myDisplayName,
        active,
      },
    });
  };

  const handleMessageInput = (value: string) => {
    setNewMessage(value);
    sendTypingState(Boolean(value.trim()));
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    if (value.trim()) {
      typingStopTimerRef.current = setTimeout(() => sendTypingState(false), 1400);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
    setTimeout(() => document.getElementById("emd-chat-input")?.focus(), 0);
    sendTypingState(true);
  };

  const loadReactionsForMessageIds = async (messageIds: string[]) => {
    if (!messageIds.length) {
      setReactionsByMessage({});
      return;
    }

    const { data, error } = await supabase
      .from("chat_message_reactions")
      .select("id,message_id,user_id,emoji,created_at")
      .in("message_id", messageIds);

    if (error) {
      console.error("loadReactionsForMessageIds error", error);
      return;
    }

    const next: Record<string, ChatReaction[]> = {};
    ((data as ChatReaction[]) || []).forEach((reaction) => {
      if (!next[reaction.message_id]) next[reaction.message_id] = [];
      next[reaction.message_id].push(reaction);
    });
    setReactionsByMessage(next);
  };

  const subscribeToReactions = () => {
    const channel = supabase
      .channel(`chat_reactions_${currentRoomId}_${selectedScope}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_message_reactions" },
        () => loadReactionsForMessageIds(messagesRef.current.map((m) => m.id)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!profile?.id) return;
    const existing = (reactionsByMessage[messageId] || []).find(
      (r) => r.user_id === profile.id && r.emoji === emoji,
    );

    if (existing) {
      const { error } = await supabase
        .from("chat_message_reactions")
        .delete()
        .eq("id", existing.id);
      if (error) {
        toast({ title: "Fehler", description: "Reaktion konnte nicht entfernt werden.", variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase.from("chat_message_reactions").insert({
        message_id: messageId,
        user_id: profile.id,
        emoji,
      });
      if (error) {
        toast({ title: "Fehler", description: "Reaktion konnte nicht gespeichert werden.", variant: "destructive" });
        return;
      }
    }

    setActiveMessageMenu(null);
    setMessageMenuPosition(null);
    await loadReactionsForMessageIds(messagesRef.current.map((m) => m.id));
  };

  const toggleMessageMenuAt = (event: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    if (activeMessageMenu === messageId) {
      setActiveMessageMenu(null);
      setMessageMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 205;
    const gap = 8;
    const viewportPadding = 8;

    const left = Math.max(
      viewportPadding,
      Math.min(window.innerWidth - menuWidth - viewportPadding, rect.right - menuWidth),
    );

    const roomBelow = window.innerHeight - rect.bottom;
    const top = roomBelow >= menuHeight + gap
      ? rect.bottom + gap
      : Math.max(viewportPadding, rect.top - menuHeight - gap);

    setMessageMenuPosition({ top, left });
    setActiveMessageMenu(messageId);
  };

  const startReply = (message: ChatMessage) => {
    setEditingMessage(null);
    setReplyToMessage(message);
    setActiveMessageMenu(null);
    setMessageMenuPosition(null);
    setTimeout(() => document.getElementById("emd-chat-input")?.focus(), 0);
  };

  const startEdit = (message: ChatMessage) => {
    if (message.deleted_at || message.message_type === "poll") return;
    setReplyToMessage(null);
    setEditingMessage(message);
    setNewMessage(message.message || "");
    setActiveMessageMenu(null);
    setMessageMenuPosition(null);
    setTimeout(() => document.getElementById("emd-chat-input")?.focus(), 0);
  };

  const cancelComposerAction = () => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setNewMessage("");
    sendTypingState(false);
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !profile?.id) return;
    const clean = newMessage.trim();
    if (!clean) return;

    const { error } = await supabase
      .from("chat_messages")
      .update({ message: clean, edited_at: new Date().toISOString() })
      .eq("id", editingMessage.id)
      .eq("user_id", profile.id);

    if (error) {
      toast({ title: "Fehler", description: "Nachricht konnte nicht bearbeitet werden.", variant: "destructive" });
      return;
    }

    setEditingMessage(null);
    setNewMessage("");
    sendTypingState(false);
    await fetchMessages();
    await fetchLastMessagePreviews();
  };

  const deleteOwnMessage = async (message: ChatMessage) => {
    if (!profile?.id || message.user_id !== profile.id) return;
    const { error } = await supabase
      .from("chat_messages")
      .update({
        message: "",
        deleted_at: new Date().toISOString(),
        edited_at: null,
      })
      .eq("id", message.id)
      .eq("user_id", profile.id);

    if (error) {
      toast({ title: "Fehler", description: "Nachricht konnte nicht gelöscht werden.", variant: "destructive" });
      return;
    }

    setActiveMessageMenu(null);
    setMessageMenuPosition(null);
    await fetchMessages();
    await fetchLastMessagePreviews();
  };

  const submitComposer = () => {
    if (editingMessage) return saveEditedMessage();
    return sendMessage();
  };

  const subscribeToMessages = () => {
    const roomId = currentRoomId;
    if (!roomId) return () => {};

    const channel = supabase
      .channel(`chat_messages_${roomId}_${selectedScope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: any) => {
          const incoming = payload.new as any;
          const oldRow = payload.old as any;
          const eventType = payload.eventType;
          const scope = (incoming?.scope ?? oldRow?.scope) as ChatScope | undefined;
          if (scope !== selectedScope) return;

          if (eventType === "INSERT") {
            await fetchMessages();
            if (incoming?.user_id !== profile?.id) fetchUnreadCounts(chatRooms);
            return;
          }

          if (eventType === "UPDATE" || eventType === "DELETE") {
            await fetchMessages();
            await fetchLastMessagePreviews();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToReads = () => {
    const roomId = currentRoomId;
    if (!roomId) return () => {};

    const channel = supabase
      .channel(`chat_reads_${roomId}_${selectedScope}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_message_reads",
        },
        (payload) => {
          const incoming = payload.new as any;
          const mid = incoming?.message_id;
          if (!mid) return;

          // ✅ IMMER aktuelle messages benutzen (kein stale state)
          const currentMsgs = messagesRef.current;

          // nur reagieren, wenn die Message gerade im State existiert
          if (!currentMsgs.some((m) => m.id === mid)) return;

          loadReadsForMessageIds(currentMsgs.map((m) => m.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToPollVotes = () => {
    const channel = supabase
      .channel(`chat_poll_votes_${currentRoomId}_${selectedScope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_poll_votes",
        },
        async () => {
          await loadPollDataForMessages(messagesRef.current);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return;

    if (selectedScope === "test" && !isTestUser) {
      toast({
        title: "Kein Zugriff",
        description: "Dieser Testchat ist nur für die beiden Testkonten freigeschaltet.",
        variant: "destructive",
      });
      setSelectedScope("community");
      return;
    }

    if (
      profile?.is_guest &&
      selectedScope !== "community" &&
      !(selectedScope === "test" && isTestUser)
    ) {
      toast({
        title: "Kein Zugriff",
        description: "Gäste können nur im Community-Chat schreiben.",
        variant: "destructive",
      });
      setSelectedScope("community");
      return;
    }

    if (selectedScope === "captains" && !canSeeCaptainChat && !isVorstand) {
      toast({
        title: "Kein Zugriff",
        description: "Du bist nicht Captain/Co-Captain.",
        variant: "destructive",
      });
      return;
    }

    if (selectedScope === "vorstand" && !canSeeVorstandChat && !isVorstand) {
      toast({
        title: "Kein Zugriff",
        description: "Du bist nicht im Vorstand.",
        variant: "destructive",
      });
      return;
    }

    if (selectedScope === "team" && !selectedRoom) return;

    if (!profile?.id) {
      toast({
        title: "Profil fehlt",
        description:
          "Dein Benutzerprofil ist nicht eingerichtet. Bitte melde dich beim Admin.",
        variant: "destructive",
      });
      return;
    }

    const roomId = currentRoomId;
    if (!roomId) return;

    try {
      setSending(true);

      const msg = newMessage.trim();

      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const attachmentData = await uploadAttachment(file);

          const { error } = await supabase.from("chat_messages").insert({
            user_id: profile.id,
            message: i === 0 ? msg : "",
            room_id: roomId,
            scope: selectedScope,
            reply_to_message_id: i === 0 ? replyToMessage?.id ?? null : null,
            ...attachmentData,
          });

          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("chat_messages").insert({
          user_id: profile.id,
          message: msg,
          room_id: roomId,
          scope: selectedScope,
          reply_to_message_id: replyToMessage?.id ?? null,
        });

        if (error) throw error;
      }

      setNewMessage("");
      setReplyToMessage(null);
      setEditingMessage(null);
      sendTypingState(false);
      setEmojiOpen(false);
      clearSelectedFiles();
      markCurrentAsVisited();
      fetchLastMessagePreviews();

      const token = session?.access_token;

      if (token) {
        fetch("/api/push/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            room_id: roomId,
            scope: selectedScope,
            message:
              msg ||
              (selectedFiles.length > 0
                ? `Dateien: ${selectedFiles.length}`
                : ""),
            sender_profile_id: profile.id,
          }),
        }).catch(() => {});
      }
    } catch (error: any) {
      console.error("Error sending message:", error);

      toast({
        title: "Fehler",
        description:
          error?.message || "Nachricht / Datei konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (urlNativeReply !== "1" || nativeReplySent.current) return;
    if (!urlDraft || !profile?.id || !currentRoomId || !roomReady || sending) return;
    if (newMessage.trim() !== urlDraft.trim()) return;

    nativeReplySent.current = true;
    void sendMessage();
  }, [urlNativeReply, urlDraft, profile?.id, currentRoomId, roomReady, sending, newMessage]);

  const fetchUnreadCounts = async (roomsOverride?: TeamRoom[]) => {
    const rooms = roomsOverride ?? chatRooms;
    if (!profile?.id) return;

    try {
      const counts: Record<string, number> = {};

      const computeGlobalUnread = async (
        roomId: string,
        scope: ChatScope,
        visibleFrom?: string | null,
      ) => {
        const { data: visitData } = await supabase
          .from("user_room_visits")
          .select("last_visit_at")
          .eq("user_id", profile.id)
          .eq("room_id", roomId)
          .eq("scope", scope)
          .maybeSingle();

        const lastVisit =
          (visitData as any)?.last_visit_at || "1970-01-01T00:00:00Z";

        const effectiveAfter =
          visibleFrom && new Date(visibleFrom).getTime() > new Date(lastVisit).getTime()
            ? visibleFrom
            : lastVisit;

        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("scope", scope)
          .gt("created_at", effectiveAfter)
          .neq("user_id", profile.id);

        counts[unreadKey(roomId, scope)] = count || 0;
      };

      await computeGlobalUnread(COMMUNITY_ROOM_ID, "community");
      if (isTestUser) {
        await computeGlobalUnread(TEST_ROOM_ID, "test");
      }

      if (profile.is_guest) {
        setUnreadCounts(counts);
        return;
      }

      await computeGlobalUnread(CLUB_ROOM_ID, "club", clubVisibleFrom);
      await computeGlobalUnread(FREIZEIT_ROOM_ID, "freizeit", clubVisibleFrom);

      if (canSeeVorstandChat) {
        await computeGlobalUnread(VORSTAND_ROOM_ID, "vorstand");
      } else {
        counts[unreadKey(VORSTAND_ROOM_ID, "vorstand")] = 0;
      }

      // Globaler Captain-Chat (einmal für alle Teams)
      if (canSeeCaptainChat || isVorstand) {
        await computeGlobalUnread(CAPTAINS_ROOM_ID, "captains");
      } else {
        counts[unreadKey(CAPTAINS_ROOM_ID, "captains")] = 0;
      }

      for (const room of rooms) {
        const scope: ChatScope = "team";

        const { data: visitData } = await supabase
          .from("user_room_visits")
          .select("last_visit_at")
          .eq("user_id", profile.id)
          .eq("room_id", room.id)
          .eq("scope", scope)
          .maybeSingle();

        const lastVisit =
          (visitData as any)?.last_visit_at || "1970-01-01T00:00:00Z";

        const visibleFrom = room.membership_visible_from ?? null;
        const effectiveAfter =
          visibleFrom && new Date(visibleFrom).getTime() > new Date(lastVisit).getTime()
            ? visibleFrom
            : lastVisit;

        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .eq("scope", scope)
          .gt("created_at", effectiveAfter)
          .neq("user_id", profile.id);

        counts[unreadKey(room.id, scope)] = count || 0;
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  const markRoomAsVisited = async (roomId: string, scope: ChatScope) => {
    if (!profile?.id) return;

    try {
      await supabase.from("user_room_visits").upsert(
        {
          user_id: profile.id,
          room_id: roomId,
          scope,
          last_visit_at: new Date().toISOString(),
        },
        { onConflict: "user_id,room_id,scope" },
      );

      setUnreadCounts((prev) => ({ ...prev, [unreadKey(roomId, scope)]: 0 }));
    } catch (error) {
      console.error("Error marking room as visited:", error);
    }
  };

  const markCurrentAsVisited = async () => {
    const roomId = currentRoomId;
    if (!roomId) return;
    await markRoomAsVisited(roomId, selectedScope);
  };

  // EMD Messenger: vertrauter WhatsApp-Aufbau, aber eigenes EMD-Branding.
  const WA = {
    appBg: "bg-[#0b1117] text-white",
    card: "border-0 bg-[#111820] text-white shadow-none",
    header: "border-b border-white/[0.07] bg-[#171f27]/98 backdrop-blur-xl",
    sidebarItemBase:
      "w-full justify-start h-auto px-3 py-2.5 text-left rounded-none border-0 border-b border-white/[0.055] transition-colors focus-visible:ring-0 overflow-hidden",
    sidebarItemSelected: "bg-white/[0.055] text-white hover:bg-white/[0.07]",
    sidebarItemUnselected: "text-white hover:bg-white/[0.035]",
    iconBadge: "bg-orange-500/15 text-orange-300",
    iconInSelected: "text-orange-300",
    iconInUnselected: "text-orange-300",
    unreadBadge:
      "shrink-0 min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full border-0 bg-orange-500 text-[10px] font-black text-white shadow-none",
    chatBg:
      "bg-[#0b1117] bg-[radial-gradient(circle_at_18%_16%,rgba(249,115,22,.022),transparent_26%),radial-gradient(circle_at_82%_72%,rgba(255,255,255,.016),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.006)_25%,transparent_25%,transparent_75%,rgba(255,255,255,.006)_75%)] bg-[length:auto,auto,28px_28px]",
    bubbleOwn:
      "bg-[#8a4615] text-white rounded-[9px] rounded-tr-[2px] border-0 shadow-[0_1px_1px_rgba(0,0,0,.24)]",
    bubbleOther:
      "bg-[#202932] text-white rounded-[9px] rounded-tl-[2px] border-0 shadow-[0_1px_1px_rgba(0,0,0,.24)]",
    composer: "bg-[#171f27] border-t border-white/[0.06]",
    input:
      "h-11 rounded-full border-0 bg-[#25303a] px-4 text-[15px] text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-orange-400/30",
    sendBtn:
      "h-11 w-11 shrink-0 rounded-full bg-orange-500 text-white hover:bg-orange-500/90 shadow-none disabled:bg-white/10 disabled:text-white/25",
  };

  const communityUnread =
    unreadCounts[unreadKey(COMMUNITY_ROOM_ID, "community")] ??
    unreadCounts[COMMUNITY_ROOM_ID] ??
    0;
  const testUnread =
    unreadCounts[unreadKey(TEST_ROOM_ID, "test")] ??
    unreadCounts[TEST_ROOM_ID] ??
    0;

  const clubUnread =
    unreadCounts[unreadKey(CLUB_ROOM_ID, "club")] ??
    unreadCounts[CLUB_ROOM_ID] ??
    0;
  const freizeitUnread =
    unreadCounts[unreadKey(FREIZEIT_ROOM_ID, "freizeit")] ??
    unreadCounts[FREIZEIT_ROOM_ID] ??
    0;
  const vorstandUnread =
    unreadCounts[unreadKey(VORSTAND_ROOM_ID, "vorstand")] ??
    unreadCounts[VORSTAND_ROOM_ID] ??
    0;
  const captainsUnread =
    unreadCounts[unreadKey(CAPTAINS_ROOM_ID, "captains")] ??
    unreadCounts[CAPTAINS_ROOM_ID] ??
    0;

  const totalUnread = useMemo(() => {
    const teamUnreadTotal = chatRooms.reduce((sum, room) => sum + (unreadCounts[unreadKey(room.id, "team")] ?? unreadCounts[room.id] ?? 0), 0);
    return communityUnread + testUnread + clubUnread + freizeitUnread + vorstandUnread + captainsUnread + teamUnreadTotal;
  }, [communityUnread, testUnread, clubUnread, freizeitUnread, vorstandUnread, captainsUnread, chatRooms, unreadCounts]);

  const headerPeople = useMemo(() => {
    if (selectedScope === "team") return teamMembers;
    if (selectedScope === "captains") return globalCaptains;
    if (selectedScope === "vorstand") return vorstandMembers as any;
    return [];
  }, [selectedScope, teamMembers, globalCaptains, vorstandMembers]);

  const recipientsCount = useMemo(() => {
    const total = (headerPeople || []).length;
    return Math.max(0, total - 1);
  }, [headerPeople]);

  const headerPeopleLoading = useMemo(() => {
    if (selectedScope === "team") return membersLoading;
    if (selectedScope === "captains") return globalCaptainsLoading;
    return false;
  }, [selectedScope, membersLoading, globalCaptainsLoading]);

  const renderedStream = useMemo(() => {
    const out: Array<
      | { type: "date"; key: string; label: string }
      | { type: "msg"; msg: ChatMessage }
    > = [];
    let lastKey: string | null = null;

    for (const m of messages) {
      const k = dateKeyVienna(m.created_at);
      if (k !== lastKey) {
        out.push({
          type: "date",
          key: k,
          label: dateLabelVienna(m.created_at),
        });
        lastKey = k;
      }
      out.push({ type: "msg", msg: m });
    }
    return out;
  }, [messages]);

  const normalizedChatSearch = chatSearch.trim().toLowerCase();

  const chatMatches = (title: string, subtitle = "") =>
    !normalizedChatSearch ||
    `${title} ${subtitle}`.toLowerCase().includes(normalizedChatSearch);

  const sidebarTime = (roomId: string, scope: ChatScope) => {
    const preview = lastMessagesByRoom[lastPreviewKey(roomId, scope)];
    if (!preview?.created_at) return "";
    const key = dateKeyVienna(preview.created_at);
    const today = dateKeyVienna(new Date().toISOString());
    if (key === today) return formatTimeVienna(preview.created_at);
    const yesterday = dateKeyVienna(
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );
    if (key === yesterday) return "Gestern";
    return new Intl.DateTimeFormat("de-AT", {
      timeZone: "Europe/Vienna",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(preview.created_at));
  };

  const renderChatRow = ({
    keyValue,
    title,
    subtitle,
    roomId,
    scope,
    unread,
    selected,
    icon,
    imageUrl,
    onClick,
    isGroup = true,
  }: {
    keyValue: string;
    title: string;
    subtitle: string;
    roomId: string;
    scope: ChatScope;
    unread: number;
    selected: boolean;
    icon: React.ReactNode;
    imageUrl?: string | null;
    onClick: () => void;
    isGroup?: boolean;
  }) => {
    if (!chatMatches(title, subtitle)) return null;
    const favoriteKey = `${scope}:${roomId}`;
    const isFavorite = favoriteChats.has(favoriteKey);
    if (chatFilter === "unread" && unread <= 0) return null;
    if (chatFilter === "favorites" && !isFavorite) return null;
    const lastText = getLastPreviewText(
      lastMessagesByRoom[lastPreviewKey(roomId, scope)],
    );
    const time = sidebarTime(roomId, scope);
    const typing = typingByRoom[`${roomId}:${scope}`];

    return (
      <button
        key={keyValue}
        type="button"
        onClick={onClick}
        className={`group flex min-h-[72px] w-full items-center gap-3 px-3.5 py-2 text-left transition-colors ${
          selected ? "bg-white/[0.055]" : "hover:bg-white/[0.035]"
        }`}
      >
        {imageUrl ? (
          <Avatar className="h-[50px] w-[50px] shrink-0">
            <AvatarImage src={imageUrl} alt={title} />
            <AvatarFallback className="bg-orange-500/15 text-sm font-black text-orange-300">
              {initials(title)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-[#25303a] text-orange-300">
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1 border-b border-white/[0.055] py-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className={`truncate text-[15.5px] ${unread > 0 ? "font-black text-white" : "font-semibold text-white/95"}`}>
                {title}
              </div>
              <div className={`mt-1 truncate text-[13px] ${typing ? "font-semibold text-orange-400" : unread > 0 ? "font-semibold text-white/72" : "text-white/45"}`}>
                {typing ? `${typing.name} schreibt …` : (lastText || subtitle)}
              </div>
            </div>

            <div className="flex min-w-[50px] shrink-0 flex-col items-end gap-1">
              <span className={`text-[10px] ${unread > 0 ? "font-bold text-orange-300" : "text-white/35"}`}>
                {time}
              </span>
              <div className="flex items-center gap-1">
                <span
                  role="button"
                  tabIndex={0}
                  title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten"}
                  onClick={(e) => { e.stopPropagation(); toggleFavoriteChat(favoriteKey); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleFavoriteChat(favoriteKey); } }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${isFavorite ? "text-orange-300" : "text-white/20 hover:bg-white/[0.06] hover:text-white/60"}`}
                >
                  <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-current" : ""}`} />
                </span>
                {unread > 0 ? (
                  <span className={WA.unreadBadge}>{unread > 99 ? "99+" : unread}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  };


  // WhatsApp-Logik: ALLE Chats nach letzter Aktivität sortieren.
  // Jede normale Nachricht, Umfrage, Datei und auch unsere Spiel-/Aufstellungskarte
  // liegt in chat_messages und hebt damit den betreffenden Chat automatisch nach oben.
  const chatListItems = [
    ...(isTestUser
      ? [{
          keyValue: "test",
          title: "🧪 Jimmy Testchat",
          subtitle: "Nur Testkonten · keine Pushs",
          roomId: TEST_ROOM_ID,
          scope: "test" as ChatScope,
          unread: testUnread,
          selected: selectedScope === "test",
          icon: <FlaskConical className="h-5 w-5" />,
          imageUrl: null as string | null,
          fallbackOrder: 0,
          onClick: () => {
            setSelectedScope("test");
            setSelectedRoom(null);
            setSidebarOpen(false);
            setMobileChatOpen(true);
            setTimeout(() => markRoomAsVisited(TEST_ROOM_ID, "test"), 50);
          },
        }]
      : []),
    {
      keyValue: "community",
      title: "EMD Community",
      subtitle: "Gäste & Mitglieder",
      roomId: COMMUNITY_ROOM_ID,
      scope: "community" as ChatScope,
      unread: communityUnread,
      selected: selectedScope === "community",
      icon: <MessageCircle className="h-5 w-5" />,
      imageUrl: null as string | null,
      fallbackOrder: 1,
      onClick: () => {
        setSelectedScope("community");
        setSelectedRoom(null);
        setSidebarOpen(false);
        setMobileChatOpen(true);
        setTimeout(() => markRoomAsVisited(COMMUNITY_ROOM_ID, "community"), 50);
      },
    },
    ...(!profile?.is_guest
      ? [
          {
            keyValue: "club",
            title: "Vereinsinfo",
            subtitle: "Informationen vom Verein",
            roomId: CLUB_ROOM_ID,
            scope: "club" as ChatScope,
            unread: clubUnread,
            selected: selectedScope === "club",
            icon: <Info className="h-5 w-5" />,
            imageUrl: null as string | null,
            fallbackOrder: 2,
            onClick: () => {
              setSelectedScope("club");
              setSelectedRoom(null);
              setSidebarOpen(false);
              setMobileChatOpen(true);
              setTimeout(() => markRoomAsVisited(CLUB_ROOM_ID, "club"), 50);
            },
          },
          {
            keyValue: "freizeit",
            title: "Freizeit",
            subtitle: "Plaudern & gemeinsame Aktivitäten",
            roomId: FREIZEIT_ROOM_ID,
            scope: "freizeit" as ChatScope,
            unread: freizeitUnread,
            selected: selectedScope === "freizeit",
            icon: <Coffee className="h-5 w-5" />,
            imageUrl: null as string | null,
            fallbackOrder: 3,
            onClick: () => {
              setSelectedScope("freizeit");
              setSelectedRoom(null);
              setSidebarOpen(false);
              setMobileChatOpen(true);
              setTimeout(() => markRoomAsVisited(FREIZEIT_ROOM_ID, "freizeit"), 50);
            },
          },
          ...((canSeeCaptainChat || isVorstand)
            ? [{
                keyValue: "captains",
                title: "Captain-Chat",
                subtitle: "Captain & Co-Captain",
                roomId: CAPTAINS_ROOM_ID,
                scope: "captains" as ChatScope,
                unread: captainsUnread,
                selected: selectedScope === "captains",
                icon: <Users className="h-5 w-5" />,
                imageUrl: null as string | null,
                fallbackOrder: 4,
                onClick: () => {
                  setSelectedScope("captains");
                  setSelectedRoom(null);
                  setSidebarOpen(false);
                  setMobileChatOpen(true);
                  setTimeout(() => markRoomAsVisited(CAPTAINS_ROOM_ID, "captains"), 50);
                },
              }]
            : []),
          ...(canSeeVorstandChat
            ? [{
                keyValue: "vorstand",
                title: "Vorstand",
                subtitle: "Interner Vorstands-Chat",
                roomId: VORSTAND_ROOM_ID,
                scope: "vorstand" as ChatScope,
                unread: vorstandUnread,
                selected: selectedScope === "vorstand",
                icon: <Shield className="h-5 w-5" />,
                imageUrl: null as string | null,
                fallbackOrder: 5,
                onClick: () => {
                  setSelectedScope("vorstand");
                  setSelectedRoom(null);
                  setSidebarOpen(false);
                  setMobileChatOpen(true);
                  setTimeout(() => markRoomAsVisited(VORSTAND_ROOM_ID, "vorstand"), 50);
                },
              }]
            : []),
          ...chatRooms.map((room, index) => ({
            keyValue: room.id,
            title: room.name,
            subtitle: room.role ? `Team · ${room.role}` : "Team-Chat",
            roomId: room.id,
            scope: "team" as ChatScope,
            unread: unreadCounts[unreadKey(room.id, "team")] ?? unreadCounts[room.id] ?? 0,
            selected: selectedScope === "team" && selectedRoom?.id === room.id,
            icon: <Hash className="h-5 w-5" />,
            imageUrl: room.logo_url ?? null,
            fallbackOrder: 100 + index,
            onClick: () => {
              setSelectedRoom(room);
              setSelectedScope("team");
              setSidebarOpen(false);
              setMobileChatOpen(true);
              setTimeout(() => markRoomAsVisited(room.id, "team"), 50);
            },
          })),
        ]
      : []),
  ]
    .map((item) => {
      const preview = lastMessagesByRoom[lastPreviewKey(item.roomId, item.scope)];
      const activity = preview?.created_at
        ? new Date(preview.created_at).getTime()
        : 0;
      return {
        ...item,
        activity: Number.isFinite(activity) ? activity : 0,
      };
    })
    .sort((a, b) => {
      // Neueste Aktivität immer ganz nach oben – exakt wie bei WhatsApp.
      if (b.activity !== a.activity) return b.activity - a.activity;
      // Chats ohne Nachrichten bleiben in einer stabilen, nachvollziehbaren Reihenfolge.
      return a.fallbackOrder - b.fallbackOrder;
    });

  const visibleChatListItems = chatListItems.filter((item) => {
    if (!chatMatches(item.title, item.subtitle)) return false;
    const favoriteKey = `${item.scope}:${item.roomId}`;
    if (chatFilter === "unread" && item.unread <= 0) return false;
    if (chatFilter === "favorites" && !favoriteChats.has(favoriteKey)) return false;
    return true;
  });

  const showNoProfile = !profileLoading && !profile;

  if (authLoading) {
    return <div className={`min-h-[100dvh] ${WA.appBg}`} />;
  }

  if (!session) {
    if (isMessengerApp) {
      return (
        <div className={`min-h-[100dvh] flex flex-col ${WA.appBg}`}>
          <main className="flex-1 flex items-center justify-center p-4">
            <Card className={`w-full max-w-md ${WA.card}`}>
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/15 text-orange-300">
                  <MessageCircle className="h-8 w-8" />
                </div>

                <h2 className="text-xl font-black text-white">EMD Messenger aktivieren</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/45">
                  Gib den einmaligen 6-stelligen Aktivierungscode aus deiner EMD Vereinsapp ein.
                </p>

                <div className="mt-6">
                  <Input
                    value={activationCode}
                    onChange={(e) => {
                      setActivationCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setActivationError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !activationLoading) {
                        e.preventDefault();
                        activateMessenger();
                      }
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    disabled={activationLoading}
                    className="h-14 rounded-2xl border border-white/[0.10] bg-[#202a33] text-center text-2xl font-black tracking-[0.32em] text-white placeholder:text-white/18 focus-visible:ring-1 focus-visible:ring-orange-400/40"
                  />

                  {activationError ? (
                    <p className="mt-3 text-sm font-semibold text-red-300">
                      {activationError}
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    onClick={activateMessenger}
                    disabled={activationLoading || activationCode.length !== 6}
                    className="mt-4 h-12 w-full rounded-2xl bg-orange-500 font-black text-white hover:bg-orange-500/90 disabled:bg-white/10 disabled:text-white/25"
                  >
                    {activationLoading ? "Wird aktiviert…" : "Messenger aktivieren"}
                  </Button>
                </div>

                <p className="mt-5 text-xs leading-5 text-white/30">
                  Der Code kann nur einmal verwendet werden. Nach erfolgreicher Aktivierung bleibt dieses Gerät angemeldet.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }

    return (
      <div className={`min-h-[100dvh] flex flex-col ${WA.appBg}`}>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className={`w-full max-w-md ${WA.card}`}>
            <CardContent className="p-6 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-orange-300" />
              <h2 className="text-xl font-bold mb-2">Anmeldung erforderlich</h2>
              <p className="mb-4 text-white/45">
                Bitte melden Sie sich an, um den Chat zu verwenden.
              </p>
              <Button
                onClick={() => router.push("/member-login")}
                className={WA.sendBtn}
              >
                Zur Anmeldung
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className={`relative h-[100dvh] flex flex-col overflow-hidden ${WA.appBg}`}>
      <div className="pointer-events-none fixed inset-0 z-0 hidden">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.18]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.78),rgba(3,5,9,.95)_44%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_7%_16%,rgba(249,115,22,.15),transparent_25%),radial-gradient(circle_at_90%_22%,rgba(14,165,233,.09),transparent_26%)]" />
      </div>
      <main className="relative z-10 flex-1 min-h-0 overflow-hidden p-0">
        {appSection === "chats" ? (
        <div className="h-full w-full max-w-none">
          <div className="flex flex-col h-full min-h-0">
            {showNoProfile ? (
              <Card className={`${WA.card} shrink-0`}>
                <CardContent className="p-6 text-center">
                  <MessageCircle className="mx-auto mb-4 h-12 w-12 text-orange-300" />
                  <h2 className="text-xl font-bold mb-2">Profil fehlt</h2>
                  <p className="mb-4 text-white/45">
                    Für diesen Account gibt es keinen Eintrag in{" "}
                    <code>user_profiles</code>. Bitte melde dich beim Admin.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative flex-1 min-h-0 flex overflow-hidden">
                {/* Messenger-Liste: mobil wie eine eigenständige Chat-App */}
                <div
                  className={`absolute inset-0 z-10 flex w-full min-h-0 bg-[#111820] transition-transform duration-[240ms] ease-out will-change-transform lg:relative lg:inset-auto lg:z-auto lg:w-[405px] xl:w-[430px] 2xl:w-[455px] lg:shrink-0 ${
                    mobileChatOpen
                      ? "-translate-x-full pointer-events-none lg:translate-x-0 lg:pointer-events-auto"
                      : "translate-x-0"
                  }`}
                >
                  <div className="flex h-full w-full min-h-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#111820]">
                    <div className="shrink-0 border-b border-white/[0.045] bg-[#171f27] px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
                            <MessageCircle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[20px] font-black tracking-tight text-white">EMD Chat</div>
                            <div className="mt-0.5 text-[11px] font-medium text-white/38">Chats</div>
                          </div>
                        </div>
                      </div>

                      <div className="relative mt-3">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        <Input
                          value={chatSearch}
                          onChange={(e) => setChatSearch(e.target.value)}
                          placeholder="Suchen oder Chat finden"
                          className="h-10 rounded-lg border-0 bg-[#202a33] pl-10 pr-4 text-[13px] text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-orange-400/25"
                        />
                      </div>

                      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {([
                          ["all", "Alle"],
                          ["unread", `Ungelesen${totalUnread > 0 ? ` ${totalUnread}` : ""}`],
                          ["favorites", "Favoriten"],
                        ] as Array<[ChatFilter, string]>).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setChatFilter(value)}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${chatFilter === value ? "border-orange-400/35 bg-orange-500/15 text-orange-200" : "border-white/[0.10] bg-transparent text-white/60 hover:bg-white/[0.05] hover:text-white"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <ScrollArea className="flex-1 min-h-0">
                      <div className="pb-[max(12px,env(safe-area-inset-bottom))]">
                        {roomsLoading ? (
                          <div className="px-4 py-5 text-center text-xs text-white/35">
                            Chats werden geladen…
                          </div>
                        ) : visibleChatListItems.length > 0 ? (
                          visibleChatListItems.map((item) =>
                            renderChatRow({
                              keyValue: item.keyValue,
                              title: item.title,
                              subtitle: item.subtitle,
                              roomId: item.roomId,
                              scope: item.scope,
                              unread: item.unread,
                              selected: item.selected,
                              icon: item.icon,
                              imageUrl: item.imageUrl,
                              onClick: item.onClick,
                            }),
                          )
                        ) : (
                          <div className="px-6 py-12 text-center">
                            <Search className="mx-auto h-8 w-8 text-white/20" />
                            <div className="mt-3 text-sm font-semibold text-white/50">
                              {chatFilter === "unread"
                                ? "Keine ungelesenen Chats"
                                : chatFilter === "favorites"
                                  ? "Keine Favoriten gefunden"
                                  : "Kein Chat gefunden"}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Main Chat */}
                <div
                  className={`absolute inset-0 z-20 flex min-w-0 min-h-0 overflow-hidden bg-[#0b1117] transition-transform duration-[240ms] ease-out will-change-transform lg:relative lg:inset-auto lg:z-auto lg:flex-1 lg:translate-x-0 ${
                    mobileChatOpen
                      ? "translate-x-0"
                      : "translate-x-full pointer-events-none lg:pointer-events-auto"
                  }`}
                >
                  <Card
                    className={`h-full w-full ${WA.card} overflow-hidden flex flex-col min-h-0 rounded-none`}
                  >
                    <CardHeader className={`shrink-0 px-2.5 sm:px-4 py-1.5 ${WA.header}`}>
                      <div className="flex min-h-[52px] items-center gap-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="lg:hidden h-10 w-10 shrink-0 rounded-full p-0 text-white/85 hover:bg-white/[0.08]"
                          onClick={() => setMobileChatOpen(false)}
                          aria-label="Zur Chatliste"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </Button>

                        {selectedScope === "team" && selectedRoom?.logo_url ? (
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={selectedRoom.logo_url} alt={selectedRoomName} />
                            <AvatarFallback className="bg-orange-500/15 text-orange-300">
                              {initials(selectedRoomName)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25303a] text-orange-300">
                            {selectedScope === "community" ? (
                              <MessageCircle className="h-5 w-5" />
                            ) : selectedScope === "club" ? (
                              <Info className="h-5 w-5" />
                            ) : selectedScope === "freizeit" ? (
                              <Coffee className="h-5 w-5" />
                            ) : selectedScope === "vorstand" ? (
                              <Shield className="h-5 w-5" />
                            ) : selectedScope === "captains" ? (
                              <Users className="h-5 w-5" />
                            ) : (
                              <Hash className="h-5 w-5" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-[15px] font-bold text-white">
                            {selectedRoomName}
                          </CardTitle>
                          <p className="truncate text-[11px] text-white/42">
                            {headerPeopleLoading
                              ? "Mitglieder werden geladen…"
                              : headerPeople.length > 0
                                ? `${headerPeople.length} Teilnehmer`
                                : selectedScope === "community"
                                  ? "EMD Community"
                                  : "Vereinschat"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            className="hidden h-10 w-10 rounded-full p-0 text-white/60 hover:bg-white/[0.08] hover:text-white md:inline-flex"
                            aria-label="Chat-Menü"
                            title="Chat-Menü"
                          >
                            <MoreVertical className="h-[19px] w-[19px]" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
                      {selectedScope === "team" && !selectedRoom ? (
                        <div
                          className={`flex-1 flex items-center justify-center text-white/42 ${WA.chatBg}`}
                        >
                          <div className="text-center">
                            <Hash className="h-12 w-12 mx-auto mb-4 text-white/25" />
                            <p className="text-sm">
                              Wähle ein Team aus der Seitenleiste
                            </p>
                            <Button
                              variant="outline"
                              className="mt-4 rounded-xl border-white/[0.10] bg-white/[0.035] text-white/75 hover:bg-white/[0.06] hover:text-white lg:hidden"
                              size="sm"
                              onClick={() => setMobileChatOpen(false)}
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Zur Chatliste
                            </Button>
                          </div>
                        </div>
                      ) : selectedScope === "captains" &&
                        !canSeeCaptainChat &&
                        !isVorstand ? (
                        <div
                          className={`flex-1 flex items-center justify-center text-white/42 ${WA.chatBg}`}
                        >
                          <div className="text-center">
                            <Shield className="h-12 w-12 mx-auto mb-4 text-white/25" />
                            <p className="text-sm">
                              Kein Zugriff auf den Captain-Chat.
                            </p>
                          </div>
                        </div>
                      ) : selectedScope === "vorstand" &&
                        !canSeeVorstandChat &&
                        !isVorstand ? (
                        <div
                          className={`flex-1 flex items-center justify-center text-white/42 ${WA.chatBg}`}
                        >
                          <div className="text-center">
                            <Shield className="h-12 w-12 mx-auto mb-4 text-white/25" />
                            <p className="text-sm">
                              Kein Zugriff auf den Vorstand-Chat.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            ref={messagesViewportRef}
                            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2.5 sm:px-3 lg:px-4 xl:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${WA.chatBg}`}
                          >
                            {!roomReady ? (
                              <div className="min-h-[45vh]" aria-hidden="true" />
                            ) : messages.length === 0 ? (
                              <div className="text-center py-8 text-white/42">
                                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-white/25" />
                                <p className="text-sm">
                                  Noch keine Nachrichten.
                                </p>
                                <p className="text-xs mt-2">
                                  Sei der Erste, der eine Nachricht schreibt!
                                </p>
                              </div>
                            ) : (
                              <div className="w-full space-y-0.5">
                                {renderedStream.map((item) => {
                                  if (item.type === "date") {
                                    return (
                                      <div
                                        key={`date-${item.key}`}
                                        className="py-3.5 flex items-center justify-center"
                                      >
                                        <div className="rounded-lg border border-white/[0.055] bg-[#111820]/92 px-2.5 py-1 text-[10px] font-bold tracking-[0.02em] text-white/45 shadow-[0_10px_28px_-22px_rgba(0,0,0,.95)] backdrop-blur-xl">
                                          {item.label}
                                        </div>
                                      </div>
                                    );
                                  }

                                  const message = item.msg;
                                  const matchCard = parseChatMatchCardMessage(message.message);
                                  if (matchCard) {
                                    return (
                                      <div key={message.id} id={`msg-${message.id}`} className="py-1.5">
                                        <ChatMatchCard
                                          matchId={matchCard.matchId}
                                          teamId={matchCard.teamId}
                                        />
                                      </div>
                                    );
                                  }

                                  const isOwnMessage =
                                    message.user_id === profile?.id;
                                  const name =
                                    message.sender?.name ?? "Unbekannt";
                                  const photoUrl = message.sender?.photo_url;
                                  const isSenderVorstand = !!(
                                    message.sender_player_id &&
                                    vorstandPlayerIdSet.has(
                                      message.sender_player_id,
                                    )
                                  );
                                  const time = formatTimeVienna(
                                    message.created_at,
                                  );
                                  const repliedMessage = message.reply_to_message_id
                                    ? messages.find((m) => m.id === message.reply_to_message_id) ?? null
                                    : null;
                                  const messageReactions = reactionsByMessage[message.id] || [];
                                  const reactionGroups = Array.from(
                                    messageReactions.reduce((map, reaction) => {
                                      const row = map.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, mine: false };
                                      row.count += 1;
                                      if (reaction.user_id === profile?.id) row.mine = true;
                                      map.set(reaction.emoji, row);
                                      return map;
                                    }, new Map<string, { emoji: string; count: number; mine: boolean }>()).values(),
                                  );

                                  return (
                                    <div
                                      key={message.id}
                                      id={`msg-${message.id}`}
                                      className={`group flex min-w-0 gap-1.5 overflow-visible py-[1px] ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                                    >
                                      <Avatar className={`h-7 w-7 flex-shrink-0 mt-0.5 ${isOwnMessage ? "hidden" : ""}`}>
                                        <AvatarImage
                                          src={photoUrl || "/placeholder.svg"}
                                          alt={name}
                                        />
                                        <AvatarFallback className="bg-orange-500/[0.10] text-orange-300 text-[10px]">
                                          {initials(name)}
                                        </AvatarFallback>
                                      </Avatar>

                                      <div
                                        className={`flex flex-col flex-1 min-w-0 max-w-[88%] sm:max-w-[82%] md:max-w-[76%] lg:max-w-[68%] xl:max-w-[64%] 2xl:max-w-[60%] ${
                                          isOwnMessage
                                            ? "items-end"
                                            : "items-start"
                                        }`}
                                      >
                                        {!isOwnMessage && (
                                          <div className="w-full mb-0.5">
                                            <div className="flex items-center gap-2">
                                              <div className="min-w-0 flex flex-wrap items-center gap-2">
                                                <span className="break-words text-[12px] font-bold text-orange-200/90">
                                                  {name}
                                                </span>

                                                {isSenderVorstand && (
                                                  <span className="inline-flex shrink-0 items-center rounded-full border border-orange-300/15 bg-orange-500/[0.09] px-2 py-0.5 text-[10px] font-black text-orange-200">
                                                    🛡️ Vorstand
                                                  </span>
                                                )}
                                              </div>


                                            </div>
                                          </div>
                                        )}

                                        <div
                                          className={`px-2.5 py-1.5 min-w-0 ${
                                            message.message_type === "poll"
                                              ? "w-full max-w-full"
                                              : "w-fit max-w-full"
                                          } ${isOwnMessage ? WA.bubbleOwn : WA.bubbleOther}`}
                                        >
                                          {repliedMessage && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                document.getElementById(`msg-${repliedMessage.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                                              }}
                                              className={`mb-1.5 block w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left ${isOwnMessage ? "border-orange-200/70 bg-black/15" : "border-orange-400/70 bg-black/10"}`}
                                            >
                                              <div className="truncate text-[11px] font-bold text-orange-200">
                                                {repliedMessage.sender?.name || "Nachricht"}
                                              </div>
                                              <div className="mt-0.5 truncate text-[11px] text-white/60">
                                                {repliedMessage.deleted_at ? "Diese Nachricht wurde gelöscht" : repliedMessage.message || repliedMessage.attachment_name || "Nachricht"}
                                              </div>
                                            </button>
                                          )}

                                          {message.attachment_url &&
                                            isImageFile(
                                              message.attachment_type,
                                            ) && (
                                              <div className="mb-2">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOpenImageUrl(
                                                      message.attachment_url ||
                                                        null,
                                                    );
                                                    setOpenImageName(
                                                      message.attachment_name ||
                                                        "Bild",
                                                    );
                                                  }}
                                                  className="block"
                                                >
                                                  <img
                                                    src={message.attachment_url}
                                                    alt={
                                                      message.attachment_name ||
                                                      "Bild"
                                                    }
                                                    className="max-w-full cursor-zoom-in rounded-xl border border-white/[0.08]"
                                                  />
                                                </button>
                                              </div>
                                            )}

                                          {message.attachment_url &&
                                            message.attachment_type ===
                                              "application/pdf" && (
                                              <div className="mb-2">
                                                <a
                                                  href={message.attachment_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${
                                                    isOwnMessage
                                                      ? "border-white/20 bg-white/10 text-white"
                                                      : "border-white/[0.08] bg-white/[0.04] text-white/88"
                                                  }`}
                                                >
                                                  <FileText className="h-4 w-4" />
                                                  <span className="text-sm truncate">
                                                    {message.attachment_name ||
                                                      "PDF öffnen"}
                                                  </span>
                                                </a>
                                              </div>
                                            )}

                                          {message.message_type === "poll"
                                            ? (() => {
                                                const poll =
                                                  pollsByMessage[message.id];
                                                if (!poll) {
                                                  return (
                                                    <p className="text-sm">
                                                      Abstimmung wird geladen...
                                                    </p>
                                                  );
                                                }

                                                const options =
                                                  pollOptionsByPoll[poll.id] ||
                                                  [];
                                                const votes =
                                                  pollVotesByPoll[poll.id] ||
                                                  [];
                                                const totalVotes = votes.length;
                                                const myVoteOptionIds = new Set(
                                                  votes
                                                    .filter(
                                                      (v) =>
                                                        v.user_id ===
                                                        profile?.id,
                                                    )
                                                    .map((v) => v.option_id),
                                                );

                                                return (
                                                  <div className="space-y-3 min-w-0 w-full max-w-full">
                                                    <div className="flex items-center gap-2">
                                                      <BarChart3 className="h-4 w-4" />
                                                      <span className="text-sm font-semibold">
                                                        {poll.question}
                                                      </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                      {options.map((opt) => {
                                                        const optionVotes =
                                                          votes.filter(
                                                            (v) =>
                                                              v.option_id ===
                                                              opt.id,
                                                          ).length;
                                                        const percent =
                                                          totalVotes > 0
                                                            ? Math.round(
                                                                (optionVotes /
                                                                  totalVotes) *
                                                                  100,
                                                              )
                                                            : 0;
                                                        const isMine =
                                                          myVoteOptionIds.has(
                                                            opt.id,
                                                          );

                                                        return (
                                                          <div
                                                            key={opt.id}
                                                            className={`w-full rounded-xl border px-3 py-2 ${
                                                              isOwnMessage
                                                                ? "border-white/20 bg-white/10"
                                                                : "border-white/[0.08] bg-white/[0.04]"
                                                            }`}
                                                          >
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                voteOnPoll(
                                                                  poll.id,
                                                                  opt.id,
                                                                )
                                                              }
                                                              className="w-full text-left"
                                                            >
                                                              <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                  {isMine && (
                                                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                                  )}
                                                                  <span className="text-sm break-words min-w-0">
                                                                    {opt.label}
                                                                  </span>
                                                                </div>
                                                                <span className="text-xs shrink-0">
                                                                  {optionVotes}{" "}
                                                                  · {percent}%
                                                                </span>
                                                              </div>

                                                              <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
                                                                <div
                                                                  className="h-full rounded-full bg-current opacity-40"
                                                                  style={{
                                                                    width: `${percent}%`,
                                                                  }}
                                                                />
                                                              </div>
                                                            </button>

                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                setOpenPollVotesForOption(
                                                                  opt.id,
                                                                );
                                                                setOpenPollVotesOptionLabel(
                                                                  opt.label,
                                                                );
                                                              }}
                                                              className={`mt-2 text-xs underline decoration-dotted ${
                                                                isOwnMessage
                                                                  ? "text-white/80"
                                                                  : "text-white/40"
                                                              }`}
                                                            >
                                                              Anzeigen, wer
                                                              dafür gestimmt hat
                                                            </button>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>

                                                    <div
                                                      className={`text-xs ${isOwnMessage ? "text-white/80" : "text-white/40"}`}
                                                    >
                                                      {totalVotes} Stimme
                                                      {totalVotes === 1
                                                        ? ""
                                                        : "n"}
                                                    </div>
                                                  </div>
                                                );
                                              })()
                                            : message.message?.trim() && (
                                                <p className={`whitespace-pre-wrap break-words text-[14px] leading-[1.42] sm:text-[14.5px] ${message.deleted_at ? "italic text-white/55" : ""}`}>
                                                  {message.message}
                                                </p>
                                              )}

                                          <div className="mt-1 flex justify-end min-w-0">
                                            {(() => {
                                              const readSet =
                                                readByMessage[message.id];
                                              const readCount = readSet
                                                ? readSet.size
                                                : 0;
                                              const me = profile?.id ?? "";
                                              const readCountWithoutMe =
                                                readSet?.has(me)
                                                  ? Math.max(0, readCount - 1)
                                                  : readCount;

                                              return (
                                                <div
                                                  className={`text-[10px] min-w-0 flex items-center gap-1 ${
                                                    isOwnMessage
                                                      ? "text-white/80"
                                                      : "text-white/40"
                                                  }`}
                                                >
                                                  {message.edited_at && !message.deleted_at && <span className="italic">bearbeitet</span>}
                                                  <span>{time}</span>

                                                  {isOwnMessage && recipientsCount > 0 && (
                                                    <button
                                                      type="button"
                                                      className={`ml-0.5 font-black tracking-[-0.08em] ${
                                                        readCountWithoutMe > 0 ? "text-orange-200" : "text-white/55"
                                                      }`}
                                                      onClick={() => setOpenReadsFor(message.id)}
                                                      aria-label={`Gelesen von ${readCountWithoutMe} von ${recipientsCount}`}
                                                      title={`Gelesen von ${readCountWithoutMe} von ${recipientsCount}`}
                                                    >
                                                      {readCountWithoutMe === 0 ? "✓" : "✓✓"}
                                                    </button>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        {!message.deleted_at && reactionGroups.length > 0 && (
                                          <div className={`mt-0.5 flex flex-wrap gap-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                            {reactionGroups.map((r) => (
                                              <button
                                                key={r.emoji}
                                                type="button"
                                                onClick={() => toggleReaction(message.id, r.emoji)}
                                                className={`inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-[12px] ${r.mine ? "border-orange-400/35 bg-orange-500/15" : "border-white/[0.10] bg-[#17212b]"}`}
                                              >
                                                <span>{r.emoji}</span>
                                                <span className="text-[10px] text-white/70">{r.count}</span>
                                              </button>
                                            ))}
                                          </div>
                                        )}

                                        <div className={`relative mt-0.5 flex items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                          <button
                                            type="button"
                                            onClick={() => startReply(message)}
                                            className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 hover:bg-white/[0.08] hover:text-white"
                                            aria-label="Antworten"
                                            title="Antworten"
                                          >
                                            <Reply className="h-3.5 w-3.5" />
                                          </button>
                                          {!message.deleted_at && (
                                            <button
                                              type="button"
                                              onClick={(event) => toggleMessageMenuAt(event, message.id)}
                                              className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 hover:bg-white/[0.08] hover:text-white"
                                              aria-label="Nachrichtenoptionen"
                                            >
                                              <MoreVertical className="h-3.5 w-3.5" />
                                            </button>
                                          )}

                                          {activeMessageMenu === message.id && !message.deleted_at && messageMenuPosition && (
                                            <>
                                              <button
                                                type="button"
                                                aria-label="Nachrichtenmenü schließen"
                                                className="fixed inset-0 z-[90] cursor-default bg-transparent"
                                                onClick={() => {
                                                  setActiveMessageMenu(null);
                                                  setMessageMenuPosition(null);
                                                }}
                                              />
                                              <div
                                                className="fixed z-[100] w-[220px] rounded-xl border border-white/[0.10] bg-[#202a33] p-2 shadow-2xl"
                                                style={{ top: messageMenuPosition.top, left: messageMenuPosition.left }}
                                                onClick={(event) => event.stopPropagation()}
                                              >
                                              <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-white/35">Reagieren</div>
                                              <div className="mb-2 flex items-center justify-between gap-1">
                                                {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                                  <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => toggleReaction(message.id, emoji)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[18px] hover:bg-white/[0.08]"
                                                  >
                                                    {emoji}
                                                  </button>
                                                ))}
                                              </div>
                                              <button type="button" onClick={() => startReply(message)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/80 hover:bg-white/[0.07]">
                                                <Reply className="h-3.5 w-3.5" /> Antworten
                                              </button>
                                              {isOwnMessage && message.message_type !== "poll" && (
                                                <button type="button" onClick={() => startEdit(message)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/80 hover:bg-white/[0.07]">
                                                  <Pencil className="h-3.5 w-3.5" /> Bearbeiten
                                                </button>
                                              )}
                                              {isOwnMessage && (
                                                <button type="button" onClick={() => deleteOwnMessage(message)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-red-300 hover:bg-red-500/10">
                                                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                                                </button>
                                              )}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div ref={messagesEndRef} />
                              </div>
                            )}
                          </div>

                          {/* ✅ Composer "fixiert": sticky bottom im Card-Container */}
                          <div
                            className={`px-2 py-1.5 pb-2 sm:px-4 ${WA.composer} shrink-0 z-10`}
                          >
                            <div className="w-full space-y-2">
                              {(replyToMessage || editingMessage) && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#17212b] px-3 py-2">
                                  <div className="min-w-0 border-l-4 border-orange-400 pl-2.5">
                                    <div className="truncate text-[11px] font-bold text-orange-300">
                                      {editingMessage ? "Nachricht bearbeiten" : `Antwort an ${replyToMessage?.sender?.name || "Nachricht"}`}
                                    </div>
                                    <div className="mt-0.5 truncate text-xs text-white/55">
                                      {editingMessage?.message || replyToMessage?.message || replyToMessage?.attachment_name || "Nachricht"}
                                    </div>
                                  </div>
                                  <button type="button" onClick={cancelComposerAction} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/45 hover:bg-white/[0.08] hover:text-white">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              )}

                              {selectedFiles.length > 0 && (
                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-white/80">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">
                                      {selectedFiles.length} Datei(en)
                                      ausgewählt
                                    </span>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={clearSelectedFiles}
                                      className="rounded-xl"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="flex gap-2 overflow-x-auto">
                                    {selectedFiles.map((file, index) => (
                                      <div
                                        key={`${file.name}-${index}`}
                                        className="min-w-[120px] shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-2"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          {file.type.startsWith("image/") ? (
                                            <ImageIcon className="h-4 w-4 shrink-0 text-orange-300" />
                                          ) : (
                                            <FileText className="h-4 w-4 shrink-0 text-orange-300" />
                                          )}
                                          <span className="text-xs truncate">
                                            {file.name}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="relative flex items-end gap-1.5">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  accept="image/jpeg,image/png,image/webp,application/pdf"
                                  className="hidden"
                                  onChange={handleFileChange}
                                />

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPollDialogOpen(true)}
                                  disabled={sending || !profile?.id}
                                  className="h-11 w-10 shrink-0 rounded-full border-0 bg-transparent p-0 text-white/55 transition-colors hover:bg-white/[0.08] hover:text-orange-200"
                                >
                                  <BarChart3 className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={sending || !profile?.id}
                                  className="h-11 w-10 shrink-0 rounded-full border-0 bg-transparent p-0 text-white/55 transition-colors hover:bg-white/[0.08] hover:text-orange-200"
                                >
                                  <Paperclip className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEmojiOpen((v) => !v)}
                                  className={`h-11 w-9 shrink-0 rounded-full p-0 hover:bg-white/[0.06] ${emojiOpen ? "text-orange-300" : "text-white/45 hover:text-white/75"}`}
                                  aria-label="Emoji auswählen"
                                >
                                  <Smile className="h-[19px] w-[19px]" />
                                </Button>

                                {emojiOpen && (
                                  <div className="absolute bottom-[52px] left-0 z-50 w-[286px] max-w-[calc(100vw-28px)] rounded-2xl border border-white/[0.10] bg-[#202a33] p-2.5 shadow-2xl">
                                    <div className="mb-2 px-1 text-[11px] font-bold text-white/45">Emojis</div>
                                    <div className="grid grid-cols-8 gap-1 sm:grid-cols-8">
                                      {CHAT_EMOJIS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => insertEmoji(emoji)}
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[21px] hover:bg-white/[0.08] active:scale-95"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <Input
                                  id="emd-chat-input"
                                  placeholder="Nachricht"
                                  value={newMessage}
                                  onChange={(e) => handleMessageInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      submitComposer();
                                    }
                                  }}
                                  disabled={sending || !profile?.id}
                                  className={`flex-1 text-sm ${WA.input}`}
                                />

                                <Button
                                  onClick={submitComposer}
                                  disabled={
                                    editingMessage
                                      ? !newMessage.trim() || sending || !profile?.id
                                      : ((!newMessage.trim() && selectedFiles.length === 0) ||
                                        sending ||
                                        !profile?.id)
                                  }
                                  size="icon"
                                  className={WA.sendBtn}
                                >
                                  {sending ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  ) : (
                                    <Send className="h-[18px] w-[18px]" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
        ) : appSection === "lineup" ? (
          <ChatLineupPanel
            key={`lineup-${urlMatchId ?? "list"}-${urlTeamId ?? "team"}`}
            initialMatchId={urlMatchId}
            initialTeamId={urlTeamId}
          />
        ) : (
          <ChatUpdatesPanel
            key="updates"
            onOpenLineup={() => setAppSection("lineup")}
          />
        )}
      </main>

      <nav className={`${appSection === "chats" && mobileChatOpen ? "hidden lg:flex" : "flex"} relative z-30 h-[64px] shrink-0 items-stretch border-t border-white/[0.07] bg-[#111820]`}>
        {[
          { key: "chats" as const, label: "Chats", icon: MessageCircle, badge: totalUnread },
          { key: "updates" as const, label: "Aktuell", icon: Newspaper, badge: 0 },
          { key: "lineup" as const, label: "Aufstellung", icon: ClipboardList, badge: 0 },
        ].map((item) => {
          const Icon = item.icon;
          const active = appSection === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setAppSection(item.key);

                if (item.key !== "chats") {
                  // Übersichtsseiten wie WhatsApp immer sauber von oben öffnen.
                  // Wichtig: kein scrollIntoView aus dem Nachrichtenfenster darf
                  // den Scrollstand von Aufstellung/Aktuell beeinflussen.
                  setMobileChatOpen(false);
                }
              }}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${active ? "text-orange-300" : "text-white/45 hover:text-white/75"}`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {item.badge > 0 ? (
                  <span className="absolute -right-3 -top-2 min-w-[18px] rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">{item.badge > 99 ? "99+" : item.badge}</span>
                ) : null}
              </span>
              <span>{item.label}</span>
              {active ? <span className="absolute top-0 h-0.5 w-10 rounded-full bg-orange-400" /> : null}
            </button>
          );
        })}
      </nav>

      <Dialog
        open={!!openReadsFor}
        onOpenChange={(o) => setOpenReadsFor(o ? openReadsFor : null)}
      >
        <DialogContent className="max-w-md rounded-[24px] border border-white/[0.10] bg-[#090c12]/96 text-white shadow-[0_30px_100px_-46px_rgba(0,0,0,.98)] backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Gelesen von</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {openReadsFor &&
            (readNamesByMessage[openReadsFor] || []).length === 0 ? (
              <p className="text-sm text-white/42">Noch niemand.</p>
            ) : (
              (openReadsFor ? readNamesByMessage[openReadsFor] || [] : []).map(
                (n) => (
                  <div key={n} className="text-sm">
                    {n}
                  </div>
                ),
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!openImageUrl}
        onOpenChange={(o) => {
          if (!o) {
            setOpenImageUrl(null);
            setOpenImageName(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-5xl rounded-[24px] border border-white/[0.10] bg-[#090c12]/96 p-2 text-white shadow-[0_30px_100px_-46px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:p-4">
          <DialogHeader>
            <DialogTitle className="truncate">
              {openImageName || "Bild"}
            </DialogTitle>
          </DialogHeader>

          {openImageUrl && (
            <div className="flex items-center justify-center">
              <img
                src={openImageUrl}
                alt={openImageName || "Bild"}
                className="max-h-[80vh] w-auto max-w-full rounded-xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!openPollVotesForOption}
        onOpenChange={(o) => {
          if (!o) {
            setOpenPollVotesForOption(null);
            setOpenPollVotesOptionLabel(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[24px] border border-white/[0.10] bg-[#090c12]/96 text-white shadow-[0_30px_100px_-46px_rgba(0,0,0,.98)] backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              Stimmen für: {openPollVotesOptionLabel || "Option"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {openPollVotesForOption &&
            (pollVoteNamesByOption[openPollVotesForOption] || []).length ===
              0 ? (
              <p className="text-sm text-white/42">Noch niemand.</p>
            ) : (
              (openPollVotesForOption
                ? pollVoteNamesByOption[openPollVotesForOption] || []
                : []
              ).map((name) => (
                <div key={name} className="text-sm">
                  {name}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pollDialogOpen}
        onOpenChange={(o) => {
          setPollDialogOpen(o);
          if (!o) resetPollForm();
        }}
      >
        <DialogContent className="max-w-lg rounded-[24px] border border-white/[0.10] bg-[#090c12]/96 text-white shadow-[0_30px_100px_-46px_rgba(0,0,0,.98)] backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Abstimmung erstellen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Frage</label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="z. B. Wann trainieren wir?"
                className="border-white/[0.10] bg-white/[0.04] text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Optionen</label>

              {pollOptionsInput.map((opt, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) =>
                      updatePollOptionField(index, e.target.value)
                    }
                    placeholder={`Option ${index + 1}`}
                    className="border-white/[0.10] bg-white/[0.04] text-white placeholder:text-white/30"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removePollOptionField(index)}
                    disabled={pollOptionsInput.length <= 2}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addPollOptionField}
                disabled={pollOptionsInput.length >= 5}
                className="w-full border-white/[0.10] bg-white/[0.035] text-white/75 hover:bg-white/[0.06] hover:text-white"
              >
                Option hinzufügen
              </Button>
            </div>

            <Button
              type="button"
              onClick={sendPoll}
              disabled={pollSending}
              className="w-full bg-orange-500 font-black text-white hover:bg-orange-500/90"
            >
              {pollSending ? "Erstelle..." : "Abstimmung senden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
