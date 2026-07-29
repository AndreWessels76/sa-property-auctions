"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchProfile } from "@/lib/auth/fetchProfile";
import { getUserRole } from "@/lib/auth/authGuard";
import { fromDatabaseRole } from "@/lib/auth/profileRole";
import { setFavouritesUser } from "@/lib/favourites";
import { clearCachedProfile, profileCache } from "@/lib/auth/profileCache";
import type { CurrentProfile } from "@/lib/auth/profileTypes";
import type { Role } from "@/lib/permissions/roles";
import {
  normalizeSubscription,
  type SubscriptionStatus,
} from "@/lib/subscription";

type AuthContextValue = {
  supabase: ReturnType<typeof createClient>;
  session: Session | null;
  user: User | null;
  profile: CurrentProfile | null;
  role: Role;
  subscription: SubscriptionStatus | null;
  loading: boolean;

  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<CurrentProfile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const supabase = createClient();

export default function AuthProvider({
  children,
  initialSession = null,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialSession?: Session | null;
  initialProfile?: CurrentProfile | null;
}) {
  const [session, setSession] = useState(initialSession);
  const [user, setUser] = useState(initialSession?.user ?? null);
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(Boolean(initialSession));

  useEffect(() => {
    if (initialProfile) {
      profileCache.set(initialProfile.id, initialProfile);
    }
  }, [initialProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    clearCachedProfile(user.id);
    const nextProfile = await fetchProfile(user.id);

    setProfile(nextProfile);
  }, [user]);

  const updateProfile = useCallback(
    async (updates: Partial<CurrentProfile>) => {
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const payload = (await response.json().catch(() => null)) as
        | CurrentProfile
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Failed to update profile",
        );
      }

      const nextProfile = payload as CurrentProfile;

      clearCachedProfile(user.id);
      profileCache.set(user.id, nextProfile);
      setProfile(nextProfile);
    },
    [user],
  );

  useEffect(() => {
    let mounted = true;

    async function syncAuth(nextSession: Session | null) {
      const nextUser = nextSession?.user ?? null;

      if (!mounted) return;

      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextProfile = await fetchProfile(nextUser.id);

      if (!mounted) return;

      setProfile(nextProfile);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncAuth(data.session).finally(() => {
        if (mounted) {
          setInitialized(true);
        }
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "TOKEN_REFRESHED") {
        if (!mounted) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }

      if (event === "SIGNED_OUT") {
        if (!mounted) return;

        clearCachedProfile();
        setFavouritesUser(null);
        sessionStorage.removeItem("had-session");
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      syncAuth(nextSession).catch(() => {
        if (!mounted) return;

        setLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    setFavouritesUser(user?.id ?? null);
  }, [initialized, user?.id]);

  const role = profile
    ? fromDatabaseRole(profile.role)
    : getUserRole(user);
  const subscription = profile
    ? normalizeSubscription(profile.subscription_status)
    : null;

  const value = useMemo(
    () => ({
      supabase,
      session,
      user,
      profile,
      role,
      subscription,
      loading,
      refreshProfile,
      updateProfile,
    }),
    [
      session,
      user,
      profile,
      role,
      subscription,
      loading,
      refreshProfile,
      updateProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function useUser() {
  return useAuth().user;
}

export function useSession() {
  return useAuth().session;
}
