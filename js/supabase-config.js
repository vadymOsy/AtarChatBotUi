// Public Supabase project values (safe to ship to the browser — access is
// enforced by Row Level Security, not by keeping these secret).
// Fill these in with your project's values from Supabase Settings > API.
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
