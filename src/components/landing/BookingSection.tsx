import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MessageSquare, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const steps = [
  {
    icon: User,
    title: "1. Remplis le formulaire",
    description: "Indique ton objectif, tes disponibilités et ton niveau actuel.",
  },
  {
    icon: MessageSquare,
    title: "2. Échange personnalisé",
    description: "Anaïs te recontacte pour confirmer le créneau et discuter de tes besoins.",
  },
  {
    icon: Calendar,
    title: "3. Première séance",
    description: "Retrouve tes séances et échanges directement dans ton espace en ligne.",
  },
];

export function BookingSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // For now, redirect to login/signup since booking requires authentication
    toast({
      title: "Créez votre compte",
      description:
        "Pour réserver une séance, vous devez d'abord créer votre compte client.",
    });

    setTimeout(() => {
      navigate("/signup");
    }, 1500);

    setIsSubmitting(false);
  };

  return (
    <section id="reservation" className="py-20 md:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6">
            Comment réserver ta séance de coaching ?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Réserver une séance avec Anaïs, coach sportif à Rennes, est très
            simple : tu remplis le formulaire en ligne en indiquant ton objectif,
            tes disponibilités et ton niveau actuel. Anaïs te recontacte ensuite
            pour confirmer le créneau et te proposer un premier échange personnalisé.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center mb-4">
                <step.icon className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-secondary mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Booking form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
            <h3 className="font-heading font-semibold text-2xl text-secondary mb-6 text-center">
              Demande de séance
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Prénom et nom *</Label>
                  <Input
                    id="name"
                    placeholder="Ton nom complet"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ton@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="06 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-type">Type de séance *</Label>
                  <Select required>
                    <SelectTrigger id="session-type">
                      <SelectValue placeholder="Choisis un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individuel</SelectItem>
                      <SelectItem value="duo">En duo</SelectItem>
                      <SelectItem value="group">Petit groupe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Ton objectif *</Label>
                <Select required>
                  <SelectTrigger id="goal">
                    <SelectValue placeholder="Choisis ton objectif principal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight-loss">Perte de poids</SelectItem>
                    <SelectItem value="fitness">Remise en forme</SelectItem>
                    <SelectItem value="strength">Renforcement musculaire</SelectItem>
                    <SelectItem value="preparation">Préparation physique</SelectItem>
                    <SelectItem value="restart">Reprise après arrêt</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optionnel)</Label>
                <Textarea
                  id="message"
                  placeholder="Dis-moi en plus sur tes objectifs, tes contraintes ou tes disponibilités..."
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gradient-primary shadow-primary text-lg font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                En soumettant ce formulaire, tu acceptes d'être recontacté par
                Anaïs pour discuter de ta demande.
              </p>
            </form>
          </div>

          {/* Additional SEO text */}
          <p className="text-center text-muted-foreground mt-8 max-w-xl mx-auto">
            Une fois ton compte créé, tu peux retrouver tes prochaines séances,
            ton historique et tes échanges avec Anaïs directement dans ton espace
            en ligne. L'objectif est de te faire gagner du temps, tout en te
            permettant de garder un lien direct avec ta coach.
          </p>
        </div>
      </div>
    </section>
  );
}
