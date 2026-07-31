"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Root layout error boundary (must include html/body). */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 28, marginBottom: 12 }}>
              Something went wrong
            </h1>
            <p style={{ color: "#64748b", marginBottom: 24 }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#0f172a",
                color: "#fff",
                border: 0,
                borderRadius: 12,
                padding: "12px 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
