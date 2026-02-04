import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { signIn, user, isAdmin, isRoleLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect after login once role is determined
  useEffect(() => {
    if (loginSuccess && user && !isRoleLoading) {
      toast({
        title: "Connexion réussie",
        description: isAdmin ? "Bienvenue dans l'espace admin !" : "Bienvenue dans votre espace client !",
      });
      navigate(isAdmin ? "/admin" : "/espace-client");
    }
  }, [loginSuccess, user, isAdmin, isRoleLoading, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    } else {
      setLoginSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
        
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <span className="text-2xl font-heading font-bold text-primary">AD</span>
              <span className="text-2xl font-heading font-bold text-foreground">Coach</span>
            </div>
            <CardTitle className="text-2xl font-heading">Connexion</CardTitle>
            <CardDescription>
              Accédez à votre espace client personnel
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Link 
                    to="/mot-de-passe-oublie" 
                    className="text-xs text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                Pas encore de compte ?{" "}
                <Link to="/inscription" className="text-primary hover:underline font-medium">
                  Créer un compte
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
