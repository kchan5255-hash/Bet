"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabase/client";

export type AuthState = {
  user: User | null;
  session: Session | null;
  ready: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    ready: false,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        ready: true,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        ready: true,
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
