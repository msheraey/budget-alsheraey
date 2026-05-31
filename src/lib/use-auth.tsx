import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface Ctx {
  session: Session | null;
  loading: boolean;
}

export function useAuth(): Ctx {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function AuthGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <>{fallback}</>;
  return <>{children}</>;
}
