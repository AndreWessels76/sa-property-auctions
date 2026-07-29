"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import AuctionCard from "@/components/home/AuctionCard";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { useAuth } from "@/app/components/auth/AuthProvider";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { getFavouriteProperties } from "@/lib/favourites";

export default function FavouritesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login?next=/favourites");
      return;
    }

    async function loadProperties() {
      const response = await fetch("/api/properties");
      const allProperties = (await response.json()) as PropertyDTO[];

      setProperties(getFavouriteProperties(allProperties));

      setLoadingProperties(false);
    }

    loadProperties();

    window.addEventListener("favouritesUpdated", loadProperties);

    return () =>
      window.removeEventListener("favouritesUpdated", loadProperties);
  }, [user, loading, router]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-10 flex items-center gap-3">
            <Heart className="h-8 w-8 fill-red-500 text-red-500" />

            <div>
              <h1 className="text-4xl font-bold text-navy-900">
                My Favourite Properties
              </h1>
              <p className="text-slate-500">
                {loadingProperties
                  ? "Loading favourites..."
                  : `${properties.length} saved properties`}
              </p>
            </div>
          </div>

          {loadingProperties ? (
            <p className="py-16 text-center text-slate-500">
              Loading favourites...
            </p>
          ) : properties.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-24 text-center">
              <Heart className="mx-auto h-16 w-16 text-slate-300" />

              <h2 className="mt-6 text-2xl font-bold text-navy-900">
                No favourites yet
              </h2>

              <p className="mt-2 text-slate-500">
                Click the heart icon on any property to save it here.
              </p>

              <Link
                href="/#featured"
                className="mt-8 inline-flex rounded-xl bg-navy-900 px-6 py-3 font-semibold text-white hover:bg-navy-800"
              >
                Browse Auctions
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => (
                <AuctionCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
