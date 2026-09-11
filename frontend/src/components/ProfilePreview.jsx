import { motion } from "framer-motion";
import {
  Phone, Mail, Download, Globe, Instagram, Linkedin, Calendar,
  MessageCircle, Youtube, Music2, Facebook, Twitter, ArrowUpRight, User
} from "lucide-react";

/* Thèmes */
const themes = {
  onyx:     { bg: "#0B0F17", surface: "#131926", accent: "#D4AF37", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)", isDark: true },
  ivory:    { bg: "#F7F3EC", surface: "#FFFFFF", accent: "#B8860B", text: "#1F1B16", subtle: "#6B5F4E", border: "rgba(31,27,22,0.10)", isDark: false },
  midnight: { bg: "#0F172A", surface: "#0B1226", accent: "#10B981", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)", isDark: true },
  rose:     { bg: "#F5E6DE", surface: "#FFFFFF", accent: "#8B3A2E", text: "#2A1810", subtle: "#7A5A50", border: "rgba(42,24,16,0.08)", isDark: false },
};

const socialColors = {
  linkedin: "#0A66C2", instagram: "#E4405F", facebook: "#1877F2", whatsapp: "#25D366",
  tiktok: "#000000", youtube: "#FF0000", twitter: "#1DA1F2", calendly: "#006BFF", website: "#4A5568",
};

