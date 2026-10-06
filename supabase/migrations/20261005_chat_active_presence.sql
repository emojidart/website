-- EMD Messenger: aktiver Chat / Push-Unterdrückung
-- Ein Eintrag pro Auth-User + Browser/WebView-Session.
-- Der Server betrachtet nur Einträge der letzten 35 Sekunden als "aktiv".

create table if not exists public.chat_active_presence (
  user_id uuid not null,
  session_id text not null,
  room_id text not null,
  scope text not null,
  is_active boolean not null default false,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create index if not exists chat_active_presence_lookup_idx
  on public.chat_active_presence (room_id, scope, is_active, last_seen_at);

create index if not exists chat_active_presence_user_idx
  on public.chat_active_presence (user_id, last_seen_at);

-- Zugriff erfolgt ausschließlich serverseitig mit Service Role.
alter table public.chat_active_presence enable row level security;

-- Optionales Aufräumen kann später per Cron erfolgen.
-- Für die Funktion ist es nicht nötig, weil Einträge >35 Sekunden ignoriert werden.
