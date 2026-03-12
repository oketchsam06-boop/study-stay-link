import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: string | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const ROLE_PRIORITY: AppRole[] = ["admin", "landlord", "student"];

const isAppRole = (value: unknown): value is AppRole =>
  typeof value === "string" && ["student", "landlord", "admin"].includes(value);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let profileRequestId = 0;

    const resetAuthState = () => {
      setProfile(null);
      setRole(null);
      setRoles([]);
      setLoading(false);
    };

    const syncUserContext = (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        resetAuthState();
        return;
      }

      setLoading(true);
      const currentRequestId = ++profileRequestId;

      void fetchProfile(nextSession.user.id, nextSession.user.user_metadata?.role).finally(() => {
        if (!isMounted || currentRequestId !== profileRequestId) return;
        setLoading(false);
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncUserContext(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      syncUserContext(initialSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, fallbackRole?: unknown) => {
    const metadataRole = isAppRole(fallbackRole) ? fallbackRole : null;

    try {
      const [{ data: profileData, error: profileError }, { data: rolesData, error: rolesError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
      ]);

      if (profileError) {
        console.error("Failed to fetch profile:", profileError);
      }
      setProfile(profileData ?? null);

      if (rolesError) {
        console.error("Failed to fetch user roles:", rolesError);
        setRoles(metadataRole ? [metadataRole] : []);
        setRole(metadataRole);
        return;
      }

      if (rolesData && rolesData.length > 0) {
        const mappedRoles = rolesData.map((r: UserRole) => r.role);
        const primaryRole = ROLE_PRIORITY.find((r) => mappedRoles.includes(r)) ?? mappedRoles[0] ?? null;
        setRoles(mappedRoles);
        setRole(primaryRole);
        return;
      }

      setRoles(metadataRole ? [metadataRole] : []);
      setRole(metadataRole);
    } catch (error) {
      console.error("Unexpected profile fetch error:", error);
      setProfile(null);
      setRoles(metadataRole ? [metadataRole] : []);
      setRole(metadataRole);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setRoles([]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, roles, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

