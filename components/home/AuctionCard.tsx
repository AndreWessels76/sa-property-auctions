"use client";

import { Clock, Heart, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { getPropertyQuality } from "@/lib/ai/quality";
import { calculateSavings } from "@/lib/ai/savings";
import { isFavourite, toggleFavourite } from "@/lib/favourites";
import {
  formatAuctionDate,
  formatCurrency,
  formatStatus,
  getPropertyImage,
  getStatusStyle,
} from "@/lib/format";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

function useCountdown(targetISO: string) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    mins: 0,
    expired: true,
  });

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetISO).getTime() - Date.now();
      if (!targetISO || Number.isNaN(diff) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        expired: false,
      });
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [targetISO]);

  return timeLeft;
}

export default function AuctionCard({ property }: { property: PropertyDTO }) {
  const router = useRouter();
  const { user } = useAuth();
  const [favourited, setFavourited] = useState(false);

  useEffect(() => {
    setFavourited(user ? isFavourite(property.id) : false);
  }, [property.id, user]);

  const countdown = useCountdown(property.auction_date ?? "");
  const savings = calculateSavings(
    property.estimated_value ?? 0,
    property.auction_price ?? 0,
  );
  const quality = getPropertyQuality(property);
  const cardImage =
    property.thumbnail ||
    property.image ||
    getPropertyImage(property.property_type ?? "Property");
  const statusStyle = getStatusStyle(property.status ?? "");
  const location = [property.town, property.province]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
      <div className="relative aspect-[16/11] overflow-hidden">
        <Image
          src={cardImage}
          alt={`${property.property_type ?? "Property"} in ${property.town ?? "South Africa"}`}
          fill
          placeholder={
            property.blur_placeholder ? "blur" : "empty"
          }
          blurDataURL={
            property.blur_placeholder ?? undefined
          }
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-col gap-2">
          {property.isSeedOrDemo ? (
            <span className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-950 shadow-sm">
              Seed data
            </span>
          ) : null}
          {property.featured ? (
            <span className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-navy-950 shadow-sm">
              Featured
            </span>
          ) : null}
          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${statusStyle}`}
          >
            {property.property_type}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();

            if (!user) {
              router.push("/login?next=/favourites");
              return;
            }

            setFavourited(toggleFavourite(property.id));
          }}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-all hover:scale-110"
          aria-label={
            favourited ? "Remove from favourites" : "Add to favourites"
          }
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              favourited
                ? "fill-red-500 text-red-500"
                : "text-slate-400 hover:text-red-400"
            }`}
          />
        </button>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <MapPin className="h-4 w-4 text-gold-400" />
            {location}
          </p>
          <span
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${statusStyle}`}
          >
            {formatStatus(property.status ?? "")}
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-base font-semibold text-navy-900">
          {property.title}
        </h3>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-white">
          <Clock className="h-4 w-4 shrink-0 text-gold-400" />
          <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-medium text-slate-300">
                {countdown.expired ? "Auction date" : "Auction in"}
              </span>
              <p className="text-xs text-gold-400">
                {formatAuctionDate(property.auction_date ?? "")}
              </p>
            </div>
            {countdown.expired ? (
              <p className="text-sm font-semibold text-slate-300">Date passed</p>
            ) : (
              <div className="flex gap-3 text-sm font-bold tabular-nums">
                <span>
                  {countdown.days}
                  <span className="ml-0.5 text-xs font-normal text-slate-400">
                    d
                  </span>
                </span>
                <span>
                  {countdown.hours}
                  <span className="ml-0.5 text-xs font-normal text-slate-400">
                    h
                  </span>
                </span>
                <span>
                  {countdown.mins}
                  <span className="ml-0.5 text-xs font-normal text-slate-400">
                    m
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Market Value
            </p>
            <p className="mt-1 text-lg font-bold text-slate-400 line-through decoration-slate-300">
              {formatCurrency(property.estimated_value ?? 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Auction Price
            </p>
            <p className="mt-1 text-xl font-bold text-navy-900">
              {formatCurrency(property.auction_price ?? 0)}
            </p>
          </div>
        </div>

        {savings.percent > 0 && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4">
            <div className="text-sm text-slate-500">Potential Saving</div>

            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {formatCurrency(savings.amount)}
            </div>

            <div className="mt-1 text-sm font-semibold">
              {savings.percent}% • {savings.rating}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border bg-slate-50 p-4">
          <div className="text-sm text-slate-500">
            {property.qualityScore != null
              ? "Image Quality"
              : "Property Quality"}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{quality.score}/100</div>
              <div className="text-sm text-slate-600">{quality.grade}</div>
            </div>

            <div className="text-xl text-yellow-500">
              {"★".repeat(quality.stars)}
              {"☆".repeat(5 - quality.stars)}
            </div>
          </div>
        </div>

        <Link
          href={`/properties/${property.id}`}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-navy-900 py-3.5 text-sm font-semibold text-white transition-all hover:bg-navy-800 hover:shadow-lg"
        >
          View Auction Details
        </Link>
      </div>
    </article>
  );
}
