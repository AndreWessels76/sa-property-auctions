"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import {
  deleteSearch,
  getSavedSearches,
  type SavedSearch,
} from "@/lib/savedSearches";

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSearches() {
    setLoading(true);
    setError(null);

    try {
      const data = await getSavedSearches();
      setSearches(data);
    } catch (loadError) {
      setSearches([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load saved searches.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handleUpdate = () => {
      void loadSearches();
    };

    void loadSearches();
    window.addEventListener("savedSearchUpdated", handleUpdate);

    return () => window.removeEventListener("savedSearchUpdated", handleUpdate);
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h1 className="mb-8 text-4xl font-bold text-navy-900">
            ⭐ Saved Searches
          </h1>

          {loading ? (
            <p className="text-slate-500">Loading saved searches...</p>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
              <p className="text-red-600">{error}</p>
              <Link
                href="/login"
                className="mt-4 inline-flex rounded-xl bg-navy-900 px-6 py-3 text-white hover:bg-navy-800"
              >
                Log in
              </Link>
            </div>
          ) : searches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h2 className="text-2xl font-semibold text-navy-900">
                No saved searches
              </h2>

              <p className="mt-3 text-slate-500">
                Save your first search from the Home page.
              </p>

              <Link
                href="/#featured"
                className="mt-6 inline-flex rounded-xl bg-navy-900 px-6 py-3 text-white hover:bg-navy-800"
              >
                Browse Auctions
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {searches.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-navy-900">
                        {item.name}
                      </h2>

                      <p className="mt-2 text-slate-500">
                        Province: {item.filters.province ?? "Any"}
                      </p>

                      <p className="text-slate-500">
                        Property: {item.filters.propertyType ?? "Any"}
                      </p>

                      <p className="text-slate-500">
                        Status: {item.active ? "Active" : "Paused"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteSearch(item.id);
                          await loadSearches();
                        } catch (deleteError) {
                          toast.error(
                            deleteError instanceof Error
                              ? deleteError.message
                              : "Failed to delete saved search.",
                          );
                        }
                      }}
                      className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
