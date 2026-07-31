import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import FeaturedAuctions from "@/components/home/FeaturedAuctions";
import Hero from "@/components/home/Hero";
import MapSection from "@/components/home/MapSection";
import Partners from "@/components/home/Partners";
import Statistics from "@/components/home/Statistics";
import Testimonials from "@/components/home/Testimonials";
import WhyChoose from "@/components/home/WhyChoose";

export const revalidate = 60;

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Statistics />
        <FeaturedAuctions
          page={Number(get("page") ?? 1) || 1}
          q={get("q")}
          province={get("province")}
          propertyType={get("propertyType")}
          priceRange={get("priceRange")}
          sort={get("sort")}
        />
        <WhyChoose />
        <Partners />
        <MapSection />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
