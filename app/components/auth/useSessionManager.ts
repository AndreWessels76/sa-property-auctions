"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export function useSessionManager() {
  const { session, user, loading } = useAuth();
  const [expired, setExpired] = useState(false);

  const hadSession =
    typeof window !== "undefined" &&
    sessionStorage.getItem("had-session") === "true";

  useEffect(() => {
    if (session) {
      sessionStorage.setItem("had-session", "true");
    }
  }, [session]);

  useEffect(() => {
    if (session || user) {
      setExpired(false);
      return;
    }

    if (!loading && hadSession && !session && !user) {
      setExpired(true);
    }
  }, [session, user, loading, hadSession]);

  return {
    expired,
    setExpired,
  };
}
