import { ArrowRight, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 gradient-hero overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Location badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium">
              <MapPin className="h-4 w-4" />
              <span>Rennes et alentours</span>
            </div>

            {/* H1 - SEO optimized */}
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-secondary leading-tight">
              Coach sportif à Rennes{" "}
              <span className="text-gradient">
                – Coaching personnalisé avec Anaïs Dubois
              </span>
            </h1>

            {/* Subtitle - SEO rich */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Anaïs, coach sportif diplômée à Rennes, t'accompagne avec des séances
              sur‑mesure pour perdre du poids, te remettre en forme ou te renforcer,
              dans un cadre motivant et sécurisé. Réserve tes séances de coaching
              sportif en ligne en quelques clics.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#reservation">
                <Button
                  size="lg"
                  className="gradient-primary shadow-primary text-lg font-semibold px-8 py-6 group"
                >
                  Réserver une séance
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <a href="#coach">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg font-semibold px-8 py-6 border-2"
                >
                  Découvrir Anaïs
                </Button>
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-primary text-primary"
                  />
                ))}
              </div>
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">Coach diplômée</span>
                <span className="mx-2">•</span>
                <span>+100 clients accompagnés</span>
              </div>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="relative animate-fade-in-right" style={{ animationDelay: "0.2s" }}>
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              {/* Placeholder for Anaïs photo */}
              <div className="text-center p-8">
                <div className="w-32 h-32 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <span className="text-4xl">📸</span>
                </div>
                <p className="text-muted-foreground font-medium">
                  Photo d'Anaïs à uploader
                </p>
              </div>
            </div>

            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl shadow-lg border border-border animate-float">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <span className="text-2xl">💪</span>
                </div>
                <div>
                  <p className="font-heading font-bold text-2xl text-secondary">+5 ans</p>
                  <p className="text-muted-foreground text-sm">d'expérience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
