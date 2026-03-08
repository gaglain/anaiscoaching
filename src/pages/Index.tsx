import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhyCoachSection } from "@/components/landing/WhyCoachSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { RemoteCoachingSection } from "@/components/landing/RemoteCoachingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { GallerySection } from "@/components/landing/GallerySection";
import { CoachSection } from "@/components/landing/CoachSection";
import { BookingSection } from "@/components/landing/BookingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { AnimatedSection } from "@/components/landing/AnimatedSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AnimatedSection>
          <WhyCoachSection />
        </AnimatedSection>
        <AnimatedSection>
          <ServicesSection />
        </AnimatedSection>
        <AnimatedSection>
          <RemoteCoachingSection />
        </AnimatedSection>
        <TestimonialsSection />
        <GallerySection />
        <AnimatedSection>
          <CoachSection />
        </AnimatedSection>
        <AnimatedSection>
          <BookingSection />
        </AnimatedSection>
        <AnimatedSection>
          <FAQSection />
        </AnimatedSection>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
