import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MessageSquare, User, CheckCircle, ArrowRight, Send, UserPlus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  {
    icon: User,
    title: "1. Contacte Anaïs",
    description: "Remplis le formulaire ou crée ton compte pour accéder à ton espace personnel.",
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

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("contact-name") as string;
    const email = formData.get("contact-email") as string;
    const phone = formData.get("contact-phone") as string;
    const sessionType = formData.get("contact-session-type") as string;
    const goal = formData.get("contact-goal") as string;
    const message = formData.get("contact-message") as string;

    try {
      await supabase.functions.invoke("notify-admin", {
        body: {
          type: "contact_form",
          name,
          email,
          phone,
          sessionType,
          goal,
          message,
        },
      });

      toast({
        title: "Demande envoyée ✅",
        description: "Anaïs te recontactera très rapidement !",
      });
      (e.target as HTMLFormElement).reset();
    } catch {
      toast({
        title: "Erreur",
        description: "Un problème est survenu. Réessaie ou contacte Anaïs directement.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            simple : envoie ta demande via le formulaire ou crée directement
            ton compte pour accéder à ton espace personnel.
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

        {/* Tabs: Contact form OR Create account */}
        <div className="max-w-2xl mx-auto">
          <Tabs defaultValue="contact" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-14 mb-8 bg-card border border-border rounded-xl p-1">
              <TabsTrigger
                value="contact"
                className="flex items-center gap-2 text-sm font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-full transition-all"
              >
                <Send className="h-4 w-4" />
                Envoyer une demande
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex items-center gap-2 text-sm font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-full transition-all"
              >
                <UserPlus className="h-4 w-4" />
                Créer mon compte
              </TabsTrigger>
            </TabsList>

            {/* Contact form tab */}
            <TabsContent value="contact">
              <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
                <h3 className="font-heading font-semibold text-xl text-secondary mb-2 text-center">
                  Envoie ta demande
                </h3>
                <p className="text-muted-foreground text-sm text-center mb-6">
                  Anaïs recevra ton message par email et te recontactera rapidement.
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Prénom et nom *</Label>
                      <Input
                        id="contact-name"
                        name="contact-name"
                        placeholder="Ton nom complet"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email *</Label>
                      <Input
                        id="contact-email"
                        name="contact-email"
                        type="email"
                        placeholder="ton@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Téléphone</Label>
                      <Input
                        id="contact-phone"
                        name="contact-phone"
                        type="tel"
                        placeholder="06 XX XX XX XX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-session-type">Type de séance</Label>
                      <select
                        id="contact-session-type"
                        name="contact-session-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Choisis un type</option>
                        <option value="individual">Individuel</option>
                        <option value="duo">En duo</option>
                        <option value="group">Petit groupe</option>
                        <option value="remote">À distance</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-goal">Ton objectif</Label>
                    <select
                      id="contact-goal"
                      name="contact-goal"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Choisis ton objectif principal</option>
                      <option value="weight-loss">Perte de poids</option>
                      <option value="fitness">Remise en forme</option>
                      <option value="strength">Renforcement musculaire</option>
                      <option value="preparation">Préparation physique</option>
                      <option value="restart">Reprise après arrêt</option>
                      <option value="remote-program">Programme à distance</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message (optionnel)</Label>
                    <Textarea
                      id="contact-message"
                      name="contact-message"
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

                  <p className="text-center text-xs text-muted-foreground">
                    En soumettant ce formulaire, tu acceptes d'être recontacté(e) par Anaïs.
                  </p>
                </form>
              </div>
            </TabsContent>

            {/* Signup tab */}
            <TabsContent value="signup">
              <div className="bg-card rounded-2xl p-8 shadow-lg border border-border text-center">
                <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center mb-6">
                  <UserPlus className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-xl text-secondary mb-3">
                  Crée ton compte client
                </h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                  En créant ton compte, tu accèdes à ton espace personnel pour
                  réserver tes séances, échanger directement avec Anaïs et
                  suivre ta progression.
                </p>

                <div className="space-y-4 max-w-sm mx-auto mb-8">
                  {[
                    "Réservation de séances en ligne",
                    "Messagerie directe avec Anaïs",
                    "Suivi de tes progrès et historique",
                    "Documents et programmes partagés",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-left">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-secondary-foreground/80 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  className="gradient-primary shadow-primary text-lg font-semibold px-8 group"
                  onClick={() => navigate("/inscription")}
                >
                  Créer mon compte gratuitement
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  Inscription gratuite • Aucun engagement
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Additional SEO text */}
          <p className="text-center text-muted-foreground mt-8 max-w-xl mx-auto text-sm">
            Une fois ton compte créé, tu peux retrouver tes prochaines séances,
            ton historique et tes échanges avec Anaïs directement dans ton espace
            en ligne.
          </p>
        </div>
      </div>
    </section>
  );
}
