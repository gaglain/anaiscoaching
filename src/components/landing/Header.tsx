import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, MessageCircle, User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import logo from "@/assets/logo.png";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { unreadCount } = useUnreadMessages();

  const navLinks = [
    { href: "#pourquoi", label: "Pourquoi un coach ?" },
    { href: "#services", label: "Services" },
    { href: "#coach", label: "Qui suis-je ?" },
    { href: "#reservation", label: "Réservation" },
    { href: "#faq", label: "FAQ" },
  ];

  const dashboardLink = isAdmin ? "/admin" : "/espace-client";
  const dashboardLabel = isAdmin ? "Administration" : "Mon espace";

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

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
            {user ? (
              <>
                {/* Messages button with badge */}
                <Link to={`${dashboardLink}?tab=messages`} className="relative">
                  <Button variant="ghost" size="icon" className="relative">
                    <MessageCircle className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                
                {/* Dashboard link */}
                <Link to={dashboardLink}>
                  <Button variant="ghost" className="font-medium gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {dashboardLabel}
                  </Button>
                </Link>
                
                {/* Sign out */}
                <Button variant="outline" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
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
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Mobile menu panel */}
            <div className="lg:hidden absolute left-0 right-0 top-full bg-background border-b border-border shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
              <nav className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors font-medium py-3 px-4 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              
              <div className="border-t border-border mt-2 pt-2">
                {user ? (
                  <>
                    {/* Messages with badge */}
                    <Link 
                      to={`${dashboardLink}?tab=messages`} 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors font-medium py-3 px-4 rounded-lg"
                    >
                      <span className="flex items-center gap-3">
                        <MessageCircle className="h-5 w-5" />
                        Messages
                      </span>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </Link>
                    
                    {/* Dashboard */}
                    <Link 
                      to={dashboardLink} 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors font-medium py-3 px-4 rounded-lg"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      {dashboardLabel}
                    </Link>
                    
                    {/* Sign out */}
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-colors font-medium py-3 px-4 rounded-lg w-full text-left mt-2"
                    >
                      <LogOut className="h-5 w-5" />
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 pt-2">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full gap-2">
                        <User className="h-4 w-4" />
                        Connexion
                      </Button>
                    </Link>
                    <a href="#reservation" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full gradient-primary shadow-primary font-semibold">
                        Réserver une séance
                      </Button>
                    </a>
                  </div>
                )}
              </div>
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
