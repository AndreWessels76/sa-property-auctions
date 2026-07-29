"use client";

import SessionExpiredModal from "./SessionExpiredModal";
import { useSessionManager } from "./useSessionManager";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { expired, setExpired } = useSessionManager();

  return (
    <>
      {children}
      <SessionExpiredModal
        open={expired}
        onClose={() => setExpired(false)}
      />
    </>
  );
}
