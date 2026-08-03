"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { isFavourite, toggleFavourite } from "@/lib/favourites";
import { getRegisterUrl } from "@/lib/property/detailExperience";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

type Props = {
  property: PropertyDTO;
};

export default function PropertyMobileActions({ property }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [favourited, setFavourited] = useState(false);
  const registerUrl = getRegisterUrl(property);

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md md:hidden">
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
          className="inline-flex min-w-[3.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <Heart
            className={`h-5 w-5 ${favourited ? "fill-red-500 text-red-500" : "text-navy-900"}`}
          />
        </button>
      </div>
    </div>
  );
}
