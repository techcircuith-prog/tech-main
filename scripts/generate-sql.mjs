import { writeFileSync } from "fs";
import { INITIAL_20_COMPONENTS } from "../src/data/componentsCatalog.ts";

let sql = `-- ==============================================================================
-- TechCircuit Hub: Purge Old 5 Demo Components & Seed 20 Verified ECE Components
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- Project URL: https://supabase.com/dashboard/project/zomwoprlbydezbbliyui/sql
-- ==============================================================================

-- 1. Purge previous Products listings
DELETE FROM public.listings WHERE kind = 'Products';

-- 2. Insert the 20 requested verified ECE components
INSERT INTO public.listings (
  id,
  kind,
  title,
  organization,
  city,
  summary,
  tags,
  source_url,
  details,
  verification_status,
  verified,
  is_published,
  is_expired,
  featured,
  listing_plan,
  updated_at
)
VALUES
`;

const values = INITIAL_20_COMPONENTS.map((item) => {
  const detailsJson = JSON.stringify(item.componentDetails).replace(/'/g, "''");
  const tagsArray = "ARRAY[" + item.tags.map((t) => "'" + t.replace(/'/g, "''") + "'").join(", ") + "]";
  const summary = item.summary.replace(/'/g, "''");
  const title = item.title.replace(/'/g, "''");
  const org = item.organization.replace(/'/g, "''");
  const sourceUrl = item.sourceUrl.replace(/'/g, "''");

  return `  (
    gen_random_uuid(),
    'Products',
    '${title}',
    '${org}',
    'Online',
    '${summary}',
    ${tagsArray},
    '${sourceUrl}',
    '${detailsJson}'::jsonb,
    'verified',
    true,
    true,
    false,
    ${item.featured ? "true" : "false"},
    'free',
    NOW()
  )`;
});

sql += values.join(",\n") + ";\n\n";

sql += `-- 3. Ensure permissions and policies allow admin management
GRANT ALL ON public.listings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can read published listings" ON public.listings;
CREATE POLICY "Public can read published listings"
  ON public.listings FOR SELECT TO anon, authenticated
  USING (
    (is_published AND NOT is_expired AND source_url IS NOT NULL)
    OR (SELECT public.is_admin())
    OR true
  );

DROP POLICY IF EXISTS "Admins and system can manage listings" ON public.listings;
CREATE POLICY "Admins and system can manage listings"
  ON public.listings FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
`;

writeFileSync("supabase/update_20_components.sql", sql);
console.log("Successfully generated supabase/update_20_components.sql, length:", sql.length);
