import { createAdminClient } from "@/lib/supabase/admin";

// TEMP debug helper -- 2026-08-27 post-login gap investigation. Vercel's
// `vercel logs` on this project's tier only returns a thin historical
// invocation snapshot with no console.log body content, so real per-hop
// timing gets written to a throwaway table instead, queryable directly.
// To be deleted (this file, its call sites, and the _perf_debug table)
// once the gap is root-caused.
export async function perfLog(label: string, ms: number): Promise<void> {
  console.log(`[perf] ${label}: ${ms}ms`);
  const admin = createAdminClient();
  try {
    await admin.from("_perf_debug").insert({ label, ms });
  } catch {
    // best-effort debug logging only
  }
}
