import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "#pourquoi", label: "Pourquoi un coach ?" },
    { href: "#services", label: "Services" },
    { href: "#coach", label: "Qui suis-je ?" },
    { href: "#reservation", label: "Réservation" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Anaïs Dubois - Coach Sportif" 
              className="h-12 md:h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="font-medium">
                Connexion
              </Button>
            </Link>
            <a href="#reservation">
              <Button className="gradient-primary shadow-primary font-semibold">
                Réserver une séance
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Connexion
                  </Button>
                </Link>
                <a href="#reservation" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full gradient-primary shadow-primary font-semibold">
                    Réserver une séance
                  </Button>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
