import { Suspense } from "react";
import FavouritesClient from "./FavouritesClient";

export default function FavouritesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 pt-24">
          <p className="text-slate-500">Loading favourites...</p>
        </main>
      }
    >
      <FavouritesClient />
    </Suspense>
  );
}
