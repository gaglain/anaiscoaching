import { MapPin, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-secondary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-2xl">
              Anaïs <span className="text-primary">Dubois</span>
            </h3>
            <p className="text-secondary-foreground/70 leading-relaxed">
              Coach sportif diplômée à Rennes. Coaching personnalisé pour perte
              de poids, remise en forme et renforcement musculaire.
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-lg">Navigation</h4>
            <nav className="flex flex-col gap-2">
              <a
                href="#pourquoi"
                className="text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                Pourquoi un coach ?
              </a>
              <a
                href="#services"
                className="text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                Services
              </a>
              <a
                href="#coach"
                className="text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                Qui suis-je ?
              </a>
              <a
                href="#reservation"
                className="text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                Réserver
              </a>
              <a
                href="#faq"
                className="text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                FAQ
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-lg">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-secondary-foreground/70">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Rennes et alentours, Bretagne</span>
              </div>
              <a
                href="mailto:anais.coaching@outlook.fr"
                className="flex items-center gap-3 text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <span>anais.coaching@outlook.fr</span>
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-lg">Espace client</h4>
            <nav className="flex flex-col gap-2">
              <Link
                to="/login"
                className="text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/signup"
                className="text-secondary-foreground/70 hover:text-primary transition-colors"
              >
                Créer un compte
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-secondary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-secondary-foreground/50 text-sm">
            © {currentYear} Anaïs Dubois – Coach Sportif Rennes. Tous droits
            réservés.
          </p>
          <div className="flex gap-6 text-sm">
            <Link
              to="/mentions-legales"
              className="text-secondary-foreground/50 hover:text-primary transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              to="/politique-confidentialite"
              className="text-secondary-foreground/50 hover:text-primary transition-colors"
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
