type RuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
};

const readGlobalEnv = (): RuntimeEnv => {
  const globalEnv =
    (globalThis as { __ENV?: RuntimeEnv; env?: RuntimeEnv }).__ENV ||
    (globalThis as { env?: RuntimeEnv }).env;

  return globalEnv ?? {};
};

export const getRuntimeEnv = (): RuntimeEnv => {
  const importEnv = (import.meta.env || {}) as RuntimeEnv;
  const globalEnv = readGlobalEnv();

  return {
    VITE_SUPABASE_URL: importEnv.VITE_SUPABASE_URL || globalEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      importEnv.VITE_SUPABASE_PUBLISHABLE_KEY || globalEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID:
      importEnv.VITE_SUPABASE_PROJECT_ID || globalEnv.VITE_SUPABASE_PROJECT_ID,
  };
};

export const getSupabaseUrl = (): string | undefined => {
  const env = getRuntimeEnv();
  if (env.VITE_SUPABASE_URL) return env.VITE_SUPABASE_URL;
  if (env.VITE_SUPABASE_PROJECT_ID) {
    return `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
  }
  // Fallback to the project's default Supabase URL
  return "https://mypfeihhophbtulgbonp.supabase.co";
};

export const getSupabasePublishableKey = (): string | undefined => {
  const env = getRuntimeEnv();
  return env.VITE_SUPABASE_PUBLISHABLE_KEY;
};

