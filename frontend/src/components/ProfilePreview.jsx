import { motion } from "framer-motion";
import {
  Phone, Mail, Download, Globe, Instagram, Linkedin, Calendar, MessageCircle,
  Youtube, Music2, Facebook, Twitter, ArrowUpRight, Sparkles, MapPin, Zap
} from "lucide-react";

/* ========================================================================
   BIBLIOTHÈQUE DE THÈMES — 8 palettes
   ======================================================================== */
export const THEMES = {
  onyx:       { name: "Onyx",        bg: "#0B0F17", surface: "#131926", accent: "#D4AF37", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)", isDark: true,  vibe: "sobre & or" },
  ivory:      { name: "Ivoire",      bg: "#F7F3EC", surface: "#FFFFFF", accent: "#B8860B", text: "#1F1B16", subtle: "#6B5F4E", border: "rgba(31,27,22,0.10)",   isDark: false, vibe: "papeterie luxe" },
  midnight:   { name: "Midnight",    bg: "#0F172A", surface: "#0B1226", accent: "#10B981", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)", isDark: true,  vibe: "nuit émeraude" },
  rose:       { name: "Rose Nude",   bg: "#F5E6DE", surface: "#FFFFFF", accent: "#8B3A2E", text: "#2A1810", subtle: "#7A5A50", border: "rgba(42,24,16,0.08)",   isDark: false, vibe: "chaleureux terracotta" },
  neon:       { name: "Neon",        bg: "#0A0014", surface: "#1A0930", accent: "#00F0FF", text: "#F5F0FF", subtle: "#B39DDB", border: "rgba(0,240,255,0.20)",  isDark: true,  vibe: "cyberpunk électrique" },
  forest:     { name: "Forêt",       bg: "#0B1F14", surface: "#0F2A1D", accent: "#C9A66B", text: "#F5EED8", subtle: "#8FA891", border: "rgba(201,166,107,0.20)",isDark: true,  vibe: "artisan bois précieux" },
  champagne:  { name: "Champagne",   bg: "#FFF8E7", surface: "#FFFFFF", accent: "#8B6508", text: "#3D2E00", subtle: "#8B7A47", border: "rgba(139,101,8,0.12)",  isDark: false, vibe: "célébration doré" },
  monochrome: { name: "Mono",        bg: "#FFFFFF", surface: "#F5F5F5", accent: "#000000", text: "#000000", subtle: "#666666", border: "rgba(0,0,0,0.10)",     isDark: false, vibe: "brutaliste noir & blanc" },
};

/* Couleurs réseaux fixes */
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
const initialsOf = (p) => `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}`.toUpperCase() || "K";

/* ========================================================================
   BIBLIOTHÈQUE DE LAYOUTS — 6 mises en page radicalement différentes
   ======================================================================== */
export const LAYOUTS = [
  { id: "hero",     name: "Hero",       desc: "Photo plein cadre magazine" },
  { id: "card",     name: "Carte",      desc: "Carton d'invitation doré" },
  { id: "list",     name: "Liste",      desc: "Linktree mobile-first" },
  { id: "split",    name: "Split",      desc: "50/50 dynamique couleur" },
  { id: "gradient", name: "Gradient",   desc: "Immersif dégradé animé" },
  { id: "brutal",   name: "Brutalist",  desc: "Typo massive, bordures nettes" },
];

/* ============================================================
   1. HERO — photo edge-to-edge + name overlay
   ============================================================ */
