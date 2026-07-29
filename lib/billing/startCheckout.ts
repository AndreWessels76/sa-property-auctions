import type { BillingInterval } from "@/lib/billing/BillingTypes";

export async function startCheckout(interval: BillingInterval) {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ interval }),
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    throw new Error(data.error ?? "Failed to start checkout");
  }

  window.location.href = data.url;
}

export async function openBillingPortal() {
  const response = await fetch("/api/billing/portal", {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    throw new Error(data.error ?? "Failed to open billing portal");
  }

  window.location.href = data.url;
}
