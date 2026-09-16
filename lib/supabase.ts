import { createClient } from "@supabase/supabase-js";

function getTabId() {
  if (typeof window === "undefined") {
    return "server";
  }

  let tabId = sessionStorage.getItem("gamearena-tab-id");

  if (!tabId) {
    tabId =
      crypto.randomUUID();

    sessionStorage.setItem(
      "gamearena-tab-id",
      tabId
    );
  }

  return tabId;
}

const tabId = getTabId();

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage:
        typeof window !== "undefined"
          ? window.sessionStorage
          : undefined,

      storageKey:
        `gamearena-auth-${tabId}`,

      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);