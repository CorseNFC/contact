import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Mic, Sparkles, ScanLine, IdCard, Zap, ArrowRight, ShieldCheck,
  Radar, Users, Rocket, ExternalLink, Play, Brain, Building2, Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const LC_APP_URL = "https://leadcapture.kallitag.fr";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Lecture NFC instantanée",
    desc: "Approchez votre téléphone d'une carte KalliTag ou d'un badge partenaire — la fiche prospect apparaît en moins d'une seconde. Zéro saisie, zéro carte perdue.",
    accent: "from-amber-400 to-amber-600",
  },
  {
    icon: IdCard,
    title: "OCR carte de visite",
    desc: "Prenez une photo d'une carte papier reçue sur un salon : l'IA extrait nom, société, poste, email et téléphone dans le bon champ. Le carton peut partir à la poubelle.",
    accent: "from-emerald-400 to-emerald-600",
  },
  {
    icon: Mic,
    title: "Notes vocales & débrief",
    desc: "Dictez vos impressions à chaud pendant que vous marchez au stand suivant. Enregistrement direct dans le fichier prospect, transcription automatique.",
    accent: "from-fuchsia-400 to-pink-600",
  },
  {
    icon: Brain,
    title: "Synthèse IA & priorisation",
    desc: "L'IA lit vos notes, tag automatiquement les leads chauds/tièdes/froids et vous rédige un mail de relance personnalisé. Vous n'écrivez plus jamais de « suite au salon ».",
    accent: "from-indigo-400 to-purple-600",
  },
  {
    icon: Radar,
    title: "Salon mode — offline first",
    desc: "PWA installable sur le home screen, fonctionne même sans réseau au fond du hall. Synchronisation dès que la 4G revient.",
    accent: "from-cyan-400 to-blue-600",
  },
  {
    icon: Users,
    title: "Multi-commerciaux & rôles",
    desc: "Invitez votre équipe salon, chaque commercial voit ses propres leads, le manager consolide tout. Idéal pour les stands avec plusieurs vendeurs.",
    accent: "from-rose-400 to-red-600",
  },
];

const FLOW = [
  { step: "01", title: "Le prospect s'approche", body: "Il scanne votre badge NFC KalliTag ou vous tend sa carte papier." },
  { step: "02", title: "Vous capturez en 1 geste", body: "Tap NFC · photo de la carte · ou saisie manuelle si besoin. 5 secondes chrono." },
  { step: "03", title: "Vous débriefez à la voix", body: "« Intéressé par le pack Pro, budget 5k, à relancer semaine 10 ». Terminé." },
  { step: "04", title: "L'IA fait le travail", body: "Priorisation, synthèse, mail de relance rédigé, export CRM ou CSV." },
];

const KILLER_STATS = [
  { value: "80%", label: "des cartes papier récoltées sur un salon ne sont jamais rappelées" },
  { value: "5s",  label: "pour capturer un lead complet vs 2 min en saisie manuelle" },
  { value: "3×",  label: "plus de leads qualifiés vs le trio carnet + photo + Excel" },
];

