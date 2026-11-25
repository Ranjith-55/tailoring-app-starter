import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Helpful warning during local dev / build if .env.local isn't set up yet.
  // We still fall back to placeholder values below so `npm run build`
  // doesn't crash before you've configured Supabase — actual data calls
  // will simply fail (visibly) until real values are provided.
  console.warn(
    "Supabase env vars are missing. Copy .env.example to .env.local and fill in your project values."
  );
}

// Only the public "anon" key is ever used in the browser.
// Row-Level Security policies (see supabase/schema.sql) are what keep
// staff from doing owner-only actions, not this key.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
