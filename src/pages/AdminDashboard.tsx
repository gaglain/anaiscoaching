import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MessageSquare, Users, LayoutDashboard, LogOut, Menu, X, CalendarDays, Home, FileText, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminBookings } from "@/components/admin/AdminBookings";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { AdminMessages } from "@/components/admin/AdminMessages";
import { AdminClients } from "@/components/admin/AdminClients";
import { AdminDocuments } from "@/components/admin/AdminDocuments";
import { AdminSettings } from "@/components/admin/AdminSettings";
import logo from "@/assets/logo.png";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
              <span className="px-2 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-semibold uppercase tracking-wide">
                Admin
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  Accueil
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 relative"
                onClick={() => setActiveTab("messages")}
              >
                <MessageSquare className="h-4 w-4" />
                Messages
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Anaïs Dubois
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-secondary/20 hover:bg-secondary/5 hover:border-secondary/40">
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
                <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </Link>
                <button
                  onClick={() => {
                    setActiveTab("messages");
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Messages
                  {unreadCount > 0 && (
                    <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </button>
                <span className="text-sm text-muted-foreground">
                  Connectée en tant qu'admin
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
            Back-office
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos clients, réservations et messages
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Accueil</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Réservations</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendrier</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 relative data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="bookings">
            <AdminBookings />
          </TabsContent>

          <TabsContent value="calendar">
            <AdminCalendar />
          </TabsContent>

          <TabsContent value="messages">
            <AdminMessages />
          </TabsContent>

          <TabsContent value="documents">
            <AdminDocuments />
          </TabsContent>

          <TabsContent value="clients">
            <AdminClients />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
