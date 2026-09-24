-- EMD Club Terminal: unique 4-digit PIN login
-- Already applied to the connected Supabase project in this build.

alter table private.terminal_credentials
  add column if not exists pin_lookup_hash text;

create unique index if not exists terminal_credentials_pin_lookup_hash_uq
  on private.terminal_credentials(pin_lookup_hash)
  where pin_lookup_hash is not null;

-- terminal_set_my_pin now stores bcrypt + private lookup fingerprint
-- and rejects a PIN already used by another member.
-- See connected Supabase migration: terminal_unique_4_digit_pin_login.
