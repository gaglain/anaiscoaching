import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhyCoachSection } from "@/components/landing/WhyCoachSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { CoachSection } from "@/components/landing/CoachSection";
import { BookingSection } from "@/components/landing/BookingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <WhyCoachSection />
        <ServicesSection />
        <CoachSection />
        <BookingSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
