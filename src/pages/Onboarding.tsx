import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, CheckCircle2, Dumbbell, Target, Heart, Zap, Users, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  title: string;
  subtitle: string;
  options: { value: string; label: string; icon: React.ReactNode }[];
  multiple: boolean;
}

const questions: Question[] = [
  {
    id: "motivation",
    title: "Qu'est-ce qui t'amène ici ?",
    subtitle: "Choisis une ou plusieurs raisons",
    multiple: true,
    options: [
      { value: "perte_poids", label: "Perdre du poids", icon: <Target className="h-6 w-6" /> },
      { value: "remise_en_forme", label: "Me remettre en forme", icon: <Heart className="h-6 w-6" /> },
      { value: "renforcement", label: "Me renforcer musculairement", icon: <Dumbbell className="h-6 w-6" /> },
      { value: "preparation", label: "Préparer une épreuve sportive", icon: <Zap className="h-6 w-6" /> },
      { value: "bien_etre", label: "Améliorer mon bien-être", icon: <Sparkles className="h-6 w-6" /> },
      { value: "reprise", label: "Reprendre après une pause", icon: <Clock className="h-6 w-6" /> },
    ],
  },
  {
    id: "level",
    title: "Quel est ton niveau sportif actuel ?",
    subtitle: "Sois honnête, c'est pour mieux t'accompagner 😊",
    multiple: false,
    options: [
      { value: "debutant", label: "Débutant — Je démarre de zéro", icon: <span className="text-2xl">🌱</span> },
      { value: "intermediaire", label: "Intermédiaire — Je fais du sport de temps en temps", icon: <span className="text-2xl">💪</span> },
      { value: "avance", label: "Avancé — Je m'entraîne régulièrement", icon: <span className="text-2xl">🔥</span> },
    ],
  },
  {
    id: "frequency",
    title: "À quelle fréquence souhaites-tu t'entraîner ?",
    subtitle: "On adaptera ensemble selon tes disponibilités",
    multiple: false,
    options: [
      { value: "1_semaine", label: "1 fois par semaine", icon: <span className="text-2xl">1️⃣</span> },
      { value: "2_semaine", label: "2 fois par semaine", icon: <span className="text-2xl">2️⃣</span> },
      { value: "3_plus", label: "3 fois ou plus par semaine", icon: <span className="text-2xl">3️⃣</span> },
      { value: "pas_sur", label: "Je ne sais pas encore", icon: <span className="text-2xl">🤔</span> },
    ],
  },
  {
    id: "session_type",
    title: "Quel format de séance te convient le mieux ?",
    subtitle: "Tu pourras changer d'avis plus tard",
    multiple: true,
    options: [
      { value: "individual", label: "Individuel — Un coaching 100% personnalisé", icon: <span className="text-2xl">🧑</span> },
      { value: "duo", label: "En duo — Avec un(e) ami(e) ou partenaire", icon: <Users className="h-6 w-6" /> },
      { value: "group", label: "Petit groupe — Convivialité et émulation", icon: <span className="text-2xl">👥</span> },
      { value: "outdoor", label: "En extérieur — Profiter du plein air", icon: <span className="text-2xl">🌿</span> },
    ],
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const current = questions[step];
  const progress = ((step + 1) / questions.length) * 100;
  const selectedValues = answers[current.id] || [];

  const toggleOption = (value: string) => {
    setAnswers((prev) => {
      const currentAnswers = prev[current.id] || [];
      if (current.multiple) {
        return {
          ...prev,
          [current.id]: currentAnswers.includes(value)
            ? currentAnswers.filter((v) => v !== value)
            : [...currentAnswers, value],
        };
      }
      return { ...prev, [current.id]: [value] };
    });
  };

  const canNext = selectedValues.length > 0;

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Build onboarding data
      const onboardingData = {
        motivation: answers.motivation || [],
        level: answers.level?.[0] || null,
        frequency: answers.frequency?.[0] || null,
        session_type: answers.session_type || [],
        completed_at: new Date().toISOString(),
      };

      // Map level to profiles.level
      const levelMap: Record<string, string> = {
        debutant: "beginner",
        intermediaire: "intermediate",
        avance: "advanced",
      };

      // Build goals string from motivations
      const motivationLabels: Record<string, string> = {
        perte_poids: "Perte de poids",
        remise_en_forme: "Remise en forme",
        renforcement: "Renforcement musculaire",
        preparation: "Préparation sportive",
        bien_etre: "Bien-être",
        reprise: "Reprise après pause",
      };
      const goalsStr = (answers.motivation || [])
        .map((m) => motivationLabels[m] || m)
        .join(", ");

      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_data: onboardingData as any,
          level: levelMap[answers.level?.[0] || ""] || "beginner",
          goals: goalsStr || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Bienvenue ! 🎉",
        description: "Ton profil est complet. Tu peux maintenant réserver ta première séance.",
      });
      navigate("/espace-client");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder tes réponses.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Progress bar */}
      <div className="w-full px-4 pt-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
            <span>Question {step + 1} / {questions.length}</span>
            <button
              type="button"
              onClick={() => {
                navigate("/espace-client");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors underline text-xs"
            >
              Passer
            </button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-8 animate-fade-in" key={step}>
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              {current.title}
            </h1>
            <p className="text-muted-foreground">{current.subtitle}</p>
          </div>

          <div className="space-y-3">
            {current.options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isSelected ? <CheckCircle2 className="h-5 w-5" /> : option.icon}
                  </div>
                  <span
                    className={cn(
                      "font-medium transition-colors",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canNext || isSubmitting}
              className="gap-1"
            >
              {isSubmitting ? (
                "Enregistrement..."
              ) : step === questions.length - 1 ? (
                <>
                  Terminer
                  <CheckCircle2 className="h-4 w-4" />
                </>
              ) : (
                <>
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
