import { Dumbbell, Users, UserCheck, RefreshCw, Home, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Dumbbell,
    title: "Perte de poids",
    description:
      "Un programme adapté pour perdre du poids durablement, sans régime restrictif ni frustration.",
  },
  {
    icon: RefreshCw,
    title: "Remise en forme",
    description:
      "Retrouve ton énergie et ta condition physique avec des séances progressives et motivantes.",
  },
  {
    icon: UserCheck,
    title: "Renforcement musculaire",
    description:
      "Tonifie ton corps et gagne en force avec des exercices ciblés et sécurisés.",
  },
  {
    icon: Users,
    title: "Préparation physique",
    description:
      "Prépare-toi pour un événement sportif ou améliore tes performances globales.",
  },
];

const formats = [
  {
    icon: UserCheck,
    title: "Individuel",
    description: "Séances en face à face, 100% personnalisées",
  },
  {
    icon: Users,
    title: "En duo",
    description: "Partagez la motivation à deux",
  },
  {
    icon: Users,
    title: "Petit groupe",
    description: "Jusqu'à 4 personnes, ambiance conviviale",
  },
];

const locations = [
  {
    icon: Home,
    title: "À domicile",
    description: "Chez toi, dans ton confort",
  },
  {
    icon: TreePine,
    title: "En extérieur",
    description: "Parcs et espaces verts de Rennes",
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6">
            Les services de coaching sportif à Rennes
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Anaïs propose un coaching sportif personnalisé à Rennes autour de
            plusieurs axes : perte de poids, remise en forme, renforcement
            musculaire, préparation physique ou reprise après une période d'arrêt.
            Chaque séance est construite en fonction de ton profil, de ton
            historique et de tes contraintes.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="relative bg-card p-6 rounded-xl border border-border overflow-hidden group hover:border-primary/50 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
              <service.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-heading font-semibold text-lg text-secondary mb-2">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        {/* Formats and locations */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Formats */}
          <div className="bg-muted/50 rounded-2xl p-8">
            <h3 className="font-heading font-semibold text-xl text-secondary mb-6">
              Formats de séances
            </h3>
            <div className="space-y-4">
              {formats.map((format) => (
                <div
                  key={format.title}
                  className="flex items-start gap-4 bg-card p-4 rounded-xl border border-border"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <format.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary">{format.title}</h4>
                    <p className="text-muted-foreground text-sm">
                      {format.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="bg-muted/50 rounded-2xl p-8">
            <h3 className="font-heading font-semibold text-xl text-secondary mb-6">
              Lieux de séances
            </h3>
            <div className="space-y-4">
              {locations.map((location) => (
                <div
                  key={location.title}
                  className="flex items-start gap-4 bg-card p-4 rounded-xl border border-border"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <location.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary">{location.title}</h4>
                    <p className="text-muted-foreground text-sm">
                      {location.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEO paragraph + CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Les séances peuvent se dérouler en individuel, en duo ou en petit
            groupe, à domicile, en extérieur autour de Rennes ou dans un lieu
            défini ensemble. Le suivi ne se limite pas à la séance : Anaïs
            t'accompagne sur la motivation, les bonnes habitudes et l'adaptation
            du programme au fil du temps.
          </p>
          <a href="#reservation">
            <Button
              size="lg"
              className="gradient-primary shadow-primary text-lg font-semibold px-8"
            >
              Réserver ma première séance
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
