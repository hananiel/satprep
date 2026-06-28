import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. " +
      "Auth, scores, and gamification will be disabled. " +
      "Create a .env.local file to enable them."
  );
}

// Chained no-op proxy so callers that do `supabase.from(..).insert(..)` etc.
// don't crash when Supabase isn't configured. Every property access returns
// another callable proxy; calling it returns a resolved `{ data: null, error }`.
function makeStub() {
  const error = { message: "Supabase is not configured." };
  const handler = {
    get(_t, prop) {
      if (prop === "then") return undefined; // not a thenable
      if (prop === "auth") return authStub;
      return makeStub();
    },
    apply() {
      return Promise.resolve({ data: null, error });
    },
  };
  const fn = () => Promise.resolve({ data: null, error });
  return new Proxy(fn, handler);
}

const authStub = {
  getUser: async () => ({ data: { user: null }, error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: (_cb) => ({
    data: { subscription: { unsubscribe: () => {} } },
  }),
  signInWithPassword: async () => ({
    data: null,
    error: { message: "Supabase is not configured." },
  }),
  signUp: async () => ({
    data: null,
    error: { message: "Supabase is not configured." },
  }),
  signOut: async () => ({ error: null }),
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : makeStub();
