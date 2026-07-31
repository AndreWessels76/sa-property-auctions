import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FeaturedAuctions from "@/components/home/FeaturedAuctions";

export const metadata = {
  title: "All Auctions",
  description:
    "Browse the full SA Property Auctions catalogue — filter by province, type, and price.",
};

export const revalidate = 60;

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuctionsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-20">
        <FeaturedAuctions
          page={Number(get("page") ?? 1) || 1}
          q={get("q")}
          province={get("province")}
          propertyType={get("propertyType")}
          priceRange={get("priceRange")}
          sort={get("sort")}
        />
      </main>
      <Footer />
    </>
  );
}
