import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Users, Shield, Download, Bell, Check, X, Star, CreditCard, ShieldCheck, Truck, Smartphone, Wifi } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CardPreview from "@/components/CardPreview";
import ProfilePreview from "@/components/ProfilePreview";

/* ---------- Mockups CSS des étapes (cartes KalliTag sans inscriptions) ---------- */
const KalliCard = ({ rotate = 0, style = {} }) => (
  <div className="absolute rounded-2xl shadow-2xl overflow-hidden" style={{
    width: 200, height: 316,
    background: "linear-gradient(135deg, #0B0F17 0%, #1a1a1a 50%, #0B0F17 100%)",
    border: "1px solid rgba(212,175,55,0.15)",
    transform: `rotate(${rotate}deg)`,
    boxShadow: "0 30px 60px -20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
    ...style,
  }}>
    {/* NFC coil discret */}
    <div className="absolute inset-6 rounded-xl border border-white/[0.04]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border border-white/[0.06]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/[0.04]" />
    {/* Reflet doré subtil */}
    <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 60%)" }} />
  </div>
);

const PhoneMockup = ({ style = {}, content }) => (
  <div className="absolute rounded-[36px] shadow-2xl overflow-hidden" style={{
    width: 180, height: 360,
    background: "#0A0A0A",
    padding: 6,
    boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.06)",
    ...style,
  }}>
    <div className="w-full h-full rounded-[30px] overflow-hidden relative" style={{ background: "#FAF7F0" }}>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-black z-10" />
      {content}
    </div>
  </div>
);

