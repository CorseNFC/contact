import { motion } from "framer-motion";
import {
  Phone, Mail, Download, Globe, Instagram, Linkedin, Calendar,
  MessageCircle, Youtube, Music2, Facebook, Twitter, MapPin, User
} from "lucide-react";

/* ------- Thèmes profil ------- */
const themes = {
  onyx:     { bg: "#0B0F17", surface: "#131926", accent: "#D4AF37", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)", isDark: true },
  ivory:    { bg: "#F7F3EC", surface: "#FFFFFF", accent: "#B8860B", text: "#1F1B16", subtle: "#6B5F4E", border: "rgba(31,27,22,0.10)", isDark: false },
  midnight: { bg: "#0F172A", surface: "#0B1226", accent: "#10B981", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)", isDark: true },
  rose:     { bg: "#F5E6DE", surface: "#FFFFFF", accent: "#8B3A2E", text: "#2A1810", subtle: "#7A5A50", border: "rgba(42,24,16,0.08)", isDark: false },
};

/* Couleurs officielles des réseaux (icônes) */
const socialColors = {
  linkedin:  "#0A66C2",
  instagram: "#E4405F",
  facebook:  "#1877F2",
  whatsapp:  "#25D366",
  tiktok:    "#000000",
  youtube:   "#FF0000",
  twitter:   "#1DA1F2",
  calendly:  "#006BFF",
  website:   "#4A5568",
};

const socialMeta = [
  { key: "linkedin",  icon: Linkedin,       label: "LinkedIn",   cta: "Voir mon profil" },
  { key: "instagram", icon: Instagram,      label: "Instagram",  cta: "Suivez-moi" },
  { key: "facebook",  icon: Facebook,       label: "Facebook",   cta: "Suivez-moi" },
  { key: "whatsapp",  icon: MessageCircle,  label: "WhatsApp",   cta: "Discutons" },
  { key: "tiktok",    icon: Music2,         label: "TikTok",     cta: "Suivez-moi" },
  { key: "youtube",   icon: Youtube,        label: "YouTube",    cta: "Abonnez-vous" },
  { key: "twitter",   icon: Twitter,        label: "Twitter",    cta: "Suivez-moi" },
  { key: "calendly",  icon: Calendar,       label: "Rendez-vous",cta: "Réserver" },
  { key: "website",   icon: Globe,          label: "Site web",   cta: "Visiter" },
];

/* Boutons ronds d'action rapide en haut */
const quickActions = (profile, t) => {
  const a = [];
  if (profile.phone)          a.push({ key: "call",  icon: Phone,         href: `tel:${profile.phone}`,           color: t.accent });
  if (profile.email)          a.push({ key: "mail",  icon: Mail,          href: `mailto:${profile.email}`,        color: t.accent });
  const l = profile.links || {};
  if (l.whatsapp)             a.push({ key: "wa",    icon: MessageCircle, href: l.whatsapp,                       color: socialColors.whatsapp });
  if (l.instagram)            a.push({ key: "ig",    icon: Instagram,     href: l.instagram,                      color: socialColors.instagram });
  if (l.linkedin)             a.push({ key: "in",    icon: Linkedin,      href: l.linkedin,                       color: socialColors.linkedin });
  return a;
};

const socialsFilled = (links) => socialMeta.filter((m) => links?.[m.key]);

/* ============================================================
   LAYOUT 1 — HERO (inspiré de la ref, format portrait premium)
   ============================================================ */
