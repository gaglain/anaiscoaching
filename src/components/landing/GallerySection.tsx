import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import galleryOutdoor from "@/assets/gallery-outdoor.jpg";
import galleryHome from "@/assets/gallery-home.jpg";
import galleryDuo from "@/assets/gallery-duo.jpg";
import galleryGroup from "@/assets/gallery-group.jpg";
import galleryAssessment from "@/assets/gallery-assessment.jpg";
import galleryResults from "@/assets/gallery-results.jpg";

const photos = [
  { src: galleryOutdoor, alt: "Séance de coaching sportif en extérieur à Rennes", label: "En extérieur" },
  { src: galleryHome, alt: "Coaching sportif à domicile avec élastiques", label: "À domicile" },
  { src: galleryDuo, alt: "Séance de coaching en duo dans un parc", label: "En duo" },
  { src: galleryGroup, alt: "Séance de coaching petit groupe avec kettlebells", label: "Petit groupe" },
  { src: galleryAssessment, alt: "Bilan et évaluation sportive personnalisée", label: "Évaluation" },
  { src: galleryResults, alt: "Résultats et progression avec le coaching sportif", label: "Résultats" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function GallerySection() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="max-w-3xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6">
            Les séances en images
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Découvrez l'ambiance des séances de coaching sportif avec Anaïs à
            Rennes : en extérieur, à domicile, en duo ou en petit groupe.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {photos.map((photo, index) => (
            <motion.button
              key={index}
              variants={itemVariants}
              className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setSelectedImage(index)}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute bottom-3 left-3 text-sm font-semibold text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/80 px-3 py-1 rounded-full">
                {photo.label}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photos[selectedImage].src}
                alt={photos[selectedImage].alt}
                className="w-full h-full object-contain rounded-xl"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-background/80 text-foreground hover:bg-background transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="absolute bottom-3 left-3 text-sm font-medium text-primary-foreground bg-primary/80 px-4 py-2 rounded-full">
                {photos[selectedImage].label}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
