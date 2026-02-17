import { Monitor, Phone, FileText, MapPin, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: FileText,
    title: "Programme 100% personnalisé",
    description:
      "Un plan d'entraînement sur-mesure adapté à ton niveau, tes objectifs et ton matériel disponible.",
  },
  {
    icon: Monitor,
    title: "Suivi en visio",
    description:
      "Des séances de suivi régulières en visioconférence pour ajuster ton programme et garder la motivation.",
  },
  {
    icon: Phone,
    title: "Accompagnement téléphonique",
    description:
      "Des points réguliers par téléphone pour répondre à tes questions et adapter ta progression.",
  },
  {
    icon: MapPin,
    title: "Où que tu sois",
    description:
      "Tu n'habites pas à Rennes ? Pas de problème. Anaïs accompagne déjà des clients partout en France.",
  },
];

const includes = [
  "Programme d'entraînement détaillé et évolutif",
  "Vidéos explicatives des exercices",
  "Suivi visio ou téléphone hebdomadaire",
  "Ajustements du programme en continu",
  "Conseils nutrition et récupération",
  "Messagerie directe avec Anaïs",
];

export function RemoteCoachingSection() {
  return (
    <section id="coaching-distance" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium mb-6">
            <Monitor className="h-4 w-4" />
            <span>Nouveau</span>
          </div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6">
            Coaching sportif à distance – Programmes personnalisés
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Tu n'es pas sur Rennes ou tu préfères t'entraîner en autonomie ?
            Anaïs te propose un coaching à distance avec un programme
            personnalisé et un suivi régulier en visio ou par téléphone, pour
            progresser efficacement où que tu sois.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="bg-card p-6 rounded-xl border border-border group hover:border-primary/50 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <benefit.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-secondary mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* What's included + CTA */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="bg-card rounded-2xl p-8 border border-border">
            <h3 className="font-heading font-semibold text-xl text-secondary mb-6">
              Ce qui est inclus
            </h3>
            <div className="space-y-4">
              {includes.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-secondary-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 text-center lg:text-left">
            <h3 className="font-heading font-bold text-2xl md:text-3xl text-secondary">
              Prêt(e) à démarrer ton coaching à distance ?
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Anaïs a déjà accompagné des clients en dehors de Rennes avec
              d'excellents résultats. Le suivi à distance te permet de
              bénéficier de son expertise sans contrainte géographique.
            </p>
            <a href="#reservation">
              <Button
                size="lg"
                className="gradient-primary shadow-primary text-lg font-semibold px-8 group"
              >
                Demander mon programme
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
