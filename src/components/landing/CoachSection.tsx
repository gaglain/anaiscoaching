import { GraduationCap, Award, Heart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import anaisPortrait from "@/assets/anais-portrait.webp";
import anaisCoaching from "@/assets/anais-coaching.webp";

const credentials = [
  {
    icon: GraduationCap,
    title: "Master 2 APAS 2SER",
    description: "Activité Physique Adaptée & Santé",
  },
  {
    icon: Award,
    title: "DU Préparation Physique",
    description: "Diplôme Universitaire EPP",
  },
  {
    icon: Shield,
    title: "Assurance RC Pro",
    description: "Séances 100% sécurisées",
  },
  {
    icon: Heart,
    title: "Expérience terrain",
    description: "+5 ans d'accompagnement",
  },
];

const specialties = [
  "Perte de poids",
  "Remise en forme",
  "Renforcement musculaire",
  "Préparation physique",
  "Reprise après arrêt",
  "Coaching débutants",
];

export function CoachSection() {
  return (
    <section id="coach" className="py-20 md:py-28 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image column */}
          <div className="relative animate-fade-in-left">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-xl">
              <img 
                src={anaisPortrait} 
                alt="Anaïs Dubois - Coach sportif diplômée à Rennes"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Secondary image floating */}
            <div className="absolute -bottom-8 -right-8 w-48 h-32 rounded-xl overflow-hidden shadow-lg border-4 border-secondary hidden md:block">
              <img 
                src={anaisCoaching} 
                alt="Séance de coaching sportif avec Anaïs"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Decorative element */}
            <div className="absolute -bottom-6 -left-6 w-48 h-48 gradient-primary rounded-2xl -z-10 opacity-50" />
          </div>

          {/* Content column */}
          <div className="space-y-8 animate-fade-in-right">
            <div>
              <h2 className="font-heading font-bold text-3xl md:text-4xl mb-6">
                Qui est Anaïs, coach sportif diplômée à Rennes ?
              </h2>
              <p className="text-lg text-secondary-foreground/80 leading-relaxed mb-4">
                Anaïs est coach sportif diplômée, passionnée par l'accompagnement
                des personnes qui veulent se sentir mieux dans leur corps et dans
                leur tête. Grâce à ses formations et ses expériences de terrain,
                elle sait adapter chaque séance à ton niveau, même si tu n'as
                jamais fait de sport ou que tu reprends après une longue pause.
              </p>
              <p className="text-lg text-secondary-foreground/80 leading-relaxed">
                Son approche est centrée sur l'écoute, la bienveillance et la
                progression. En tant que coach sportif à Rennes, Anaïs met en avant
                la technique et la sécurité des mouvements, tout en gardant un côté
                ludique et motivant pour que tu aies envie de revenir à chaque séance.
              </p>
            </div>

            {/* Credentials grid */}
            <div className="grid grid-cols-2 gap-4">
              {credentials.map((credential) => (
                <div
                  key={credential.title}
                  className="bg-secondary-foreground/10 p-4 rounded-xl"
                >
                  <credential.icon className="h-8 w-8 text-primary mb-3" />
                  <h4 className="font-semibold text-sm">{credential.title}</h4>
                  <p className="text-secondary-foreground/70 text-sm">
                    {credential.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Specialties */}
            <div>
              <h4 className="font-semibold mb-4">Spécialités</h4>
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="px-4 py-2 bg-primary/20 text-primary-foreground rounded-full text-sm font-medium"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <a href="#reservation">
              <Button
                size="lg"
                className="gradient-primary shadow-primary text-lg font-semibold"
              >
                Prendre rendez-vous avec Anaïs
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
