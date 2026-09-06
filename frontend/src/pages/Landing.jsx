import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Users, Shield, Download, Bell, Check, X, Star, CreditCard, ShieldCheck, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CardPreview from "@/components/CardPreview";

const previewProfile = {
  template_id: "gold",
  first_name: "Alexandre",
  last_name: "Moreau",
  job_title: "Fondateur",
  company: "Studio Noir",
  phone: "+33 6 12 34 56 78",
  email: "alex@studionoir.fr",
};

const pressLogos = ["Les Échos", "BFM Business", "Forbes FR", "French Tech", "Le Figaro"];

const steps = [
  { n: "01", title: "Commandez & personnalisez", desc: "Choisissez votre modèle, personnalisez vos infos en direct. Aperçu réaliste avant paiement." },
  { n: "02", title: "Touchez un smartphone", desc: "Approchez votre carte d'un iPhone ou Android. Zéro app à installer pour votre interlocuteur." },
  { n: "03", title: "Partagez à vie & récoltez", desc: "Coordonnées transmises en 3 secondes. Mises à jour illimitées, gratuites, pour toujours." },
];

const features = [
  { icon: Users, title: "Capture de leads", desc: "Chaque scan peut déposer un contact dans votre tableau de bord." },
  { icon: Zap, title: "Synchronisation instantanée", desc: "Modifiez vos infos, elles sont mises à jour sur toutes vos cartes en direct." },
  { icon: Bell, title: "Mises à jour illimitées", desc: "Jamais de réimpression. Changez de poste, la carte suit." },
  { icon: Sparkles, title: "Zéro application", desc: "Fonctionne sur tous les smartphones NFC modernes, sans app tierce." },
  { icon: Download, title: "Export vCard & CRM", desc: "Récupérez vos leads en CSV, ou branchez votre CRM (Pro)." },
  { icon: Shield, title: "Propriété des données", desc: "Vos données restent les vôtres. Hébergement France, conforme RGPD." },
];

const comparison = [
  { feature: "Coût annuel moyen", papier: "~150 € (réimpressions)", linkedin: "0–600 €", kallitag: "0 € à vie" },
  { feature: "Mise à jour des infos", papier: "Impossible", linkedin: "Nécessite app", kallitag: "1 clic" },
  { feature: "Capture de leads", papier: "Manuelle", linkedin: "Limitée", kallitag: "Instantanée + CSV" },
  { feature: "Effet WOW en RDV", papier: "Aucun", linkedin: "Standard", kallitag: "Inoubliable" },
  { feature: "Propriété des contacts", papier: "Oui", linkedin: "Non (LinkedIn)", kallitag: "Oui, à vous" },
];

