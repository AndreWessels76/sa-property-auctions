"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Heart, Share2 } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { isFavourite, toggleFavourite } from "@/lib/favourites";
import { getRegisterUrl } from "@/lib/property/detailExperience";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

type Props = {
  property: PropertyDTO;
};

function countdownLabel(auctionDate: string | null | undefined): string | null {
  if (!auctionDate) return null;
  const target = new Date(auctionDate);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
  if (days < 0) return "Auction date passed";
  if (days === 0) return "Auction today";
  if (days === 1) return "Auction tomorrow";
  return `${days} days to auction`;
}

export default function PropertyMobileActions({ property }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [favourited, setFavourited] = useState(false);
  const registerUrl = getRegisterUrl(property);
  const countdown = useMemo(
    () => countdownLabel(property.auction_date),
    [property.auction_date],
  );

  useEffect(() => {
    setFavourited(user ? isFavourite(property.id) : false);
  }, [property.id, user]);

  function handleFavourite() {
    if (!user) {
      router.push(`/login?next=/properties/${property.id}`);
      return;
    }
    toggleFavourite(property.id);
    setFavourited(isFavourite(property.id));
  }

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `/properties/${property.id}`;
    const title = property.title || "Auction property";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md md:hidden">
      {countdown ? (
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-navy-900">
          {countdown}
        </p>
      ) : null}
      <div className="mx-auto flex max-w-6xl gap-2">
        {registerUrl ? (
          <a
            href={registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center rounded-xl bg-gold-500 py-3 text-sm font-bold text-navy-950"
          >
            Register
          </a>
        ) : null}
        <button
          type="button"
          onClick={handleFavourite}
          aria-pressed={favourited}
          aria-label={favourited ? "Remove favourite" : "Save favourite"}
          className="inline-flex min-w-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3"
        >
          <Heart
            className={`h-5 w-5 ${favourited ? "fill-red-500 text-red-500" : "text-navy-900"}`}
          />
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          aria-label="Share property"
          className="inline-flex min-w-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3"
        >
          <Share2 className="h-5 w-5 text-navy-900" />
        </button>
        <a
          href="/calendar"
          aria-label="Open auction calendar"
          className="inline-flex min-w-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3"
        >
          <CalendarPlus className="h-5 w-5 text-navy-900" />
        </a>
      </div>
    </div>
  );
}
