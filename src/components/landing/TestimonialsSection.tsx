import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Sophie M.",
    role: "Perte de poids",
    content:
      "Grâce à Anaïs, j'ai perdu 12 kg en 6 mois sans frustration. Son approche bienveillante m'a permis de reprendre confiance et de trouver un vrai plaisir à bouger. Je recommande les yeux fermés !",
    rating: 5,
  },
  {
    name: "Thomas L.",
    role: "Renforcement musculaire",
    content:
      "Je cherchais un coach sportif à Rennes qui s'adapte à mon emploi du temps chargé. Anaïs est hyper flexible et ses séances sont efficaces. En 3 mois, j'ai gagné en force et en énergie.",
    rating: 5,
  },
  {
    name: "Marie-Claire D.",
    role: "Remise en forme après grossesse",
    content:
      "Après mon accouchement, j'avais besoin d'un accompagnement en douceur. Anaïs a su adapter chaque séance à mes capacités du moment. Je me sens plus forte que jamais !",
    rating: 5,
  },
  {
    name: "Julien R.",
    role: "Préparation trail",
    content:
      "Anaïs m'a préparé pour mon premier trail de 30 km. Programme structuré, suivi régulier et beaucoup de motivation. J'ai terminé sans blessure et avec le sourire !",
    rating: 5,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          className="max-w-3xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6">
            Ce que disent les clients d'Anaïs
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Des dizaines de personnes accompagnées à Rennes et alentours.
            Voici leurs retours sur leur expérience de coaching sportif.
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              variants={cardVariants}
              className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow duration-300 relative"
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/15" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>

              {/* Content */}
              <p className="text-muted-foreground leading-relaxed mb-6 italic">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-secondary text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
