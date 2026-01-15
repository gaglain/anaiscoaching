import { Target, Heart, MapPin, Clock } from "lucide-react";

const benefits = [
  {
    icon: Target,
    title: "Accompagnement personnalisé",
    description:
      "Un programme adapté à ton niveau, ton rythme de vie et tes objectifs pour des résultats durables.",
  },
  {
    icon: Heart,
    title: "Approche bienveillante",
    description:
      "Un cadre motivant et sécurisé où tu pourras progresser sans te blesser, à ton rythme.",
  },
  {
    icon: MapPin,
    title: "Flexibilité des lieux",
    description:
      "Séances en extérieur, à domicile ou en salle selon tes préférences, partout à Rennes.",
  },
  {
    icon: Clock,
    title: "Suivi dans la durée",
    description:
      "Un accompagnement qui dépasse la séance : motivation, habitudes et adaptation du programme.",
  },
];

export function WhyCoachSection() {
  return (
    <section id="pourquoi" className="py-20 md:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6">
            Pourquoi un coach sportif à Rennes ?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Travailler avec un coach sportif à Rennes, c'est bénéficier d'un
            accompagnement personnalisé adapté à ton niveau, ton rythme de vie et
            tes objectifs. Que tu sois débutant, en reprise d'activité ou déjà
            sportif, Anaïs construit des séances efficaces et progressives pour
            t'aider à tenir dans la durée, sans te blesser.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <benefit.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-secondary mb-3">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Additional SEO paragraph */}
        <div className="max-w-3xl mx-auto text-center mt-16">
          <p className="text-lg text-muted-foreground leading-relaxed">
            En choisissant un coach sportif local à Rennes, tu profites aussi de
            séances proches de chez toi, en extérieur, à domicile ou en salle
            selon tes besoins. L'objectif : t'offrir un cadre motivant et
            bienveillant pour que tu prennes enfin plaisir à bouger.
          </p>
        </div>
      </div>
    </section>
  );
}