function LayoutHero({ p, t, onAction }) {
  const heroImg = p.hero_photo_url || p.avatar_url;
  const socials = socialsFilled(p.links);
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      <div className="relative w-full aspect-[4/5] overflow-hidden" style={{ background: t.surface }}>
        {heroImg ? <img src={heroImg} alt="" className="w-full h-full object-cover" onError={(e) => (e.target.style.display = "none")} />
                 : <div className="w-full h-full grid place-items-center font-display font-black" style={{ background: `linear-gradient(135deg, ${t.surface}, ${t.accent}22)`, color: t.accent, fontSize: 120 }}>{initialsOf(p)}</div>}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.75) 100%)" }} />
        <div className="absolute left-0 right-0 bottom-0 p-6 text-white">
          <h1 className="font-display font-black leading-[0.9] tracking-tight" style={{ fontSize: 42 }}>{(p.first_name || "PRÉNOM").toUpperCase()}<br />{(p.last_name || "NOM").toUpperCase()}</h1>
          <p className="mt-2 text-sm font-medium opacity-90">{p.job_title || "Votre poste"}</p>
          {p.company && <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur border border-white/30">{p.logo_url && <img src={p.logo_url} alt="" className="w-5 h-5 rounded object-contain bg-white/90 p-0.5" />}<span className="text-xs font-semibold">{p.company}</span></div>}
        </div>
      </div>
      <QuickRow p={p} t={t} offset />
      {(p.bio || p.tagline) && <div className="mx-5 mb-5 p-5 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}><p className="eyebrow mb-2" style={{ color: t.accent }}>À propos</p><p className="text-sm leading-relaxed">{p.bio || p.tagline}</p></div>}
      <CTA t={t} onAction={onAction} />
      <SocialList socials={socials} p={p} t={t} />
      <Footer t={t} />
    </div>
  );
}

/* ============================================================
   2. CARD — cadre bordure dorée + filigrane initiales
   ============================================================ */
function LayoutCard({ p, t, onAction }) {
  const avatar = p.avatar_url || p.hero_photo_url;
  const socials = socialsFilled(p.links);
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: `linear-gradient(160deg, ${t.accent}18 0%, ${t.bg} 40%)`, color: t.text }}>
      <div className="px-6 pt-12 pb-8">
        <div className="relative rounded-3xl p-8 text-center overflow-hidden" style={{ background: t.surface, border: `2px solid ${t.accent}`, boxShadow: `0 20px 60px -20px ${t.accent}40` }}>
          <div className="absolute inset-0 grid place-items-center opacity-[0.04] pointer-events-none"><span className="font-display font-black" style={{ fontSize: 240, color: t.accent }}>{initialsOf(p)}</span></div>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full" style={{ background: t.accent }} />
          <div className="relative">
            <div className="mx-auto w-24 h-24 rounded-full overflow-hidden grid place-items-center font-display font-bold text-3xl" style={{ background: t.surface, color: t.accent, border: `3px solid ${t.accent}` }}>
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initialsOf(p)}
            </div>
            {p.company && p.logo_url && <img src={p.logo_url} alt="" className="mx-auto mt-3 w-8 h-8 rounded object-contain" />}
            <p className="eyebrow mt-4" style={{ color: t.accent }}>{p.company || "KalliTag"}</p>
            <h1 className="mt-2 font-display font-bold" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>{p.first_name || "Prénom"} {p.last_name || "Nom"}</h1>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm" style={{ color: t.subtle }}><span className="w-6 h-px" style={{ background: t.accent }} /><span>{p.job_title || "Votre poste"}</span><span className="w-6 h-px" style={{ background: t.accent }} /></div>
            {(p.bio || p.tagline) && <p className="mt-4 text-sm italic leading-relaxed" style={{ color: t.subtle }}>« {p.bio || p.tagline} »</p>}
            {(p.phone || p.email) && <div className="mt-5 space-y-1.5 text-sm">{p.phone && <a href={`tel:${p.phone}`} className="block hover:underline">{p.phone}</a>}{p.email && <a href={`mailto:${p.email}`} className="block hover:underline">{p.email}</a>}</div>}
          </div>
        </div>
        {socials.length > 0 && <div className="mt-6 flex flex-wrap justify-center gap-3">{socials.slice(0, 8).map((s) => (<a key={s.key} href={p.links[s.key]} target="_blank" rel="noopener" title={s.label} data-testid={`profile-social-${s.key}`} className="w-12 h-12 rounded-full grid place-items-center shadow-md transition hover:scale-110" style={{ background: socialColors[s.key] || t.accent, color: "#FFF" }}><s.icon size={18} /></a>))}</div>}
        <CTA t={t} onAction={onAction} tight />
      </div>
      <Footer t={t} />
    </div>
  );
}

