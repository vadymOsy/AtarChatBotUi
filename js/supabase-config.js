// Public Supabase project values (safe to ship to the browser — access is
// enforced by Row Level Security, not by keeping these secret).
// Fill these in with your project's values from Supabase Settings > API.
const SUPABASE_URL = "https://iuqiurtbqdvklfpemhml.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cWl1cnRicWR2a2xmcGVtaG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDQ2NzIsImV4cCI6MjA4NzY4MDY3Mn0.ouZhlwZFl9mVDOnjIErrs-itNJMmLhCyS7y9k9GmxIE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
