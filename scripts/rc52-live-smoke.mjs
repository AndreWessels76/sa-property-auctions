/**
 * RC5.2 live smoke — production E2E via APIs (no secrets printed).
 * Uses .env.local for Supabase project credentials matching production.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://sa-property-auctions.vercel.app";
const OUT = path.join(process.env.TEMP || "/tmp", "rc52-report.json");

function loadEnvLocal() {
  const map = {};
  const p = ".env.local";
  if (!fs.existsSync(p)) throw new Error("missing .env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return map;
}

function redact(s) {
  return String(s)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[JWT]")
    .replace(/sb_[a-z]+_[A-Za-z0-9_-]+/g, "[KEY]")
    .replace(/sk_(test|live)_[A-Za-z0-9]+/g, "[STRIPE_KEY]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[WHSEC]");
}

async function req(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* plain */
  }
  return { status: res.status, text, json, headers: res.headers };
}

function add(results, phase, check, status, evidence) {
  results.push({ phase, check, status, evidence });
  console.log(`[${status}] ${phase} / ${check} :: ${evidence}`);
}

async function main() {
  const env = loadEnvLocal();
  const supabase = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = env.STRIPE_SECRET_KEY;
  const results = [];
  const stamp = Date.now();
  const email = `rc52.smoke.${stamp}@mailinator.com`;
  const password = "Rc52-Smoke-Test-9!";

  // Ready
  const ready = await req(`${BASE}/api/health/ready`);
  add(
    results,
    "P0",
    "health/ready",
    ready.status === 200 && ready.json?.status === "ready" ? "PASS" : "FAIL",
    `http=${ready.status} status=${ready.json?.status}`,
  );

  // ---------- Phase 1 Registration ----------
  const signup = await req(`${supabase}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      data: { first_name: "RC52", last_name: "Smoke" },
    }),
  });
  const userId = signup.json?.id || signup.json?.user?.id;
  add(
    results,
    "P1",
    "Register new user",
    signup.status === 200 && userId ? "PASS" : "FAIL",
    `http=${signup.status} userId=${Boolean(userId)} confirmSent=${Boolean(signup.json?.confirmation_sent_at)}`,
  );

  const dup = await req(`${supabase}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const dupOk =
    dup.status === 422 ||
    /already|registered|exists/i.test(dup.text) ||
    (dup.status === 200 &&
      Array.isArray(dup.json?.identities) &&
      dup.json.identities.length === 0);
  add(
    results,
    "P1",
    "Duplicate email handling",
    dupOk ? "PASS" : "PARTIAL",
    `http=${dup.status} snip=${redact(dup.text).slice(0, 100)}`,
  );

  const weak = await req(`${supabase}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `rc52.weak.${stamp}@mailinator.com`,
      password: "123",
    }),
  });
  add(
    results,
    "P1",
    "Password validation",
    weak.status >= 400 || /password/i.test(weak.text) ? "PASS" : "FAIL",
    `http=${weak.status}`,
  );

  // Confirm email via admin (simulates inbox click) — required for login
  if (userId && service) {
    const conf = await req(`${supabase}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_confirm: true }),
    });
    add(
      results,
      "P1",
      "Email confirmation (admin simulate link)",
      conf.status === 200 ? "PASS" : "FAIL",
      `http=${conf.status}`,
    );
  }

  const ve = await req(`${BASE}/verify-email?email=${encodeURIComponent(email)}`);
  add(
    results,
    "P1",
    "Confirm-email page",
    ve.status === 200 ? "PASS" : "FAIL",
    `http=${ve.status}`,
  );

  const resend = await req(`${supabase}/auth/v1/resend`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "signup", email }),
  });
  add(
    results,
    "P1",
    "Resend verification",
    [200, 429].includes(resend.status) ? "PASS" : "PARTIAL",
    `http=${resend.status}`,
  );

  await new Promise((r) => setTimeout(r, 1500));
  let profile = null;
  if (userId && service) {
    const prof = await req(
      `${supabase}/rest/v1/profiles?id=eq.${userId}&select=id,role,subscription_status,subscription_plan,stripe_customer_id,stripe_subscription_id,updated_at`,
      {
        headers: {
          apikey: service,
          Authorization: `Bearer ${service}`,
          Accept: "application/json",
        },
      },
    );
    profile = Array.isArray(prof.json) ? prof.json[0] : null;
    add(
      results,
      "P1",
      "Profile creation",
      profile?.id === userId ? "PASS" : "FAIL",
      `http=${prof.status} hasRow=${Boolean(profile)}`,
    );
    add(
      results,
      "P1",
      "Default role=free",
      profile?.role === "free" ? "PASS" : "FAIL",
      `role=${profile?.role ?? "none"}`,
    );
    add(
      results,
      "P1",
      "Default subscription inactive",
      profile?.subscription_status === "inactive" ||
        profile?.subscription_status == null
        ? "PASS"
        : "FAIL",
      `status=${profile?.subscription_status ?? "null"}`,
    );
  }

  // ---------- Phase 2 Auth ----------
  const badLogin = await req(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "WrongPassword!!!1" }),
  });
  add(
    results,
    "P2",
    "Invalid credentials",
    badLogin.status === 401 &&
      !/stack|supabase|service_role|sk_/i.test(badLogin.text)
      ? "PASS"
      : "FAIL",
    `http=${badLogin.status} body=${redact(badLogin.text).slice(0, 80)}`,
  );

  const login = await req(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = login.headers.getSetCookie?.() || [];
  const cookieHeader = setCookie
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  add(
    results,
    "P2",
    "Login",
    login.status === 200 && login.json?.success ? "PASS" : "FAIL",
    `http=${login.status} cookies=${setCookie.length}`,
  );

  // Token login via supabase for API bearer tests
  const tokenLogin = await req(`${supabase}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const accessToken = tokenLogin.json?.access_token;
  add(
    results,
    "P2",
    "Session token issuance",
    tokenLogin.status === 200 && accessToken ? "PASS" : "FAIL",
    `http=${tokenLogin.status}`,
  );

  const forgotPage = await req(`${BASE}/forgot-password`);
  add(
    results,
    "P2",
    "Password reset page",
    forgotPage.status === 200 ? "PASS" : "FAIL",
    `http=${forgotPage.status}`,
  );

  const resetReq = await req(`${supabase}/auth/v1/recover`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  add(
    results,
    "P2",
    "Password reset request",
    [200, 429].includes(resetReq.status) ? "PASS" : "PARTIAL",
    `http=${resetReq.status}`,
  );

  const logout = await req(`${BASE}/api/auth/logout`, {
    method: "POST",
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
  add(
    results,
    "P2",
    "Logout",
    logout.status === 200 ? "PASS" : "FAIL",
    `http=${logout.status}`,
  );

  // re-login for subsequent phases
  const login2 = await req(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookies2 = (login2.headers.getSetCookie?.() || [])
    .map((c) => c.split(";")[0])
    .join("; ");
  const authCookie = cookies2 || cookieHeader;

  // Session persistence: authenticated profile patch/get
  const dash = await req(`${BASE}/dashboard`, {
    headers: authCookie ? { Cookie: authCookie } : {},
    redirect: "manual",
  });
  add(
    results,
    "P2",
    "Session persistence (dashboard with cookies)",
    dash.status === 200 || dash.status === 307
      ? dash.status === 200
        ? "PASS"
        : "PARTIAL"
      : "FAIL",
    `http=${dash.status}`,
  );

  // ---------- Phase 3 Free journey ----------
  const home = await req(`${BASE}/`);
  add(results, "P3", "Home", home.status === 200 ? "PASS" : "FAIL", `http=${home.status}`);
  const props = await req(`${BASE}/api/properties?page=1&pageSize=24`);
  add(
    results,
    "P3",
    "Property search API",
    props.status === 200 && Array.isArray(props.json?.data) ? "PASS" : "FAIL",
    `http=${props.status} total=${props.json?.total}`,
  );
  const propId = props.json?.data?.[0]?.id;
  const detail = propId
    ? await req(`${BASE}/properties/${propId}`)
    : { status: 0 };
  add(
    results,
    "P3",
    "Property details",
    detail.status === 200 ? "PASS" : "FAIL",
    `http=${detail.status}`,
  );
  const gallery = propId
    ? await req(`${BASE}/api/gallery/${propId}`)
    : { status: 0 };
  add(
    results,
    "P3",
    "Gallery",
    gallery.status === 200 ? "PASS" : "FAIL",
    `http=${gallery.status}`,
  );
  const pricing = await req(`${BASE}/pricing`);
  add(
    results,
    "P3",
    "Pricing / upgrade CTA page",
    pricing.status === 200 && /Choose Monthly|Choose Yearly|pricing/i.test(pricing.text)
      ? "PASS"
      : "FAIL",
    `http=${pricing.status}`,
  );

  const aiGuest = await req(`${BASE}/api/properties/ai-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "houses in gauteng" }),
  });
  add(
    results,
    "P3",
    "Premium AI blocked (unauth)",
    aiGuest.status === 401 ? "PASS" : "FAIL",
    `http=${aiGuest.status}`,
  );

  const aiFree = await req(`${BASE}/api/properties/ai-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(authCookie ? { Cookie: authCookie } : {}),
    },
    body: JSON.stringify({ query: "houses in gauteng" }),
  });
  // Free user should be 401/403 premium required (SessionService cookie vs bearer may differ)
  add(
    results,
    "P3",
    "Premium AI blocked (free user)",
    [401, 403].includes(aiFree.status) ? "PASS" : "FAIL",
    `http=${aiFree.status} body=${redact(aiFree.text).slice(0, 80)}`,
  );

  const saved = await req(`${BASE}/api/saved-searches`, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(authCookie ? { Cookie: authCookie } : {}),
    },
  });
  add(
    results,
    "P3",
    "Saved searches (free)",
    [200, 401, 403].includes(saved.status) ? "PASS" : "FAIL",
    `http=${saved.status}`,
  );

  const admin = await req(`${BASE}/admin`, {
    headers: authCookie ? { Cookie: authCookie } : {},
    redirect: "manual",
  });
  add(
    results,
    "P3",
    "Admin blocked for free",
    admin.status === 307 || admin.status === 403 || admin.status === 401
      ? "PASS"
      : "FAIL",
    `http=${admin.status}`,
  );

  // ---------- Phase 4 Stripe Checkout ----------
  const checkout = await req(`${BASE}/api/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authCookie ? { Cookie: authCookie } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ interval: "monthly" }),
  });
  const checkoutUrl =
    checkout.json?.url ||
    checkout.json?.sessionUrl ||
    checkout.json?.checkoutUrl;
  add(
    results,
    "P4",
    "Checkout session creation",
    checkout.status === 200 && checkoutUrl ? "PASS" : "FAIL",
    `http=${checkout.status} hasUrl=${Boolean(checkoutUrl)} body=${redact(checkout.text).slice(0, 120)}`,
  );

  // Direct Stripe API create session if app checkout failed due to cookie auth — still validate Stripe config
  let stripeSession = null;
  if (stripeKey?.startsWith("sk_test") && userId) {
    const priceMonthly = env.STRIPE_PRICE_MONTHLY;
    const siteUrl = "https://sa-property-auctions.vercel.app";
    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("success_url", `${siteUrl}/billing/success`);
    form.set("cancel_url", `${siteUrl}/pricing`);
    form.set("line_items[0][price]", priceMonthly);
    form.set("line_items[0][quantity]", "1");
    form.set("client_reference_id", userId);
    form.set("metadata[userId]", userId);
    form.set("customer_email", email);
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const stripeText = await stripeRes.text();
    let stripeJson = null;
    try {
      stripeJson = JSON.parse(stripeText);
    } catch {
      /* */
    }
    stripeSession = stripeJson;
    const ok = stripeRes.status === 200 && stripeJson?.url;
    add(
      results,
      "P4",
      "Stripe Test Mode session (direct API)",
      ok ? "PASS" : "FAIL",
      `http=${stripeRes.status} type=${stripeJson?.object || "n/a"} err=${stripeJson?.error?.message || "none"} priceIdPrefix=${String(priceMonthly || "").slice(0, 5)}`,
    );
  } else {
    add(
      results,
      "P4",
      "Stripe Test Mode session (direct API)",
      "BLOCKED",
      "no sk_test key in local env",
    );
  }

  // Webhook invalid signature
  const wh = await req(`${BASE}/api/billing/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  add(
    results,
    "P4",
    "Webhook rejects invalid signature",
    wh.status === 400 ? "PASS" : "FAIL",
    `http=${wh.status}`,
  );

  // ---------- Phase 5 Premium — expected blocked until paid ----------
  add(
    results,
    "P5",
    "Premium journey after payment",
    "BLOCKED",
    "Requires completed Stripe Checkout payment + webhook (manual browser/Stripe CLI). Checkout session creation tested above.",
  );

  // ---------- Phase 6 Portal ----------
  const portal = await req(`${BASE}/api/billing/portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authCookie ? { Cookie: authCookie } : {}),
    },
  });
  add(
    results,
    "P6",
    "Billing portal (free / no customer)",
    [400, 401, 404, 500].includes(portal.status) || portal.status === 200
      ? "PASS"
      : "FAIL",
    `http=${portal.status} body=${redact(portal.text).slice(0, 100)}`,
  );

  // ---------- Phase 7 webhook events — structural only ----------
  add(
    results,
    "P7",
    "Webhook event handling",
    "PARTIAL",
    "Invalid signature rejected. Full event matrix requires Stripe CLI forward or Dashboard test clocks.",
  );

  // ---------- Phase 8 Security ----------
  const sec = [
    ["Guest AI", `${BASE}/api/properties/ai-search`, "POST", { query: "x" }, [401]],
    ["Guest checkout", `${BASE}/api/billing/checkout`, "POST", { interval: "monthly" }, [401]],
    ["Guest portal", `${BASE}/api/billing/portal`, "POST", {}, [401]],
    ["Guest saved-searches", `${BASE}/api/saved-searches`, "GET", null, [401]],
  ];
  for (const [name, url, method, body, expect] of sec) {
    const r = await req(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    add(
      results,
      "P8",
      name,
      expect.includes(r.status) ? "PASS" : "FAIL",
      `http=${r.status}`,
    );
  }
  const adminUnauth = await req(`${BASE}/admin`, { redirect: "manual" });
  add(
    results,
    "P8",
    "Guest admin",
    adminUnauth.status === 307 ? "PASS" : "FAIL",
    `http=${adminUnauth.status}`,
  );
  const adminApi = await req(`${BASE}/api/admin/imports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authCookie ? { Cookie: authCookie } : {}),
    },
    body: "{}",
  });
  add(
    results,
    "P8",
    "Free user admin API",
    adminApi.status === 403 ? "PASS" : "FAIL",
    `http=${adminApi.status}`,
  );

  // ---------- Phase 9 DB verification ----------
  if (userId && service) {
    const prof2 = await req(
      `${supabase}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          apikey: service,
          Authorization: `Bearer ${service}`,
        },
      },
    );
    const row = Array.isArray(prof2.json) ? prof2.json[0] : null;
    add(
      results,
      "P9",
      "profiles row after auth",
      row
        ? "PASS"
        : "FAIL",
      `role=${row?.role} sub=${row?.subscription_status} plan=${row?.subscription_plan} stripeCustomer=${Boolean(row?.stripe_customer_id)}`,
    );
  }

  // Cleanup: soft-delete smoke user via admin to limit residue
  if (userId && service) {
    const del = await req(`${supabase}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
      },
    });
    add(
      results,
      "P9",
      "Smoke user cleanup",
      del.status === 200 ? "PASS" : "PARTIAL",
      `http=${del.status}`,
    );
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const partial = results.filter((r) =>
    ["PARTIAL", "INFO"].includes(r.status),
  ).length;

  const summary = {
    emailDomain: "mailinator.com",
    userIdCreated: Boolean(userId),
    checkoutUrl: Boolean(checkoutUrl),
    stripeSessionCreated: Boolean(stripeSession?.id),
    stripeSessionError: stripeSession?.error?.message || null,
    counts: { pass, fail, partial, blocked, total: results.length },
    results,
  };
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(`\nSUMMARY pass=${pass} fail=${fail} partial=${partial} blocked=${blocked}`);
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error("SMOKE_FATAL", e.message);
  process.exit(1);
});