/* ============================================================
   3. LIST — Linktree mobile-first
   ============================================================ */
function LayoutList({ p, t, onAction }) {
  const avatar = p.avatar_url || p.hero_photo_url;
  const socials = socialsFilled(p.links);
  const buttons = [];
  if (p.phone) buttons.push({ icon: Phone, label: "Appeler", href: `tel:${p.phone}`, color: t.accent, k: "phone" });
  if (p.email) buttons.push({ icon: Mail, label: "Envoyer un email", href: `mailto:${p.email}`, color: t.accent, k: "mail" });
  socials.forEach((s) => buttons.push({ icon: s.icon, label: s.label, href: p.links[s.key], color: socialColors[s.key] || t.accent, k: s.key }));
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      <div className="pt-10 pb-5 px-6 text-center">
        <div className="mx-auto w-20 h-20 rounded-full overflow-hidden grid place-items-center font-display font-bold text-2xl" style={{ background: t.surface, color: t.accent, border: `2px solid ${t.accent}` }}>{avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initialsOf(p)}</div>
        <h1 className="mt-4 font-display font-bold text-xl">{p.first_name || "Prénom"} {p.last_name || "Nom"}</h1>
        <p className="text-xs mt-0.5" style={{ color: t.subtle }}>@{(p.first_name || "prenom").toLowerCase()}{(p.last_name || "nom").toLowerCase()}</p>
        {p.company && <div className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ color: t.subtle }}>{p.logo_url && <img src={p.logo_url} alt="" className="w-4 h-4 rounded object-contain" />}<span>{p.job_title ? `${p.job_title} · ` : ""}{p.company}</span></div>}
        {(p.bio || p.tagline) && <p className="mt-4 text-sm max-w-xs mx-auto">{p.bio || p.tagline}</p>}
      </div>
      <div className="px-5 pb-6 space-y-2.5">
        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact" className="w-full py-4 rounded-2xl font-bold text-sm inline-flex items-center justify-center gap-2 transition hover:scale-[1.02]" style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 8px 24px -8px ${t.accent}60` }}><Download size={16} /> Ajouter à mes contacts</button>
        {buttons.map((b, i) => (<a key={i} href={b.href} target={b.href.startsWith("http") ? "_blank" : undefined} rel="noopener" data-testid={`profile-list-${b.k}-${i}`} className="w-full py-4 rounded-2xl font-semibold text-sm inline-flex items-center justify-center gap-2.5 transition hover:scale-[1.02]" style={{ background: t.surface, color: t.text, border: `1.5px solid ${t.border}` }}><b.icon size={17} style={{ color: b.color }} /><span>{b.label}</span></a>))}
      </div>
      <Footer t={t} />
    </div>
  );
}

/* ============================================================
   4. SPLIT — 50/50 : photo diagonale + info sur bloc coloré
   ============================================================ */
