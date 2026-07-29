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

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Statistics />
        <FeaturedAuctions />
        <WhyChoose />
        <Partners />
        <MapSection />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
