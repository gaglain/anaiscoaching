import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Combien de temps dure une séance avec ton coach sportif à Rennes ?",
    answer:
      "Les séances durent en général entre 45 minutes et 1 heure, selon ton niveau et l'objectif de la séance. Pour les séances de remise en forme ou de renforcement, 1 heure est souvent idéal pour un échauffement complet, le travail principal et les étirements.",
  },
  {
    question: "Où se déroulent les séances de coaching à Rennes ?",
    answer:
      "Les séances peuvent avoir lieu à domicile, en extérieur dans Rennes et ses environs (parcs, espaces verts), ou dans un lieu défini avec Anaïs en fonction de tes préférences. La flexibilité est au cœur de l'accompagnement.",
  },
  {
    question: "Faut-il avoir un niveau sportif pour commencer ?",
    answer:
      "Absolument pas ! Anaïs accompagne aussi bien les débutants que les sportifs confirmés. Chaque programme est adapté à ton niveau actuel, tes capacités et tes objectifs. L'important est de commencer, peu importe d'où tu pars.",
  },
  {
    question: "Comment se passe la première séance ?",
    answer:
      "La première séance est un moment d'échange pour faire connaissance, comprendre tes objectifs et évaluer ton niveau. Anaïs prendra le temps de te poser des questions sur ton historique sportif, tes contraintes et tes attentes pour construire un programme sur-mesure.",
  },
  {
    question: "Quels sont les tarifs du coaching sportif à Rennes ?",
    answer:
      "Les tarifs varient selon le format choisi (individuel, duo, petit groupe) et la fréquence des séances. Contacte Anaïs via le formulaire pour recevoir une proposition adaptée à ta situation et tes objectifs.",
  },
  {
    question: "Comment annuler ou reporter une séance ?",
    answer:
      "Tu peux annuler ou reporter une séance directement depuis ton espace client en ligne. Pour les annulations de dernière minute (moins de 24h), merci de contacter Anaïs directement par message.",
  },
  {
    question: "Est-ce que tu proposes des séances en visio ?",
    answer:
      "Pour l'instant, Anaïs privilégie les séances en présentiel pour garantir un accompagnement optimal et corriger ta posture en temps réel. Cela permet d'assurer ta sécurité et de maximiser l'efficacité des exercices.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6">
            FAQ – Coach sportif Rennes
          </h2>
          <p className="text-lg text-muted-foreground">
            Tu as des questions sur le coaching sportif à Rennes ? Voici les
            réponses aux questions les plus fréquentes.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-heading font-semibold text-secondary hover:text-primary py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Schema.org FAQ structured data is in index.html */}
      </div>
    </section>
  );
}
