// Public Supabase project values (safe to ship to the browser — access is
// enforced by Row Level Security, not by keeping these secret).
// Fill these in with your project's values from Supabase Settings > API.
const SUPABASE_URL = "https://zpitmchdcqpfjfpoemuc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwaXRtY2hkY3FwZmpmcG9lbXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjMwODQsImV4cCI6MjA4NTU5OTA4NH0.kQZa5XsHXqxKPuLA9QHEq0rRyI6UVDsP_KIWZa3byrQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
