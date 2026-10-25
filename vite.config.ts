import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  const cashfreeEnv = env.VITE_CASHFREE_ENV || env.CASHFREE_ENV || "production";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl ?? ""),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey ?? ""),
      "import.meta.env.VITE_CASHFREE_ENV": JSON.stringify(cashfreeEnv),
    },
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        "/api": "http://localhost:8787",
      },
    },
  };
});