const testimonials = [
  { name: "Camille D.", role: "Consultante RH", quote: "Effet garanti à chaque RDV. Mes prospects me demandent tous où je l'ai eue." },
  { name: "Julien B.", role: "Agent immobilier", quote: "J'ai signé 2 mandats grâce à la carte. Le geste NFC crée une vraie discussion." },
  { name: "Sarah K.", role: "Coach business", quote: "Fini les cartes qui finissent à la poubelle. Mes contacts sont enregistrés direct." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      {/* HERO */}
      <section className="hero-radial relative overflow-hidden pt-32 pb-24 grain" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 tracking-wider uppercase" data-testid="hero-badge">
              <Sparkles size={14} /> Carte + Profil à vie · Sans abonnement
            </span>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              La carte NFC premium <br />
              qui signe vos deals <span className="gold-text">en 3 secondes</span>.
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
              Une carte élégante en métal, un profil web à vie, zéro appli pour vos contacts.
              Le tout inclus, une fois pour toutes. <span className="text-amber-400">Pro en option pour aller plus loin.</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/configurateur" className="kt-btn-gold" data-testid="hero-cta-order">
                Commander ma carte <ArrowRight size={18} />
              </Link>
              <a href="#comment" className="kt-btn-ghost" data-testid="hero-cta-how">Comment ça marche</a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-amber-400" /> Satisfait ou remboursé 30j</div>
              <div className="flex items-center gap-1.5"><Truck size={16} className="text-amber-400" /> Livraison offerte</div>
              <div className="flex items-center gap-1.5"><CreditCard size={16} className="text-amber-400" /> Stripe sécurisé</div>
            </div>
          </div>

          <motion.div className="flex justify-center lg:justify-end" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="relative">
                <CardPreview profile={previewProfile} size="lg" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Press bar */}
        <div className="max-w-7xl mx-auto mt-16 px-4 sm:px-6 lg:px-8">
          <p className="eyebrow text-center mb-4">Ils parlent de nous</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {pressLogos.map((l) => (
              <span key={l} className="font-display text-lg text-slate-400 tracking-wide">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="comment" className="py-24" data-testid="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="eyebrow">Comment ça marche</p>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">3 étapes, pas une de plus</h2>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="kt-card p-8 fade-up" style={{ animationDelay: `${i * 120}ms` }} data-testid={`step-${s.n}`}>
                <span className="font-mono text-sm text-amber-400">{s.n}</span>
                <h3 className="mt-4 font-display font-semibold text-xl">{s.title}</h3>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-24 bg-slate-900/30 border-y border-white/5" data-testid="comparison-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow">Pourquoi KalliTag</p>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">Papier vs LinkedIn vs KalliTag</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Critère</th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">Carte papier</th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">LinkedIn</th>
                  <th className="text-center py-4 px-4 text-amber-400 font-semibold">KalliTag</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((r, i) => (
                  <tr key={r.feature} className={i % 2 ? "bg-white/[0.02]" : ""} data-testid={`compare-row-${i}`}>
                    <td className="py-4 px-4 font-medium">{r.feature}</td>
                    <td className="py-4 px-4 text-center text-slate-400"><span className="inline-flex items-center gap-2"><X size={14} className="text-slate-500" />{r.papier}</span></td>
                    <td className="py-4 px-4 text-center text-slate-400">{r.linkedin}</td>
                    <td className="py-4 px-4 text-center text-amber-300 font-medium"><span className="inline-flex items-center gap-2"><Check size={14} className="text-emerald-400" />{r.kallitag}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow">6 piliers d'excellence</p>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">Tout ce dont vous avez besoin. Rien de superflu.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className="kt-card p-6 fade-up" style={{ animationDelay: `${i * 60}ms` }} data-testid={`feature-${i}`}>
                <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/30 grid place-items-center">
                  <f.icon size={20} className="text-amber-400" />
                </div>
                <h3 className="mt-4 font-display font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRO TEASER */}
      <section id="tarifs" className="py-24 bg-gradient-to-b from-slate-900/40 to-slate-950" data-testid="pricing-section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="eyebrow">Tarifs simples</p>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">Inclus à vie. Pro en option.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="kt-card p-8" data-testid="plan-free">
              <p className="eyebrow">Inclus avec chaque carte</p>
              <h3 className="mt-2 font-display font-bold text-2xl">Gratuit à vie</h3>
              <p className="mt-2 text-slate-400 text-sm">Une fois votre carte achetée, c'est à vous pour toujours.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["1 profil web NFC", "Nom, poste, téléphone, email", "Liens réseaux illimités", "QR code de secours", "Mises à jour illimitées"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check size={16} className="text-emerald-400" />{x}</li>
                ))}
              </ul>
            </div>
            <div className="kt-card p-8 border-amber-500/40 relative overflow-hidden" data-testid="plan-pro">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl" />
              <p className="eyebrow">KalliTag Pro</p>
              <h3 className="mt-2 font-display font-bold text-2xl">4,99 € /mois · 39 € /an</h3>
              <p className="mt-2 text-slate-400 text-sm">Pour les pros qui veulent piloter finement leurs contacts.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Analytics scans (horaires, zones)", "Capture de leads illimitée", "Multi-profils (perso / pro / event)", "Thèmes premium + logo XL", "Export CSV & webhook CRM", "Sous-domaine prenom.kallitag.fr"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check size={16} className="text-amber-400" />{x}</li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-slate-500">Bientôt disponible — restez sur votre plan gratuit sans limite en attendant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow">Ils ont adopté KalliTag</p>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">Des retours qui font plaisir.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={t.name} className="kt-card p-6" data-testid={`testimonial-${i}`}>
                <div className="flex gap-0.5 text-amber-400 mb-3">{Array.from({length: 5}).map((_, k) => <Star key={k} size={14} fill="currentColor" />)}</div>
                <p className="text-slate-300 text-sm leading-relaxed">« {t.quote} »</p>
                <p className="mt-4 text-xs text-slate-500">— {t.name}, {t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-900/30 border-y border-white/5" data-testid="faq-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">Les questions qu'on nous pose souvent</h2>
          </div>
          <div className="space-y-4">
            {[
              ["Ça fonctionne sur tous les smartphones ?", "Oui, sur tous les iPhones (7+) et Android modernes. Un QR code de secours est imprimé au verso pour les vieux appareils."],
              ["Je dois installer une appli ?", "Non, ni vous ni votre interlocuteur. Le profil s'ouvre dans le navigateur web."],
              ["Combien de temps pour recevoir ma carte ?", "Livraison en 5 jours ouvrés en France métropolitaine, offerte."],
              ["Si je change de poste, je dois racheter ?", "Non. Vous mettez à jour vos infos depuis votre profil — la carte reste la même."],
              ["C'est vraiment 0€ après l'achat ?", "Oui. Profil de base + mises à jour = à vie inclus. KalliTag Pro n'est jamais obligatoire."],
            ].map(([q, a], i) => (
              <details key={i} className="kt-card p-5 group" data-testid={`faq-${i}`}>
                <summary className="cursor-pointer font-display font-semibold text-base flex items-center justify-between">
                  {q}<span className="text-amber-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24" data-testid="final-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl lg:text-5xl font-extrabold tracking-tight">Prêt à faire <span className="gold-text">forte impression</span> ?</h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto">Rejoignez les indépendants et entrepreneurs qui ne perdent plus jamais un contact.</p>
          <div className="mt-8">
            <Link to="/configurateur" className="kt-btn-gold" data-testid="final-cta-order">Configurer ma carte <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
