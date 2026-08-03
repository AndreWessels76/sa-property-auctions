"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Flag,
  Heart,
  MapPin,
  Share2,
} from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import {
  formatAuctionDate,
  formatStatus,
  getStatusStyle,
} from "@/lib/format";
import { isFavourite, toggleFavourite } from "@/lib/favourites";
import {
  buildAuctionDateTimeIso,
  getRegisterUrl,
  getVerificationStatusLabel,
  inferAuctionType,
} from "@/lib/property/detailExperience";

function useCountdown(targetISO: string | null) {
  const [state, setState] = useState({
    days: 0,
    hours: 0,
    mins: 0,
    expired: true,
  });

  useEffect(() => {
    if (!targetISO) {
      setState({ days: 0, hours: 0, mins: 0, expired: true });
      return;
    }

    const update = () => {
      const diff = new Date(targetISO).getTime() - Date.now();
      if (Number.isNaN(diff) || diff <= 0) {
        setState({ days: 0, hours: 0, mins: 0, expired: true });
        return;
      }
      setState({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        expired: false,
      });
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [targetISO]);

  return state;
}

type Props = {
  property: PropertyDTO;
};

export default function PropertyHeroSection({ property }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [favourited, setFavourited] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    setFavourited(user ? isFavourite(property.id) : false);
  }, [property.id, user]);

  const auctionType = inferAuctionType(property);
  const countdown = useCountdown(
    buildAuctionDateTimeIso(property.auction_date, property.auction_time),
  );
  const registerUrl = getRegisterUrl(property);
  const statusStyle = getStatusStyle(
    property.listing_status ?? property.status ?? "",
  );
  const verificationLabel = getVerificationStatusLabel(property);
  const locationLine = [property.suburb, property.town, property.province]
    .filter(Boolean)
    .join(", ");

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: property.title,
          text: `Auction listing: ${property.title}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied to clipboard.");
    } catch {
      setShareMessage("Unable to share this listing right now.");
    }
  }

  function handleFavourite() {
    if (!user) {
      router.push(`/login?next=/properties/${property.id}`);
      return;
    }
    toggleFavourite(property.id);
    setFavourited(isFavourite(property.id));
  }

  return (
    <section
      aria-labelledby="property-hero-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${statusStyle}`}
        >
          {formatStatus(property.listing_status ?? property.status ?? "Auction")}
        </span>
        {property.isSeedOrDemo ? (
          <span className="inline-flex rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-950">
            Seed
          </span>
        ) : property.verification_state === "verified" ? (
          <span className="inline-flex rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
            Verified
          </span>
        ) : property.isPendingVerification ? (
          <span className="inline-flex rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-950">
            Pending Verification
          </span>
        ) : null}
        <span className="inline-flex rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
          {auctionType}
        </span>
        <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {property.property_type || "Property"}
        </span>
      </div>

      <h1
        id="property-hero-title"
        className="mt-4 text-3xl font-bold text-navy-900 sm:text-4xl"
      >
        {property.title?.trim() || "Untitled auction listing"}
      </h1>

      <p className="mt-3 flex items-start gap-2 text-slate-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden />
        {locationLine ||
          "Location details have not been provided for this listing."}
      </p>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Agency
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {property.auction_agency ||
              property.source_name ||
              "Agency to be confirmed"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Auction date
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {property.auction_date
              ? formatAuctionDate(property.auction_date)
              : "Date to be confirmed with agency"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Verification
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {verificationLabel}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Countdown
          </dt>
          <dd className="mt-1 font-semibold text-navy-900" aria-live="polite">
            {countdown.expired
              ? "Auction date has passed or is not yet confirmed"
              : `${countdown.days}d ${countdown.hours}h ${countdown.mins}m remaining`}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {registerUrl ? (
          <a
            href={registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 transition hover:bg-gold-400"
          >
            Register for auction
          </a>
        ) : (
          <span className="inline-flex items-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600">
            Registration link not yet published — contact the agency
          </span>
        )}
        <button
          type="button"
          onClick={handleFavourite}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-900 transition hover:border-gold-400"
          aria-pressed={favourited}
        >
          <Heart
            className={`h-4 w-4 ${favourited ? "fill-red-500 text-red-500" : ""}`}
            aria-hidden
          />
          {favourited ? "Saved" : "Save favourite"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-900 transition hover:border-gold-400"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </button>
        <button
          type="button"
          onClick={() => {
            const subject = encodeURIComponent(`Report listing: ${property.title}`);
            const body = encodeURIComponent(
              `Listing URL: ${window.location.href}\n\nPlease describe the issue:`,
            );
            window.location.href = `mailto:support@sa-property-auctions.co.za?subject=${subject}&body=${body}`;
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
        >
          <Flag className="h-4 w-4" aria-hidden />
          Report listing
        </button>
      </div>

      {shareMessage ? (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {shareMessage}
        </p>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Always verify auction particulars with{" "}
        {property.auction_agency || "the conducting agency"} before registering
        or bidding.{" "}
        <Link href="/auctions" className="font-medium text-navy-800 underline">
          Browse more auctions
        </Link>
      </p>
    </section>
  );
}
