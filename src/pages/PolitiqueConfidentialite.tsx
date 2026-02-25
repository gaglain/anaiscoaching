import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const PolitiqueConfidentialite = () => {
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
            Politique de confidentialité
          </h1>

          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Collecte des données</h2>
              <p>
                Dans le cadre de l'utilisation du site <strong>coachsportif-rennes.fr</strong>, les données personnelles suivantes peuvent être collectées :
              </p>
              <ul>
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Objectifs sportifs et niveau</li>
              </ul>
              <p>
                Ces données sont collectées lors de la création de compte, de l'envoi d'un formulaire de contact ou de la réservation d'une séance.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Finalités du traitement</h2>
              <p>Les données collectées sont utilisées pour :</p>
              <ul>
                <li>Gérer les réservations de séances de coaching</li>
                <li>Communiquer avec les clients (rappels, suivi)</li>
                <li>Personnaliser l'accompagnement sportif</li>
                <li>Répondre aux demandes de contact</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Base légale</h2>
              <p>
                Le traitement des données repose sur le consentement de l'utilisateur lors de la création de compte ou de l'envoi d'un formulaire, ainsi que sur l'exécution du contrat de prestation de coaching sportif.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Durée de conservation</h2>
              <p>
                Les données personnelles sont conservées pendant la durée de la relation commerciale, puis archivées pendant une durée maximale de 3 ans après le dernier contact, conformément aux obligations légales.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Partage des données</h2>
              <p>
                Vos données personnelles ne sont jamais vendues ni partagées avec des tiers à des fins commerciales. Elles peuvent être transmises à des sous-traitants techniques (hébergement, envoi d'emails) dans le strict cadre du fonctionnement du service.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Vos droits</h2>
              <p>
                Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
              </p>
              <ul>
                <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
                <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                <li><strong>Droit de suppression :</strong> demander l'effacement de vos données</li>
                <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format lisible</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
              </ul>
              <p>
                Pour exercer ces droits, contactez Anaïs Dubois à l'adresse : <a href="mailto:anais.coaching@outlook.fr" className="text-primary hover:underline">anais.coaching@outlook.fr</a>
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Sécurité</h2>
              <p>
                Des mesures techniques et organisationnelles appropriées sont mises en œuvre pour protéger vos données personnelles contre tout accès non autorisé, perte ou altération.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold text-secondary">Contact</h2>
              <p>
                Pour toute question relative à cette politique de confidentialité, vous pouvez contacter Anaïs Dubois à : <a href="mailto:anais.coaching@outlook.fr" className="text-primary hover:underline">anais.coaching@outlook.fr</a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PolitiqueConfidentialite;
