"use client";

import { Gavel, Heart, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { AuthService } from "@/lib/auth/AuthService";
import { favouriteCount } from "@/lib/favourites";
import { ROLES } from "@/lib/permissions/roles";

const navLinks = [
  { label: "Browse Auctions", href: "#featured" },
  { label: "Why Us", href: "#why-choose" },
  { label: "Map View", href: "#map" },
  { label: "Testimonials", href: "#testimonials" },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isSignedIn = Boolean(user);
  const isAdmin = role === ROLES.admin;
  const isHomePage = pathname === "/";
  const solidHeader = scrolled || !isHomePage;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const update = () => {
      setCount(isSignedIn ? favouriteCount() : 0);
    };

    update();
    window.addEventListener("storage", update);
    window.addEventListener("favouritesUpdated", update);

    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("favouritesUpdated", update);
    };
  }, [isSignedIn]);

  // Close after navigation is handled via link onClick; no pathname setState effect.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await AuthService.logout();
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const linkClass = solidHeader
    ? "text-slate-600 hover:text-navy-900"
    : "text-white/80 hover:text-white";

  const softButtonClass = solidHeader
    ? "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
    : "text-white/80 hover:bg-white/10 hover:text-white";

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        solidHeader
          ? "border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              solidHeader ? "bg-navy-900" : "bg-white/10 backdrop-blur-sm"
            }`}
          >
            <Gavel className="h-5 w-5 text-gold-400" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <span
              className={`block text-sm font-bold tracking-tight transition-colors ${
                solidHeader ? "text-navy-900" : "text-white"
              }`}
            >
              SA Property
            </span>
            <span className="block text-xs font-semibold text-gold-400">
              Auctions
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-sm font-medium transition-colors ${linkClass}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/favourites"
            className={`relative hidden items-center gap-2 rounded-xl px-4 py-2 transition sm:flex ${
              solidHeader
                ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                : "border border-white/20 text-white/80 hover:bg-white/10"
            }`}
          >
            <Heart className="h-5 w-5" />
            <span>Favourites</span>
            {count > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {count}
              </span>
            ) : null}
          </Link>

          <Link
            href="/saved-searches"
            className={`hidden text-sm font-medium transition-colors sm:inline ${linkClass}`}
          >
            Saved Searches
          </Link>

          <Link
            href="/heatmaps"
            className={`hidden text-sm font-medium transition-colors sm:inline ${linkClass}`}
          >
            Heat Maps
          </Link>

          {isAdmin ? (
            <Link
              href="/admin/imports"
              className={`hidden text-sm font-medium transition-colors sm:inline ${linkClass}`}
            >
              Admin
            </Link>
          ) : null}

          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex ${softButtonClass}`}
              >
                <User className="h-4 w-4" />
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut || loading}
                className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex disabled:opacity-60 ${softButtonClass}`}
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex ${softButtonClass}`}
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                href="/register"
                className="hidden rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-lg shadow-gold-500/20 transition-all hover:bg-gold-400 hover:shadow-xl sm:inline-flex"
              >
                Get Started
              </Link>
            </>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            className={`rounded-lg p-2 lg:hidden ${
              solidHeader
                ? "text-slate-600 hover:bg-slate-100"
                : "text-white hover:bg-white/10"
            }`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          ref={menuRef}
          id={menuId}
          className="border-t border-slate-200 bg-white shadow-lg lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/favourites"
              className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              Favourites{count > 0 ? ` (${count})` : ""}
            </Link>
            <Link
              href="/saved-searches"
              className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              Saved Searches
            </Link>
            <Link
              href="/heatmaps"
              className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              Heat Maps
            </Link>
            {isAdmin ? (
              <Link
                href="/admin/imports"
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            ) : null}

            <div className="my-2 border-t border-slate-100" />

            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut || loading}
                  className="rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="mt-1 rounded-xl bg-gold-500 px-3 py-3 text-center text-sm font-semibold text-navy-950"
                  onClick={() => setMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
