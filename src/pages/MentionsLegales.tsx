import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const MentionsLegales = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-8">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>

          <h1 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-10">
            Mentions légales
          </h1>

          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Éditeur du site</h2>
              <p>
                Le site <strong>coachsportif-rennes.fr</strong> est édité par Anaïs Dubois, coach sportif diplômée, exerçant en tant qu'auto-entrepreneur.
              </p>
              <ul className="list-none space-y-1 pl-0">
                <li><strong>Nom :</strong> Anaïs Dubois</li>
                <li><strong>Activité :</strong> Coach sportif</li>
                <li><strong>Adresse :</strong> Rennes, Bretagne, France</li>
                <li><strong>Email :</strong> anais.coaching@outlook.fr</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Hébergement</h2>
              <p>
                Ce site est hébergé par Lovable (lovable.dev).
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Propriété intellectuelle</h2>
              <p>
                L'ensemble des contenus présents sur ce site (textes, images, logos, graphismes) sont la propriété exclusive d'Anaïs Dubois, sauf mention contraire. Toute reproduction, distribution ou utilisation sans autorisation préalable est interdite.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Responsabilité</h2>
              <p>
                L'éditeur s'efforce de fournir des informations exactes et à jour. Toutefois, il ne saurait être tenu responsable des erreurs, omissions ou résultats obtenus suite à l'utilisation de ces informations.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Cookies</h2>
              <p>
                Ce site utilise des cookies techniques nécessaires à son fonctionnement (authentification, préférences). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MentionsLegales;
