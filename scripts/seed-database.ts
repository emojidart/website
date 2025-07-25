import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side operations

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables for seeding")
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function seed() {
  console.log("Seeding database...")

  // Create dart_events table if it doesn't exist
  const { error: createTableError } = await supabase.rpc("create_dart_events_table")
  if (createTableError && createTableError.code !== "42P07") {
    // 42P07 is "duplicate_table"
    console.error("Error creating table:", createTableError)
    return
  }

  // Insert dummy data
  const { data, error: insertError } = await supabase.from("dart_events").upsert(
    [
      {
        id: "1",
        name: "Emojis Dartverein Championship 2025",
        date_start: "2025-08-29",
        date_end: "2025-08-31",
        location: "Magic Castle, Seefeld",
        prize_pool: 3000,
        spots_left: 34,
        event_starts_at: "2025-07-25T00:00:00Z", // Example future date
      },
    ],
    { onConflict: "id" },
  ) // Upsert to avoid duplicates on re-run

  if (insertError) {
    console.error("Error inserting data:", insertError)
  } else {
    console.log("Database seeded successfully!")
  }
}

// This function needs to be created in your Supabase SQL editor
// Go to SQL Editor -> New Query and paste this:
/*
CREATE OR REPLACE FUNCTION create_dart_events_table()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.dart_events (
        id text PRIMARY KEY,
        name text NOT NULL,
        date_start date NOT NULL,
        date_end date NOT NULL,
        location text,
        prize_pool integer,
        spots_left integer,
        event_starts_at timestamp with time zone
    );
END;
$$ LANGUAGE plpgsql;
*/

seed()
