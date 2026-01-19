import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MessageSquare, Home, LogOut, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ClientOverview } from "@/components/client/ClientOverview";
import { ClientBookings } from "@/components/client/ClientBookings";
import { ClientMessages } from "@/components/client/ClientMessages";
import logo from "@/assets/logo.png";

export default function ClientDashboard() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Anaïs Dubois Coach" className="h-10 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Bonjour, <span className="font-semibold text-foreground">{user?.user_metadata?.name || user?.email?.split('@')[0]}</span>
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-primary/20 hover:bg-primary/5 hover:border-primary/40">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-in slide-in-from-top-2">
              <div className="flex flex-col gap-4">
                <span className="text-sm text-muted-foreground">
                  Connecté en tant que <span className="font-semibold text-foreground">{user?.email}</span>
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="w-fit">
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Mon espace client
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos réservations et échangez avec votre coach
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Accueil</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Réservations</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverview />
          </TabsContent>

          <TabsContent value="bookings">
            <ClientBookings />
          </TabsContent>

          <TabsContent value="messages">
            <ClientMessages />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