export default function LeadCapture() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />

      {/* HERO */}
      <section className="pt-32 pb-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden" data-testid="lc-hero">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-300/25 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-white/60 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 shadow-sm">
              <Zap size={11} /> Kallitag Lead Capture — PWA salon
            </div>
            <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Capturez chaque prospect.<br />
              <span className="gold-text">Zéro carte perdue.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#4A3F2E] leading-relaxed max-w-2xl mx-auto">
              La PWA des commerciaux sur salons. Scan NFC, OCR de cartes papier, notes vocales,
              synthèses IA — tout ce qu'il faut pour ne plus jamais rentrer avec 80 cartes que personne ne rappellera.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={LC_APP_URL}
                target="_blank" rel="noreferrer"
                data-testid="lc-hero-open-app"
                className="kt-btn-gold inline-flex items-center gap-2"
              >
                Ouvrir l'application <ExternalLink size={15} />
              </a>
              <Link to="/tarifs" data-testid="lc-hero-see-plans" className="kt-btn-ghost inline-flex items-center gap-2">
                Voir les tarifs <ArrowRight size={15} />
              </Link>
            </div>

            <p className="mt-4 text-[11px] text-[#8B7F6E]">
              Connexion par code à usage unique · Votre email KalliTag · Aucun mot de passe à retenir
            </p>
          </motion.div>
        </div>
      </section>

      {/* KILLER STATS */}
      <section className="pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="lc-stats">
          {KILLER_STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-white border border-[#1F1B16]/8 p-6 shadow-sm hover:shadow-md transition"
              data-testid={`lc-stat-${i}`}
            >
              <p className="font-display font-black text-5xl gold-text">{s.value}</p>
              <p className="mt-2 text-sm text-[#4A3F2E] leading-relaxed">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="eyebrow">Ce que fait l'application</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Un couteau suisse pour vos <span className="gold-text">salons pro</span>
            </h2>
            <p className="mt-3 text-sm text-[#6B5F4E]">
              Une seule app installable sur iPhone et Android, pensée pour le rythme d'un stand : rapide, offline, guidée à la voix.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="lc-features">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-white border border-[#1F1B16]/8 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                  data-testid={`lc-feature-${i}`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.accent} grid place-items-center text-white mb-4 shadow-md`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-display font-bold text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#4A3F2E] leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FLOW / HOW IT WORKS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/60 border-y border-[#1F1B16]/6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="eyebrow">Comment ça marche</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight">
              De la rencontre à la <span className="gold-text">relance</span>, en 4 gestes
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4" data-testid="lc-flow">
            {FLOW.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl bg-[#FAF7F0] border border-[#1F1B16]/8 p-5"
                data-testid={`lc-flow-${i}`}
              >
                <p className="font-display font-black text-3xl text-amber-500/40">{f.step}</p>
                <h3 className="mt-2 font-display font-bold text-base">{f.title}</h3>
                <p className="mt-2 text-xs text-[#6B5F4E] leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA APP + PRICING */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl bg-gradient-to-br from-[#1F1B16] to-[#3A2E1F] text-white p-8 shadow-xl relative overflow-hidden"
            data-testid="lc-cta-app"
          >
            <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 grid place-items-center text-slate-950 shadow-lg mb-4">
                <Rocket size={22} />
              </div>
              <h3 className="font-display font-bold text-2xl">Déjà abonné ? Direct dans l'app.</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                Connectez-vous avec votre email KalliTag — un code de 6 chiffres arrive dans votre boîte, valable 10 minutes. Aucun mot de passe.
              </p>
              <a
                href={LC_APP_URL}
                target="_blank" rel="noreferrer"
                data-testid="lc-cta-open-app"
                className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8B6508] font-bold text-sm shadow-lg hover:shadow-2xl transition active:scale-[0.98]"
              >
                Ouvrir Lead Capture <ExternalLink size={15} />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="rounded-3xl bg-white border border-[#1F1B16]/10 p-8 shadow-md"
            data-testid="lc-cta-plans"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 grid place-items-center text-emerald-600 mb-4">
              <Building2 size={22} />
            </div>
            <h3 className="font-display font-bold text-2xl">Pas encore abonné ?</h3>
            <p className="mt-2 text-sm text-[#4A3F2E] leading-relaxed">
              À partir de <span className="font-bold text-amber-600">19,90 €/mois</span>. Résiliable en 1 clic. Satisfait ou remboursé 14 jours.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-[#1F1B16]">
              <li className="flex items-start gap-2.5"><Check size={16} className="text-emerald-600 mt-0.5" /> Lead Capture illimité</li>
              <li className="flex items-start gap-2.5"><Check size={16} className="text-emerald-600 mt-0.5" /> Notes vocales + synthèses IA</li>
              <li className="flex items-start gap-2.5"><Check size={16} className="text-emerald-600 mt-0.5" /> Une carte NFC KalliTag Prestige offerte</li>
            </ul>
            <Link to="/tarifs" data-testid="lc-cta-see-plans" className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full border-2 border-[#1F1B16] font-bold text-sm hover:bg-[#1F1B16] hover:text-white transition active:scale-[0.98]">
              Voir les formules <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>

        <div className="max-w-3xl mx-auto mt-12 flex flex-wrap justify-center gap-6 text-xs text-[#6B5F4E]">
          <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-amber-500" /> RGPD · vos leads restent chez vous</div>
          <div className="flex items-center gap-1.5"><Sparkles size={14} className="text-amber-500" /> IA hébergée en Europe</div>
          <div className="flex items-center gap-1.5"><Play size={14} className="text-amber-500" /> Installable sur iOS & Android</div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
