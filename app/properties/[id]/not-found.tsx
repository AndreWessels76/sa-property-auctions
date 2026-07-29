import Link from "next/link";
import { Building2 } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-24">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-navy-900">
            Property not found
          </h1>
          <p className="mt-3 text-slate-600">
            This auction listing does not exist or may have been removed.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Back to homepage
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