const socialMeta = [
  { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
  { key: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
  { key: "tiktok", icon: Music2, label: "TikTok" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
  { key: "twitter", icon: Twitter, label: "Twitter" },
  { key: "calendly", icon: Calendar, label: "Prendre RDV" },
  { key: "website", icon: Globe, label: "Site web" },
];

const socialsFilled = (links) => socialMeta.filter((m) => links?.[m.key]);

/* ============================================================
   LAYOUT 1 — HERO : photo edge-to-edge + name overlay
   Style éditorial magazine — inspiré de la ref
   ============================================================ */
function LayoutHero({ profile, t, onAction }) {
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";
  const heroImg = profile.hero_photo_url || profile.avatar_url;
  const socials = socialsFilled(profile.links);

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      {/* Photo plein cadre 4:5 */}
      <div className="relative w-full aspect-[4/5] overflow-hidden" style={{ background: t.surface }}>
        {heroImg ? (
          <img src={heroImg} alt="" className="w-full h-full object-cover" onError={(e) => (e.target.style.display = "none")} />
        ) : (
          <div className="w-full h-full grid place-items-center font-display font-black" style={{ background: `linear-gradient(135deg, ${t.surface}, ${t.accent}22)`, color: t.accent, fontSize: 120 }}>{initials}</div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.75) 100%)" }} />
        <div className="absolute left-0 right-0 bottom-0 p-6 text-white">
          <h1 className="font-display font-black leading-[0.9] tracking-tight" style={{ fontSize: 42 }}>
            {(profile.first_name || "PRÉNOM").toUpperCase()}<br />
            {(profile.last_name || "NOM").toUpperCase()}
          </h1>
          <p className="mt-2 text-sm font-medium opacity-90">{profile.job_title || "Votre poste"}</p>
          {profile.company && (
            <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur border border-white/30">
              {profile.logo_url && <img src={profile.logo_url} alt="" className="w-5 h-5 rounded object-contain bg-white/90 p-0.5" />}
              <span className="text-xs font-semibold">{profile.company}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cercles boutons rapides qui débordent sur la photo */}
      <div className="flex justify-center gap-3 -mt-7 relative z-10 px-6 mb-6">
        {profile.phone && <QuickBtn href={`tel:${profile.phone}`} icon={Phone} color={t.accent} tk="phone" />}
        {profile.email && <QuickBtn href={`mailto:${profile.email}`} icon={Mail} color={t.accent} tk="mail" />}
        {profile.links?.whatsapp && <QuickBtn href={profile.links.whatsapp} icon={MessageCircle} color={socialColors.whatsapp} tk="wa" />}
        {profile.links?.instagram && <QuickBtn href={profile.links.instagram} icon={Instagram} color={socialColors.instagram} tk="ig" />}
        {profile.links?.linkedin && <QuickBtn href={profile.links.linkedin} icon={Linkedin} color={socialColors.linkedin} tk="in" />}
      </div>

      {(profile.bio || profile.tagline) && (
        <div className="mx-5 mb-5 p-5 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <p className="eyebrow mb-2" style={{ color: t.accent }}>À propos</p>
          <p className="text-sm leading-relaxed" style={{ color: t.text }}>{profile.bio || profile.tagline}</p>
        </div>
      )}

      <div className="px-5 mb-6">
        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact"
                className="w-full py-4 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition"
                style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 10px 30px -12px ${t.accent}80` }}>
          <Download size={16} /> Ajouter à mes contacts
        </button>
      </div>

      {socials.length > 0 && (
        <div className="px-5 mb-6 space-y-2">
          <p className="eyebrow" style={{ color: t.accent }}>Retrouvez-moi</p>
          {socials.map((s) => (
            <a key={s.key} href={profile.links[s.key]} target="_blank" rel="noopener" data-testid={`profile-social-${s.key}`}
               className="flex items-center gap-3 p-3 rounded-2xl transition hover:scale-[1.01]"
               style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="w-10 h-10 rounded-full grid place-items-center flex-shrink-0" style={{ background: socialColors[s.key] || t.accent, color: "#FFF" }}><s.icon size={18} /></div>
              <p className="flex-1 text-sm font-semibold" style={{ color: t.text }}>{s.label}</p>
              <ArrowUpRight size={16} style={{ color: t.subtle }} />
            </a>
          ))}
        </div>
      )}
      <Footer t={t} />
    </div>
  );
}

/* ============================================================
   LAYOUT 2 — CARD : format carte de visite premium
   Photo circulaire + info sur fond doré/coloré + boutons compacts
   Ambiance carton d'invitation
   ============================================================ */
function LayoutCard({ profile, t, onAction }) {
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";
  const avatar = profile.avatar_url || profile.hero_photo_url;
  const socials = socialsFilled(profile.links);

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: `linear-gradient(160deg, ${t.accent}18 0%, ${t.bg} 40%)` }}>
      <div className="px-6 pt-12 pb-8">
        {/* Grande carte avec bordure dorée */}
        <div className="relative rounded-3xl p-8 text-center overflow-hidden"
             style={{ background: t.surface, border: `2px solid ${t.accent}`, boxShadow: `0 20px 60px -20px ${t.accent}40` }}>
          {/* Filigrane initiales en fond */}
          <div className="absolute inset-0 grid place-items-center opacity-[0.04] pointer-events-none">
            <span className="font-display font-black" style={{ fontSize: 240, color: t.accent }}>{initials}</span>
          </div>
          {/* Ornement doré */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full" style={{ background: t.accent }} />

          <div className="relative">
            <div className="mx-auto w-24 h-24 rounded-full overflow-hidden grid place-items-center font-display font-bold text-3xl"
                 style={{ background: t.surface, color: t.accent, border: `3px solid ${t.accent}` }}>
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            {profile.company && profile.logo_url && (
              <img src={profile.logo_url} alt="" className="mx-auto mt-3 w-8 h-8 rounded object-contain" />
            )}
            <p className="eyebrow mt-4" style={{ color: t.accent }}>{profile.company || "KalliTag"}</p>
            <h1 className="mt-2 font-display font-bold" style={{ color: t.text, fontSize: 26, letterSpacing: "-0.02em" }}>
              {profile.first_name || "Prénom"} {profile.last_name || "Nom"}
            </h1>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm" style={{ color: t.subtle }}>
              <span className="w-6 h-px" style={{ background: t.accent }} />
              <span>{profile.job_title || "Votre poste"}</span>
              <span className="w-6 h-px" style={{ background: t.accent }} />
            </div>
            {(profile.bio || profile.tagline) && (
              <p className="mt-4 text-sm italic leading-relaxed" style={{ color: t.subtle }}>« {profile.bio || profile.tagline} »</p>
            )}
            {(profile.phone || profile.email) && (
              <div className="mt-5 space-y-1.5 text-sm" style={{ color: t.text }}>
                {profile.phone && <a href={`tel:${profile.phone}`} className="block hover:underline">{profile.phone}</a>}
                {profile.email && <a href={`mailto:${profile.email}`} className="block hover:underline">{profile.email}</a>}
              </div>
            )}
          </div>
        </div>

        {/* Boutons ronds sous la carte */}
        {socials.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {socials.slice(0, 8).map((s) => (
              <a key={s.key} href={profile.links[s.key]} target="_blank" rel="noopener" data-testid={`profile-social-${s.key}`}
                 title={s.label}
                 className="w-12 h-12 rounded-full grid place-items-center shadow-md transition hover:scale-110"
                 style={{ background: socialColors[s.key] || t.accent, color: "#FFF" }}>
                <s.icon size={18} />
              </a>
            ))}
          </div>
        )}

        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact"
                className="mt-6 w-full py-3.5 rounded-full font-semibold text-sm inline-flex items-center justify-center gap-2 transition"
                style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 10px 30px -12px ${t.accent}80` }}>
          <Download size={16} /> Ajouter à mes contacts
        </button>
      </div>
      <Footer t={t} />
    </div>
  );
}

/* ============================================================
   LAYOUT 3 — LIST : style Linktree, mobile-first
   Petit avatar top + liste verticale de gros boutons colorés pleine largeur
   ============================================================ */
function LayoutList({ profile, t, onAction }) {
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";
  const avatar = profile.avatar_url || profile.hero_photo_url;
  const socials = socialsFilled(profile.links);

  const listButtons = [];
  if (profile.phone) listButtons.push({ icon: Phone, label: "Appeler", href: `tel:${profile.phone}`, color: t.accent });
  if (profile.email) listButtons.push({ icon: Mail, label: "Envoyer un email", href: `mailto:${profile.email}`, color: t.accent });
  socials.forEach((s) => {
    listButtons.push({ icon: s.icon, label: s.label, href: profile.links[s.key], color: socialColors[s.key] || t.accent, key: s.key });
  });

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      {/* Header compact centré */}
      <div className="pt-10 pb-5 px-6 text-center">
        <div className="mx-auto w-20 h-20 rounded-full overflow-hidden grid place-items-center font-display font-bold text-2xl"
             style={{ background: t.surface, color: t.accent, border: `2px solid ${t.accent}` }}>
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initials}
        </div>
        <h1 className="mt-4 font-display font-bold text-xl" style={{ color: t.text }}>
          {profile.first_name || "Prénom"} {profile.last_name || "Nom"}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: t.subtle }}>
          @{(profile.first_name || "prenom").toLowerCase()}{(profile.last_name || "nom").toLowerCase()}
        </p>
        {profile.company && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ color: t.subtle }}>
            {profile.logo_url && <img src={profile.logo_url} alt="" className="w-4 h-4 rounded object-contain" />}
            <span>{profile.job_title ? `${profile.job_title} · ` : ""}{profile.company}</span>
          </div>
        )}
        {(profile.bio || profile.tagline) && (
          <p className="mt-4 text-sm max-w-xs mx-auto" style={{ color: t.text }}>
            {profile.bio || profile.tagline}
          </p>
        )}
      </div>

      {/* Liste verticale de gros boutons pleins */}
      <div className="px-5 pb-6 space-y-2.5">
        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact"
                className="w-full py-4 rounded-2xl font-bold text-sm inline-flex items-center justify-center gap-2 transition hover:scale-[1.02]"
                style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 8px 24px -8px ${t.accent}60` }}>
          <Download size={16} /> Ajouter à mes contacts
        </button>
        {listButtons.map((b, i) => (
          <a key={i} href={b.href} target={b.href.startsWith("http") ? "_blank" : undefined} rel="noopener"
             data-testid={`profile-list-${b.key || "action"}-${i}`}
             className="w-full py-4 rounded-2xl font-semibold text-sm inline-flex items-center justify-center gap-2.5 transition hover:scale-[1.02]"
             style={{ background: t.surface, color: t.text, border: `1.5px solid ${t.border}` }}>
            <b.icon size={17} style={{ color: b.color }} />
            <span>{b.label}</span>
          </a>
        ))}
      </div>
      <Footer t={t} />
    </div>
  );
}

/* Composants utilitaires */
const QuickBtn = ({ href, icon: Icon, color, tk }) => (
  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener"
     data-testid={`profile-quick-${tk}`}
     className="w-14 h-14 rounded-full grid place-items-center shadow-lg transition hover:scale-110"
     style={{ background: color, color: "#FFFFFF" }}>
    <Icon size={22} />
  </a>
);

const Footer = ({ t }) => (
  <div className="py-5 text-center text-[10px]" style={{ color: t.subtle }}>
    Propulsé par <span style={{ color: t.accent }}>KalliTag</span>
  </div>
);

/* Composant principal */
export default function ProfilePreview({ profile, framed = true, onAction }) {
  const t = themes[profile.theme_id] || themes.onyx;
  const layout = profile.layout_id || "hero";

  const inner =
    layout === "card" ? <LayoutCard profile={profile} t={t} onAction={onAction} /> :
    layout === "list" ? <LayoutList profile={profile} t={t} onAction={onAction} /> :
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