const StepVisual = ({ kind }) => {
  if (kind === "config") {
    // Étape 1 : client sur ordi/mobile qui personnalise son profil
    return (
      <div className="w-full h-full relative" style={{ background: "linear-gradient(135deg, #E8DDC8 0%, #C9B48A 100%)" }}>
        <PhoneMockup style={{ left: "50%", top: "8%", transform: "translateX(-50%)" }} content={
          <div className="w-full h-full pt-10 px-4">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#B8860B] mb-2">Configurateur</p>
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-200 to-amber-500 mb-2 border-2 border-white shadow" />
            <p className="text-center text-[10px] font-bold text-[#1F1B16]">Alexandre M.</p>
            <p className="text-center text-[8px] text-[#8B7F6E]">Fondateur</p>
            <div className="mt-3 space-y-1.5">
              <div className="h-2 rounded bg-[#1F1B16]/10" style={{ width: "80%" }} />
              <div className="h-2 rounded bg-[#1F1B16]/10" style={{ width: "60%" }} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1">
              <div className="h-6 rounded-md bg-[#0A66C2]" title="LinkedIn" />
              <div className="h-6 rounded-md bg-[#E4405F]" title="Instagram" />
              <div className="h-6 rounded-md bg-[#25D366]" title="WhatsApp" />
              <div className="h-6 rounded-md bg-[#4A5568]" title="Site" />
            </div>
            <div className="mt-2 h-7 rounded-full bg-gradient-to-r from-[#B8860B] to-[#D4AF37]" />
          </div>
        } />
        {/* Curseur qui pointe */}
        <div className="absolute" style={{ right: "22%", top: "42%" }}>
          <div className="w-6 h-6 rounded-full bg-white/40 backdrop-blur border-2 border-white/70 shadow-lg" />
        </div>
      </div>
    );
  }
  if (kind === "shipping") {
    // Étape 2 : atelier / packaging / colis
    return (
      <div className="w-full h-full relative" style={{ background: "linear-gradient(135deg, #1a1611 0%, #2A2419 60%, #0F0B08 100%)" }}>
        {/* Écrin noir premium ouvert avec la carte à l'intérieur */}
        <div className="absolute rounded-xl shadow-2xl" style={{
          left: "50%", top: "50%", transform: "translate(-50%, -50%) rotate(-4deg)",
          width: 260, height: 200,
          background: "linear-gradient(135deg, #2A2419 0%, #1F1A11 100%)",
          border: "1px solid rgba(212,175,55,0.25)",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,175,55,0.1)",
        }}>
          {/* Doublure velours */}
          <div className="absolute inset-3 rounded-lg" style={{ background: "radial-gradient(ellipse at center, #4A3F2E 0%, #2A2419 80%)" }} />
          {/* Carte KalliTag au centre de l'écrin */}
          <div className="absolute rounded-lg" style={{
            left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            width: 150, height: 95,
            background: "linear-gradient(135deg, #0B0F17 0%, #1a1a1a 100%)",
            border: "1px solid rgba(212,175,55,0.3)",
            boxShadow: "0 8px 20px -4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/[0.08]" />
            <div className="absolute inset-2 rounded border border-white/[0.03]" />
          </div>
        </div>
        {/* Ruban doré signature */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest text-[#0B0F17]" style={{ background: "linear-gradient(90deg, #D4AF37, #B8860B)" }}>
          Édition Signature
        </div>
        <div className="absolute bottom-4 right-4 text-[10px] font-mono uppercase tracking-widest text-[#D4AF37]/70">
          Livraison offerte · 48-72h
        </div>
      </div>
    );
  }
  // usage — étape 3 : RDV, tap NFC, profil s'affiche
  return (
    <div className="w-full h-full relative" style={{ background: "linear-gradient(135deg, #F5E6DE 0%, #E8D4C4 100%)" }}>
      <KalliCard rotate={12} style={{ left: "6%", top: "22%" }} />
      <PhoneMockup style={{ right: "10%", top: "10%" }} content={
        <div className="w-full h-full relative" style={{ background: "#0B0F17" }}>
          <div className="pt-8 px-3 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-300 to-amber-600 mb-2 border-2 border-white/20" />
            <p className="text-[11px] font-bold text-white">Alexandre M.</p>
            <p className="text-[8px] text-white/60">Fondateur · Studio Noir</p>
            <div className="mt-3 space-y-1">
              <div className="h-5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] flex items-center justify-center">
                <span className="text-[7px] font-bold text-[#0B0F17]">AJOUTER AU CARNET</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <div className="h-5 rounded bg-[#0A66C2]" />
                <div className="h-5 rounded bg-[#E4405F]" />
                <div className="h-5 rounded bg-[#25D366]" />
                <div className="h-5 rounded bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      } />
      {/* Onde NFC entre la carte et le téléphone */}
      <div className="absolute" style={{ left: "38%", top: "44%" }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#B8860B]/40 animate-ping" />
      </div>
    </div>
  );
};

const previewProfile = {
  theme_id: "onyx",
  first_name: "Alexandre",
  last_name: "Moreau",
  job_title: "Fondateur",
  company: "Studio Noir",
  tagline: "Créateur de marques inoubliables.",
  phone: "+33 6 12 34 56 78",
  email: "alex@studionoir.fr",
  links: { linkedin: "https://linkedin.com/in/alexmoreau", instagram: "https://instagram.com/studionoir", website: "https://studionoir.fr", calendly: "https://calendly.com/alex" },
};

const steps = [
  {
    n: "01",
    title: "Personnalisez en ligne",
    desc: "Choisissez votre finition (Noir Mat, Métal Brossé ou Or) et remplissez votre profil : photo, nom, poste, réseaux sociaux, site web... Vous voyez le rendu final en direct pendant que vous tapez.",
    visual: "config",
  },
  {
    n: "02",
    title: "On la configure & on vous l'envoie",
    desc: "Après paiement, notre équipe encode votre carte KalliTag avec votre profil personnalisé, puis vous l'expédie sous 48-72h. Livraison offerte en France métropolitaine.",
    visual: "shipping",
  },
  {
    n: "03",
    title: "Partagez à chaque rencontre",
    desc: "À chaque RDV, présentez votre carte KalliTag et approchez-la du téléphone de votre interlocuteur (iPhone ou Android). Votre profil s'affiche instantanément sur son écran — plus jamais de prospect qui vous oublie.",
    visual: "usage",
  },
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
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />

      {/* HERO */}
      <section className="hero-radial relative overflow-hidden pt-32 pb-24 grain" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 tracking-wider uppercase" data-testid="hero-badge">
              <Sparkles size={14} /> Carte + Profil à vie · Sans abonnement
            </span>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Une carte NFC sobre. <br />
              Une <span className="gold-text">page profil qui vend</span> pour vous.
            </h1>
            <p className="mt-6 text-lg text-[#4A3F2E] max-w-xl leading-relaxed">
              Vous approchez votre carte d'un smartphone. Votre page profil s'ouvre : photo, poste,
              boutons d'action rapide (appel, email, Instagram, WhatsApp, ajout au répertoire).
              <span className="text-amber-400"> Modifiable à vie.</span> Zéro appli.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/configurateur" className="kt-btn-gold" data-testid="hero-cta-order">
                Commander ma carte <ArrowRight size={18} />
              </Link>
              <a href="#comment" className="kt-btn-ghost" data-testid="hero-cta-how">Comment ça marche</a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-[#6B5F4E]">
              <div className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-amber-400" /> Satisfait ou remboursé 30j</div>
              <div className="flex items-center gap-1.5"><Truck size={16} className="text-amber-400" /> Livraison offerte</div>
              <div className="flex items-center gap-1.5"><CreditCard size={16} className="text-amber-400" /> Stripe sécurisé</div>
            </div>
          </div>

          <motion.div className="flex justify-center lg:justify-end" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <div className="relative flex items-end gap-6">
              <div className="absolute -inset-10 rounded-full bg-amber-500/10 blur-3xl -z-10" />
              <div className="hidden md:block">
                <CardPreview finishId="or_brosse" size="sm" />
              </div>
              <div className="relative">
                <ProfilePreview profile={previewProfile} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LEAD CAPTURE TEASER — module SaaS positionné haut, sous le hero */}
      <section className="py-14 px-4 sm:px-6 lg:px-8" data-testid="leadcapture-teaser">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-[#1F1B16] via-[#2b2418] to-[#0B0F17] p-8 lg:p-10 shadow-2xl">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
            <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                  <Zap size={12} /> Nouveau · Module SaaS
                </div>
                <h2 className="mt-4 font-display text-3xl lg:text-4xl font-bold tracking-tight text-white">
                  KalliTag <span className="gold-text">Lead Capture</span> est disponible
                </h2>
                <p className="mt-3 text-base text-slate-300 leading-relaxed max-w-xl">
                  Chaque personne qui tape votre carte devient un lead qualifié dans votre CRM.
                  Formulaire personnalisable, emails automatiques, export CSV. Dès 19,90 €/mois.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/tarifs" className="kt-btn-gold" data-testid="teaser-cta-pricing">
                    Voir les formules <ArrowRight size={16} />
                  </Link>
                  <Link to="/tarifs#all-in-one" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 text-white text-sm font-medium border border-white/15 hover:bg-white/15 transition" data-testid="teaser-cta-allin">
                    Pack All-in-One <span className="text-amber-300 font-semibold">29,90 €/mois</span>
                  </Link>
                </div>
              </div>
              <div className="hidden md:flex flex-col gap-2 items-end">
                <div className="text-right">
                  <p className="font-display font-black text-6xl gold-text leading-none">19,90€</p>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-slate-400">à partir de / mois</p>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {["Capture", "CRM", "Emails", "Export"].map((t) => (
                    <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-white/8 border border-white/10 text-slate-300">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — alternating photo/text layout */}
      <section id="comment" className="py-24" data-testid="how-it-works">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-20">
            <p className="eyebrow">Comment ça marche</p>
            <h2 className="mt-3 font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Comment ça marche <span className="gold-text">?</span>
            </h2>
            <div className="mt-6 h-px bg-gradient-to-r from-[#1F1B16]/40 via-[#B8860B]/40 to-transparent" />
          </div>

          <div className="space-y-16">
            {steps.map((s, i) => (
              <div key={s.n} className={`grid md:grid-cols-2 gap-8 lg:gap-16 items-center fade-up ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`} style={{ animationDelay: `${i * 100}ms` }} data-testid={`step-${s.n}`}>
                {/* Photo side */}
                <div className="relative">
                  <div className="absolute -top-8 -left-4 md:-left-8 z-20 w-16 h-16 rounded-2xl bg-white shadow-xl border border-[#1F1B16]/10 grid place-items-center">
                    <span className="font-display font-black text-3xl gold-text leading-none">{parseInt(s.n)}</span>
                  </div>
                  <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl border border-[#1F1B16]/10">
                    <StepVisual kind={s.visual} />
                  </div>
                </div>
                {/* Text side */}
                <div className="px-2">
                  <h3 className="font-display font-bold text-3xl lg:text-4xl tracking-tight">{s.title}</h3>
                  <p className="mt-4 text-base text-[#4A3F2E] leading-relaxed max-w-md">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-24 bg-white/40 border-y border-[#1F1B16]/8" data-testid="comparison-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow">Pourquoi KalliTag</p>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight">Papier vs LinkedIn vs KalliTag</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1F1B16]/12">
                  <th className="text-left py-4 px-4 text-[#6B5F4E] font-medium">Critère</th>
                  <th className="text-center py-4 px-4 text-[#6B5F4E] font-medium">Carte papier</th>
                  <th className="text-center py-4 px-4 text-[#6B5F4E] font-medium">LinkedIn</th>
                  <th className="text-center py-4 px-4 text-amber-400 font-semibold">KalliTag</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((r, i) => (
                  <tr key={r.feature} className={i % 2 ? "bg-white/[0.02]" : ""} data-testid={`compare-row-${i}`}>
                    <td className="py-4 px-4 font-medium">{r.feature}</td>
                    <td className="py-4 px-4 text-center text-[#6B5F4E]"><span className="inline-flex items-center gap-2"><X size={14} className="text-[#8B7F6E]" />{r.papier}</span></td>
                    <td className="py-4 px-4 text-center text-[#6B5F4E]">{r.linkedin}</td>
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
                <p className="mt-2 text-sm text-[#6B5F4E] leading-relaxed">{f.desc}</p>
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
              <p className="mt-2 text-[#6B5F4E] text-sm">Une fois votre carte achetée, c'est à vous pour toujours.</p>
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
              <p className="mt-2 text-[#6B5F4E] text-sm">Pour les pros qui veulent piloter finement leurs contacts.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Analytics scans (horaires, zones)", "Capture de leads illimitée", "Multi-profils (perso / pro / event)", "Thèmes premium + logo XL", "Export CSV & webhook CRM", "Sous-domaine prenom.kallitag.fr"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check size={16} className="text-amber-400" />{x}</li>
                ))}
              </ul>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <a href="/mon-profil?upgrade=monthly" className="kt-btn-gold justify-center text-sm" data-testid="pro-subscribe-monthly">
                  4,99 € / mois
                </a>
                <a href="/mon-profil?upgrade=yearly" className="kt-btn-ghost justify-center text-sm inline-flex items-center" data-testid="pro-subscribe-yearly">
                  39 € / an (économisez 20€)
                </a>
              </div>
              <p className="mt-3 text-[11px] text-[#8B7F6E]">Connexion requise avant paiement · Résiliable à tout moment</p>
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
                <p className="text-[#4A3F2E] text-sm leading-relaxed">« {t.quote} »</p>
                <p className="mt-4 text-xs text-[#8B7F6E]">— {t.name}, {t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white/40 border-y border-[#1F1B16]/8" data-testid="faq-section">
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
                <p className="mt-3 text-sm text-[#6B5F4E] leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24" data-testid="final-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl lg:text-5xl font-extrabold tracking-tight">Prêt à faire <span className="gold-text">forte impression</span> ?</h2>
          <p className="mt-4 text-[#6B5F4E] max-w-2xl mx-auto">Rejoignez les indépendants et entrepreneurs qui ne perdent plus jamais un contact.</p>
          <div className="mt-8">
            <Link to="/configurateur" className="kt-btn-gold" data-testid="final-cta-order">Configurer ma carte <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
