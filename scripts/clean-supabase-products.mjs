import { createClient } from "@supabase/supabase-js";

const url = "https://zomwoprlbydezbbliyui.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTQ0MTEsImV4cCI6MjEwNzQ3MDQxMX0.ZsmboSVX_kN4J79tIbZBIbdFMIOijyhfqcayAbGHlt4";

const supabase = createClient(url, key);

async function clean() {
  console.log("Fetching old Products from Supabase listings table...");
  const { data, error } = await supabase.from("listings").select("id, title").eq("kind", "Products");
  if (error) {
    console.error("Supabase fetch error:", error);
    return;
  }
  console.log(`Found ${data?.length || 0} Products in Supabase.`);
  if (data && data.length > 0) {
    const ids = data.map(d => d.id);
    const { error: delErr } = await supabase.from("listings").delete().in("id", ids);
    if (delErr) {
      console.error("Supabase delete error:", delErr);
    } else {
      console.log(`Successfully deleted ${ids.length} old products from Supabase!`);
    }
  }
}

clean();