function LayoutHero({ profile, t, onAction }) {
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";
  const actions = quickActions(profile, t);
  const socials = socialsFilled(profile.links);
  const heroImg = profile.hero_photo_url || profile.avatar_url;

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      {/* Hero photo edge-to-edge */}
      <div className="relative w-full aspect-[4/5] overflow-hidden" style={{ background: t.surface }}>
        {heroImg ? (
          <img src={heroImg} alt="" className="w-full h-full object-cover" onError={(e) => (e.target.style.display = "none")} />
        ) : (
          <div className="w-full h-full grid place-items-center font-display font-bold text-8xl" style={{ background: t.surface, color: t.accent }}>{initials}</div>
        )}
        {/* Dégradé bas pour lisibilité */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)" }} />
        {/* Nom + poste en overlay */}
        <div className="absolute left-0 right-0 bottom-0 p-6 text-white">
          <h1 className="font-display font-black leading-[0.9] tracking-tight" style={{ fontSize: "clamp(30px, 8vw, 42px)" }}>
            {(profile.first_name || "PRÉNOM").toUpperCase()}<br />
            {(profile.last_name || "NOM").toUpperCase()}
          </h1>
          <p className="mt-2 text-sm font-medium opacity-90">
            {profile.job_title || "Votre poste"}
          </p>
          {profile.company && (
            <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
              {profile.logo_url && <img src={profile.logo_url} alt="" className="w-5 h-5 rounded object-contain bg-white/90 p-0.5" />}
              <span className="text-xs font-medium">{profile.company}</span>
            </div>
          )}
        </div>
      </div>

      {/* Boutons ronds actions rapides */}
      {actions.length > 0 && (
        <div className="flex justify-center gap-3 -mt-6 relative z-10 px-6">
          {actions.slice(0, 5).map((a) => (
            <a key={a.key} href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noopener"
               data-testid={`profile-quick-${a.key}`}
               className="w-12 h-12 rounded-full grid place-items-center shadow-lg transition hover:scale-110"
               style={{ background: a.color, color: "#FFFFFF" }}>
              <a.icon size={20} />
            </a>
          ))}
        </div>
      )}

      {/* Bio / About Me */}
      {(profile.bio || profile.tagline) && (
        <div className="mx-5 mt-6 p-5 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <p className="eyebrow mb-2" style={{ color: t.accent }}>À propos</p>
          <p className="text-sm leading-relaxed" style={{ color: t.text }}>
            {profile.bio || profile.tagline}
          </p>
        </div>
      )}

      {/* Bouton principal Add to Contact */}
      <div className="px-5 mt-5">
        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact"
                className="w-full py-3.5 rounded-full font-semibold text-sm inline-flex items-center justify-center gap-2 transition"
                style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 10px 30px -12px ${t.accent}80` }}>
          <Download size={16} /> Ajouter à mes contacts
        </button>
      </div>

      {/* Cartes réseaux détaillées */}
      {socials.length > 0 && (
        <div className="px-5 mt-6 space-y-2">
          <p className="eyebrow" style={{ color: t.accent }}>Retrouvez-moi</p>
          {socials.map((s) => (
            <a key={s.key} href={profile.links[s.key]} target="_blank" rel="noopener"
               data-testid={`profile-social-${s.key}`}
               className="flex items-center gap-3 p-3 rounded-2xl transition hover:scale-[1.01]"
               style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="w-10 h-10 rounded-full grid place-items-center flex-shrink-0" style={{ background: socialColors[s.key] || t.accent, color: "#FFFFFF" }}>
                <s.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: t.text }}>{s.label}</p>
                <p className="text-[11px]" style={{ color: t.subtle }}>{s.cta}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 py-5 text-center text-[10px]" style={{ color: t.subtle }}>
        Propulsé par <span style={{ color: t.accent }}>KalliTag</span>
      </div>
    </div>
  );
}

/* ============================================================
   LAYOUT 2 — CLASSIC (élégant, portrait cercle + infos)
   ============================================================ */
function LayoutClassic({ profile, t, onAction }) {
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";
  const actions = quickActions(profile, t);
  const socials = socialsFilled(profile.links);
  const avatar = profile.hero_photo_url || profile.avatar_url;

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      <div className="relative pt-10 pb-6 px-6 text-center">
        <div className="absolute inset-x-0 top-0 h-40 opacity-40" style={{ background: `radial-gradient(circle at 50% 0%, ${t.accent}30, transparent 70%)` }} />
        <motion.div key={avatar + initials} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="relative mx-auto w-28 h-28 rounded-full grid place-items-center font-display font-bold text-4xl overflow-hidden"
                    style={{ background: t.surface, color: t.accent, border: `3px solid ${t.accent}` }}>
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initials}
        </motion.div>
        <h1 className="relative mt-5 font-display font-bold leading-tight" style={{ fontSize: "clamp(20px, 5vw, 26px)", color: t.text }}>
          {profile.first_name || "Prénom"} {profile.last_name || "Nom"}
        </h1>
        <p className="relative text-sm mt-1" style={{ color: t.subtle }}>
          {profile.job_title || "Votre poste"}
        </p>
        {profile.company && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            {profile.logo_url && <img src={profile.logo_url} alt="" className="w-4 h-4 rounded object-contain" />}
            <span className="text-xs font-medium" style={{ color: t.text }}>{profile.company}</span>
          </div>
        )}
        {(profile.bio || profile.tagline) && (
          <p className="relative mt-4 text-sm max-w-xs mx-auto leading-relaxed" style={{ color: t.subtle }}>
            {profile.bio || profile.tagline}
          </p>
        )}
      </div>

      {/* Boutons ronds */}
      {actions.length > 0 && (
        <div className="flex justify-center gap-3 px-6">
          {actions.slice(0, 5).map((a) => (
            <a key={a.key} href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noopener"
               data-testid={`profile-quick-${a.key}`}
               className="w-12 h-12 rounded-full grid place-items-center shadow-md transition hover:scale-110"
               style={{ background: a.color, color: "#FFFFFF" }}>
              <a.icon size={20} />
            </a>
          ))}
        </div>
      )}

      {/* CTA vCard */}
      <div className="px-5 mt-6">
        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact"
                className="w-full py-3.5 rounded-full font-semibold text-sm inline-flex items-center justify-center gap-2 transition"
                style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 10px 30px -12px ${t.accent}80` }}>
          <Download size={16} /> Ajouter à mes contacts
        </button>
      </div>

      {/* Cartes réseaux */}
      {socials.length > 0 && (
        <div className="px-5 mt-6 space-y-2">
          <p className="eyebrow" style={{ color: t.accent }}>Retrouvez-moi</p>
          {socials.map((s) => (
            <a key={s.key} href={profile.links[s.key]} target="_blank" rel="noopener"
               data-testid={`profile-social-${s.key}`}
               className="flex items-center gap-3 p-3 rounded-2xl transition hover:scale-[1.01]"
               style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="w-10 h-10 rounded-full grid place-items-center flex-shrink-0" style={{ background: socialColors[s.key] || t.accent, color: "#FFFFFF" }}>
                <s.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: t.text }}>{s.label}</p>
                <p className="text-[11px]" style={{ color: t.subtle }}>{s.cta}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 py-5 text-center text-[10px]" style={{ color: t.subtle }}>
        Propulsé par <span style={{ color: t.accent }}>KalliTag</span>
      </div>
    </div>
  );
}

/* ============================================================
   LAYOUT 3 — MINIMAL (l'ancien, épuré, format grille actions)
   ============================================================ */
function LayoutMinimal({ profile, t, onAction }) {
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";
  const l = profile.links || {};
  const actionsGrid = [];
  if (profile.phone) actionsGrid.push({ key: "call", icon: Phone, label: "Appeler", href: `tel:${profile.phone}` });
  if (profile.email) actionsGrid.push({ key: "mail", icon: Mail, label: "Écrire", href: `mailto:${profile.email}` });
  if (l.linkedin) actionsGrid.push({ key: "linkedin", icon: Linkedin, label: "LinkedIn", href: l.linkedin });
  if (l.instagram) actionsGrid.push({ key: "instagram", icon: Instagram, label: "Instagram", href: l.instagram });
  if (l.whatsapp) actionsGrid.push({ key: "whatsapp", icon: MessageCircle, label: "WhatsApp", href: l.whatsapp });
  if (l.calendly) actionsGrid.push({ key: "calendly", icon: Calendar, label: "RDV", href: l.calendly });
  if (l.website) actionsGrid.push({ key: "website", icon: Globe, label: "Site", href: l.website });

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      <div className="relative pt-8 pb-6 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 50% 0%, ${t.accent}22, transparent 60%)` }} />
        <motion.div key={profile.avatar_url + initials} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="relative mx-auto w-24 h-24 rounded-full grid place-items-center font-display font-bold text-3xl overflow-hidden"
                    style={{ background: t.surface, color: t.accent, border: `2px solid ${t.accent}` }}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
        </motion.div>
        <h1 className="relative mt-4 font-display font-bold text-xl leading-tight" style={{ color: t.text }}>
          {profile.first_name || "Prénom"} {profile.last_name || "Nom"}
        </h1>
        <p className="relative text-sm mt-1" style={{ color: t.subtle }}>
          {profile.job_title || "Votre poste"}{profile.company ? ` · ${profile.company}` : ""}
        </p>
        {profile.tagline && (
          <p className="relative text-xs mt-3 max-w-xs mx-auto italic" style={{ color: t.subtle }}>« {profile.tagline} »</p>
        )}
      </div>
      <div className="px-5">
        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact"
                className="w-full py-3.5 rounded-full font-semibold text-sm inline-flex items-center justify-center gap-2 transition"
                style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 10px 30px -12px ${t.accent}80` }}>
          <Download size={16} /> Ajouter à mes contacts
        </button>
      </div>
      <div className="px-5 mt-4 pb-6 grid grid-cols-4 gap-2">
        {actionsGrid.map((a) => (
          <a key={a.key} href={a.href} target={a.href?.startsWith("http") ? "_blank" : undefined} rel="noopener"
             data-testid={`profile-action-${a.key}`}
             className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition hover:scale-[1.02]"
             style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <a.icon size={18} style={{ color: t.accent }} />
            <span className="text-[10px] font-medium" style={{ color: t.text }}>{a.label}</span>
          </a>
        ))}
      </div>
      <div className="mt-auto py-4 text-center text-[10px]" style={{ color: t.subtle }}>
        Propulsé par <span style={{ color: t.accent }}>KalliTag</span>
      </div>
    </div>
  );
}

/* ============================================================
   Composant principal — sélectionne le layout
   ============================================================ */
export default function ProfilePreview({ profile, framed = true, onAction }) {
  const t = themes[profile.theme_id] || themes.onyx;
  const layout = profile.layout_id || "hero";

  const inner =
    layout === "classic" ? <LayoutClassic profile={profile} t={t} onAction={onAction} /> :
    layout === "minimal" ? <LayoutMinimal profile={profile} t={t} onAction={onAction} /> :
    <LayoutHero profile={profile} t={t} onAction={onAction} />;

  if (!framed) return <div className="w-full min-h-screen">{inner}</div>;

  return (
    <div className="relative mx-auto" style={{ width: 300 }} data-testid="profile-preview-frame">
      <div className="rounded-[42px] p-2 shadow-2xl" style={{ background: "#0A0A0A", boxShadow: "0 30px 80px -30px rgba(184,134,11,0.35), 0 20px 50px -20px rgba(0,0,0,0.6)" }}>
        <div className="rounded-[34px] overflow-hidden relative" style={{ width: "100%", height: 600 }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-black z-10" />
          {inner}
        </div>
      </div>
    </div>
  );
}
