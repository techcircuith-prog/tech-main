#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

// SAFETY CHECK: Disallow production runs
if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production" || process.env.NETLIFY_ENV === "production") {
  console.error("❌ Refusing to run seed script in production environment.");
  process.exit(1);
}

// Load env files
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL or Anon Key is missing. Check your .env.local file.");
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

function randomStr(len = 6) {
  return randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}

async function runSeed() {
  console.log("\n=======================================================");
  console.log("🌱 TECHCIRCUIT HUB — DEV / PREVIEW TEST ACCOUNT SEEDER");
  console.log("=======================================================\n");

  const runId = randomStr(4);
  const studentEmail = `student.test.${runId}@techcircuit.dev`;
  const studentPassword = `Student#${randomStr(6)}!`;
  const studentName = "Aravind Kumar";

  const adminEmail = `admin.test.${runId}@techcircuit.dev`;
  const adminPassword = `Admin#${randomStr(6)}!`;
  const adminName = "Platform Administrator";

  console.log("1. Creating test student account...");
  const { data: studentAuth, error: studentAuthError } = await client.auth.signUp({
    email: studentEmail,
    password: studentPassword,
    options: {
      data: { name: studentName }
    }
  });

  if (studentAuthError) {
    console.warn(`   ⚠️ Student signup note: ${studentAuthError.message}`);
  } else {
    console.log(`   ✅ Student account created: ${studentEmail}`);
  }

  const studentUser = studentAuth?.user;
  if (studentUser) {
    // Populate student profile
    const { error: profileError } = await client.from("profiles").upsert({
      id: studentUser.id,
      display_name: studentName,
      institution: "PSG College of Technology",
      course: "B.E. Electronics and Communication Engineering",
      academic_year: "3rd year",
      city: "Coimbatore, Tamil Nadu",
      interests: ["ECE", "Embedded Systems", "VLSI & Chip Design", "Internet of Things (IoT)"],
      role: "student"
    });
    if (profileError) {
      console.warn(`   ⚠️ Profile setup warning: ${profileError.message}`);
    } else {
      console.log("   ✅ Student academic profile details saved.");
    }

    // Seed test applications
    const sampleApps = [
      {
        id: `APP-2026-${randomStr(5).toUpperCase()}`,
        student_id: studentUser.id,
        opportunity_id: "lead-intern-qualcomm-vlsi-2026",
        opportunity_title: "Hardware / VLSI Engineering Internship",
        opportunity_organization: "Qualcomm India",
        opportunity_city: "Bengaluru, Karnataka",
        opportunity_kind: "Internships",
        opportunity_url: "https://www.qualcomm.com/company/careers",
        status: "Applied",
        verification_status: "Self-reported",
        applied_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: `APP-2026-${randomStr(5).toUpperCase()}`,
        student_id: studentUser.id,
        opportunity_id: "lead-intern-ti-embedded-2026",
        opportunity_title: "Embedded Systems & Firmware Trainee",
        opportunity_organization: "Texas Instruments",
        opportunity_city: "Bengaluru, Karnataka",
        opportunity_kind: "Internships",
        opportunity_url: "https://careers.ti.com/",
        status: "Enrolled",
        verification_status: "Verified",
        applied_at: new Date(Date.now() - 7 * 86400000).toISOString()
      }
    ];

    try {
      const { error: appError } = await client.from("applications").upsert(sampleApps);
      if (appError) {
        console.warn(`   ⚠️ Application table seeding warning: ${appError.message}`);
        // Fallback to opportunity_activity if table not yet migrated
        const fallbackActivities = sampleApps.map(a => ({
          user_id: a.student_id,
          opportunity_id: a.opportunity_id,
          opportunity_kind: a.opportunity_kind,
          title: a.opportunity_title,
          organization: a.opportunity_organization,
          city: a.opportunity_city,
          opportunity_url: a.opportunity_url,
          status: a.status.toLowerCase() === "applied" || a.status.toLowerCase() === "enrolled" ? "applied" : "visited",
          visited_at: a.applied_at,
          applied_at: a.applied_at,
          updated_at: new Date().toISOString()
        }));
        await client.from("opportunity_activity").upsert(fallbackActivities);
        console.log("   ✅ Opportunity activity fallback seeded.");
      } else {
        console.log(`   ✅ Seeded ${sampleApps.length} sample application records.`);
      }
    } catch (e) {
      console.warn(`   ⚠️ Seed applications error: ${e.message}`);
    }
  }

  console.log("\n2. Creating test admin account...");
  const { data: adminAuth, error: adminAuthError } = await client.auth.signUp({
    email: adminEmail,
    password: adminPassword,
    options: {
      data: { name: adminName }
    }
  });

  if (adminAuthError) {
    console.warn(`   ⚠️ Admin signup note: ${adminAuthError.message}`);
  } else {
    console.log(`   ✅ Admin account created: ${adminEmail}`);
  }

  const adminUser = adminAuth?.user;
  if (adminUser) {
    const { error: adminProfileError } = await client.from("profiles").upsert({
      id: adminUser.id,
      display_name: adminName,
      role: "admin"
    });
    if (adminProfileError) {
      console.warn(`   ⚠️ Admin role setup note: ${adminProfileError.message}`);
    } else {
      console.log("   ✅ Admin profile and role assigned.");
    }
  }

  console.log("\n=======================================================");
  console.log("🔑 GENERATED TEST CREDENTIALS (DEV ONLY — NOT SAVED IN REPO)");
  console.log("=======================================================");
  console.log("👤 TEST STUDENT ACCOUNT:");
  console.log(`   Email:    ${studentEmail}`);
  console.log(`   Password: ${studentPassword}`);
  console.log(`   Role:     student`);
  console.log("");
  console.log("🛡️ TEST ADMIN ACCOUNT:");
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role:     admin`);
  console.log("=======================================================\n");
}

runSeed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