function LayoutSplit({ p, t, onAction }) {
  const heroImg = p.hero_photo_url || p.avatar_url;
  const socials = socialsFilled(p.links);
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      {/* Bloc photo diagonale top */}
      <div className="relative h-72 overflow-hidden" style={{ background: t.accent }}>
        {heroImg && <img src={heroImg} alt="" className="w-full h-full object-cover" style={{ clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)" }} />}
        {!heroImg && <div className="w-full h-full grid place-items-center font-display font-black" style={{ color: t.isDark ? t.bg : "#FFFFFF", fontSize: 100, clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)" }}>{initialsOf(p)}</div>}
      </div>
      {/* Nom en gros qui déborde */}
      <div className="relative px-6 -mt-6 z-10">
        <h1 className="font-display font-black leading-[0.9] tracking-tight" style={{ fontSize: 36, color: t.text }}>
          {p.first_name || "Prénom"}<br />
          <span style={{ color: t.accent }}>{p.last_name || "Nom"}</span>
        </h1>
        <p className="mt-2 text-sm font-medium" style={{ color: t.subtle }}>{p.job_title || "Votre poste"}{p.company ? ` @ ${p.company}` : ""}</p>
        {(p.bio || p.tagline) && <p className="mt-4 text-sm leading-relaxed" style={{ color: t.text }}>{p.bio || p.tagline}</p>}
      </div>
      {/* Grid boutons carrés */}
      <div className="px-6 mt-6 grid grid-cols-2 gap-2">
        {p.phone && <ActionSquare icon={Phone} label="Appeler" href={`tel:${p.phone}`} t={t} k="phone" />}
        {p.email && <ActionSquare icon={Mail} label="Email" href={`mailto:${p.email}`} t={t} k="mail" />}
        {socials.slice(0, 4).map((s) => <ActionSquare key={s.key} icon={s.icon} label={s.label} href={p.links[s.key]} t={t} color={socialColors[s.key]} k={s.key} />)}
      </div>
      <div className="px-6 mt-6"><CTA t={t} onAction={onAction} tight /></div>
      <Footer t={t} />
    </div>
  );
}

/* ============================================================
   5. GRADIENT — immersif dégradé, gros nom centré
   ============================================================ */
function LayoutGradient({ p, t, onAction }) {
  const socials = socialsFilled(p.links);
  const avatar = p.avatar_url;
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar relative" style={{ background: `linear-gradient(155deg, ${t.accent} 0%, ${t.surface} 40%, ${t.bg} 100%)`, color: t.isDark ? "#FFF" : t.text }}>
      {/* Blur orbs animés */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-40" style={{ background: t.accent }} />
      <div className="absolute top-1/2 -left-20 w-60 h-60 rounded-full blur-3xl opacity-30" style={{ background: t.accent }} />
      <div className="relative pt-16 pb-8 px-6 text-center">
        {avatar && <img src={avatar} alt="" className="mx-auto w-20 h-20 rounded-full object-cover border-2 mb-6" style={{ borderColor: "rgba(255,255,255,0.4)" }} />}
        <p className="eyebrow mb-3" style={{ color: t.isDark ? "#FFFFFFAA" : t.accent }}>{p.company || "KalliTag"}</p>
        <h1 className="font-display font-black leading-[0.85] tracking-tighter" style={{ fontSize: 46, color: t.isDark ? "#FFFFFF" : t.text }}>
          {p.first_name || "Prénom"}<br />{p.last_name || "Nom"}
        </h1>
        <p className="mt-4 text-sm font-medium" style={{ color: t.isDark ? "#FFFFFFCC" : t.subtle }}>{p.job_title || "Votre poste"}</p>
        {(p.bio || p.tagline) && <p className="mt-5 text-sm max-w-[16rem] mx-auto leading-relaxed" style={{ color: t.isDark ? "#FFFFFFCC" : t.subtle }}>{p.bio || p.tagline}</p>}
      </div>
      {/* Boutons ronds glass */}
      <div className="flex justify-center gap-2.5 flex-wrap px-6 mb-6">
        {p.phone && <GlassBtn icon={Phone} href={`tel:${p.phone}`} isDark={t.isDark} k="phone" />}
        {p.email && <GlassBtn icon={Mail} href={`mailto:${p.email}`} isDark={t.isDark} k="mail" />}
        {socials.slice(0, 6).map((s) => <GlassBtn key={s.key} icon={s.icon} href={p.links[s.key]} isDark={t.isDark} k={s.key} />)}
      </div>
      <div className="px-6"><button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact" className="w-full py-4 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition backdrop-blur" style={{ background: t.isDark ? "rgba(255,255,255,0.95)" : t.text, color: t.isDark ? t.text : "#FFFFFF" }}><Download size={16} /> Ajouter à mes contacts</button></div>
      <Footer t={{ ...t, subtle: t.isDark ? "#FFFFFF80" : t.subtle }} />
    </div>
  );
}

/* ============================================================
   6. BRUTAL — typo massive, bordures nettes, aucun round
   ============================================================ */
function LayoutBrutal({ p, t, onAction }) {
  const socials = socialsFilled(p.links);
  const avatar = p.hero_photo_url || p.avatar_url;
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ background: t.bg, color: t.text }}>
      {/* Header noir/accent avec typo écrasée */}
      <div className="border-b-4 p-6" style={{ borderColor: t.text, background: t.accent }}>
        <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: t.isDark ? t.bg : "#FFFFFF" }}>KALLITAG // {new Date().getFullYear()}</p>
        <h1 className="mt-2 font-display font-black leading-[0.8] tracking-tighter" style={{ fontSize: 56, color: t.isDark ? t.bg : "#FFFFFF" }}>
          {(p.first_name || "PRÉNOM").toUpperCase()}
        </h1>
        <h1 className="font-display font-black leading-[0.8] tracking-tighter" style={{ fontSize: 56, color: t.isDark ? t.bg : "#FFFFFF", WebkitTextStroke: `2px ${t.isDark ? t.bg : "#FFFFFF"}`, WebkitTextFillColor: "transparent" }}>
          {(p.last_name || "NOM").toUpperCase()}
        </h1>
      </div>
      <div className="p-6 space-y-4">
        {avatar && <div className="border-4 aspect-square overflow-hidden" style={{ borderColor: t.text }}><img src={avatar} alt="" className="w-full h-full object-cover grayscale" /></div>}
        <div className="border-4 p-4" style={{ borderColor: t.text }}>
          <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: t.subtle }}>POSTE</p>
          <p className="font-display font-bold text-lg mt-1">{p.job_title || "Votre poste"}</p>
          {p.company && <><p className="font-mono text-[10px] tracking-widest uppercase mt-3" style={{ color: t.subtle }}>ORGA</p><p className="font-display font-bold text-lg mt-1">{p.company}</p></>}
        </div>
        {(p.bio || p.tagline) && <div className="border-4 p-4" style={{ borderColor: t.text }}><p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: t.subtle }}>À PROPOS</p><p className="text-sm mt-2 leading-relaxed">{p.bio || p.tagline}</p></div>}
        <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact" className="w-full py-5 border-4 font-display font-black text-xl uppercase transition hover:scale-[0.98]" style={{ borderColor: t.text, background: t.text, color: t.bg }}>▸ SAUVEGARDER</button>
        {socials.length > 0 && (
          <div className="grid grid-cols-3 gap-0 border-4" style={{ borderColor: t.text }}>
            {socials.map((s, i) => (
              <a key={s.key} href={p.links[s.key]} target="_blank" rel="noopener" data-testid={`profile-brutal-${s.key}`}
                 className="aspect-square grid place-items-center transition hover:scale-95"
                 style={{ background: i % 2 === 0 ? t.surface : t.accent, color: i % 2 === 0 ? t.text : (t.isDark ? t.bg : "#FFF"), borderRight: `${i % 3 !== 2 ? 4 : 0}px solid ${t.text}`, borderBottom: `${i < socials.length - 3 ? 4 : 0}px solid ${t.text}` }}>
                <s.icon size={24} />
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="border-t-4 py-3 text-center font-mono text-[10px] tracking-widest uppercase" style={{ borderColor: t.text, color: t.subtle }}>PROPULSÉ PAR KALLITAG</div>
    </div>
  );
}

/* ========================================================================
   Composants utilitaires réutilisables
   ======================================================================== */
const QuickBtn = ({ href, icon: Icon, color, tk }) => (
  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" data-testid={`profile-quick-${tk}`}
     className="w-14 h-14 rounded-full grid place-items-center shadow-lg transition hover:scale-110"
     style={{ background: color, color: "#FFFFFF" }}><Icon size={22} /></a>
);

const QuickRow = ({ p, t, offset = false }) => (
  <div className={`flex justify-center gap-3 px-6 mb-6 relative z-10 ${offset ? "-mt-7" : "mt-4"}`}>
    {p.phone && <QuickBtn href={`tel:${p.phone}`} icon={Phone} color={t.accent} tk="phone" />}
    {p.email && <QuickBtn href={`mailto:${p.email}`} icon={Mail} color={t.accent} tk="mail" />}
    {p.links?.whatsapp && <QuickBtn href={p.links.whatsapp} icon={MessageCircle} color={socialColors.whatsapp} tk="wa" />}
    {p.links?.instagram && <QuickBtn href={p.links.instagram} icon={Instagram} color={socialColors.instagram} tk="ig" />}
    {p.links?.linkedin && <QuickBtn href={p.links.linkedin} icon={Linkedin} color={socialColors.linkedin} tk="in" />}
  </div>
);

const CTA = ({ t, onAction, tight = false }) => (
  <div className={tight ? "" : "px-5 mb-6"}>
    <button onClick={() => onAction?.("vcard")} data-testid="profile-add-contact"
            className="w-full py-4 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition"
            style={{ background: t.accent, color: t.isDark ? t.bg : "#FFFFFF", boxShadow: `0 10px 30px -12px ${t.accent}80` }}>
      <Download size={16} /> Ajouter à mes contacts
    </button>
  </div>
);

const SocialList = ({ socials, p, t }) => socials.length === 0 ? null : (
  <div className="px-5 mb-6 space-y-2">
    <p className="eyebrow" style={{ color: t.accent }}>Retrouvez-moi</p>
    {socials.map((s) => (
      <a key={s.key} href={p.links[s.key]} target="_blank" rel="noopener" data-testid={`profile-social-${s.key}`}
         className="flex items-center gap-3 p-3 rounded-2xl transition hover:scale-[1.01]"
         style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="w-10 h-10 rounded-full grid place-items-center flex-shrink-0" style={{ background: socialColors[s.key] || t.accent, color: "#FFF" }}><s.icon size={18} /></div>
        <p className="flex-1 text-sm font-semibold">{s.label}</p>
        <ArrowUpRight size={16} style={{ color: t.subtle }} />
      </a>
    ))}
  </div>
);

const ActionSquare = ({ icon: Icon, label, href, t, color, k }) => (
  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" data-testid={`profile-square-${k}`}
     className="aspect-square rounded-2xl p-4 flex flex-col justify-between transition hover:scale-[0.97]"
     style={{ background: t.surface, border: `1px solid ${t.border}` }}>
    <Icon size={22} style={{ color: color || t.accent }} />
    <span className="text-xs font-semibold" style={{ color: t.text }}>{label}</span>
  </a>
);

const GlassBtn = ({ icon: Icon, href, isDark, k }) => (
  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" data-testid={`profile-glass-${k}`}
     className="w-12 h-12 rounded-2xl grid place-items-center backdrop-blur transition hover:scale-110"
     style={{ background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)", color: isDark ? "#FFFFFF" : "#000000", border: `1px solid ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.10)"}` }}>
    <Icon size={20} />
  </a>
);

const Footer = ({ t }) => (
  <div className="py-5 text-center text-[10px]" style={{ color: t.subtle }}>
    Propulsé par <span style={{ color: t.accent }}>KalliTag</span>
  </div>
);

/* ========================================================================
   Composant principal
   ======================================================================== */
export default function ProfilePreview({ profile, framed = true, onAction }) {
  const t = THEMES[profile.theme_id] || THEMES.onyx;
  const layout = profile.layout_id || "hero";
  const p = profile;

  const inner =
    layout === "card"     ? <LayoutCard p={p} t={t} onAction={onAction} /> :
    layout === "list"     ? <LayoutList p={p} t={t} onAction={onAction} /> :
    layout === "split"    ? <LayoutSplit p={p} t={t} onAction={onAction} /> :
    layout === "gradient" ? <LayoutGradient p={p} t={t} onAction={onAction} /> :
    layout === "brutal"   ? <LayoutBrutal p={p} t={t} onAction={onAction} /> :
    <LayoutHero p={p} t={t} onAction={onAction} />;

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
