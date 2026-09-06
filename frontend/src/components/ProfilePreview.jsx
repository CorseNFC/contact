import { motion } from "framer-motion";
import { Phone, Mail, Download, Globe, Instagram, Linkedin, Calendar, MessageCircle, Youtube, Music2 } from "lucide-react";

const themes = {
  onyx:     { bg: "#0B0F17", surface: "#131926", accent: "#D4AF37", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)" },
  ivory:    { bg: "#F7F3EC", surface: "#FFFFFF", accent: "#0B0F17", text: "#0B0F17", subtle: "#64748B", border: "rgba(11,15,23,0.08)" },
  midnight: { bg: "#0F172A", surface: "#0B1226", accent: "#10B981", text: "#F8FAFC", subtle: "#94A3B8", border: "rgba(255,255,255,0.08)" },
  rose:     { bg: "#F5E6DE", surface: "#FFFFFF", accent: "#8B3A2E", text: "#2A1810", subtle: "#7A5A50", border: "rgba(42,24,16,0.08)" },
};

const actionsMap = (profile, t) => {
  const acts = [];
  if (profile.phone) acts.push({ icon: Phone, label: "Appeler", href: `tel:${profile.phone}`, key: "call" });
  if (profile.email) acts.push({ icon: Mail, label: "Écrire", href: `mailto:${profile.email}`, key: "mail" });
  acts.push({ icon: Download, label: "Ajouter", href: "#vcard", key: "vcard", primary: true });
  const l = profile.links || {};
  if (l.linkedin) acts.push({ icon: Linkedin, label: "LinkedIn", href: l.linkedin, key: "linkedin" });
  if (l.instagram) acts.push({ icon: Instagram, label: "Instagram", href: l.instagram, key: "instagram" });
  if (l.whatsapp) acts.push({ icon: MessageCircle, label: "WhatsApp", href: l.whatsapp, key: "whatsapp" });
  if (l.calendly) acts.push({ icon: Calendar, label: "RDV", href: l.calendly, key: "calendly" });
  if (l.website) acts.push({ icon: Globe, label: "Site", href: l.website, key: "website" });
  if (l.tiktok) acts.push({ icon: Music2, label: "TikTok", href: l.tiktok, key: "tiktok" });
  if (l.youtube) acts.push({ icon: Youtube, label: "YouTube", href: l.youtube, key: "youtube" });
  return acts;
};

export default function ProfilePreview({ profile, framed = true, onAction }) {
  const t = themes[profile.theme_id] || themes.onyx;
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";
  const actions = actionsMap(profile, t);

  const inner = (
    <div className="w-full h-full flex flex-col" style={{ background: t.bg, color: t.text }}>
      {/* Hero band */}
      <div className="relative pt-8 pb-6 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 50% 0%, ${t.accent}22, transparent 60%)` }} />
        <motion.div
          key={profile.avatar_url + initials}
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative mx-auto w-24 h-24 rounded-full grid place-items-center font-display font-bold text-3xl overflow-hidden"
          style={{ background: t.surface, color: t.accent, border: `2px solid ${t.accent}` }}
        >
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
            : initials}
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

      {/* Primary CTA — Add to contacts */}
      <div className="px-5">
        <button
          onClick={() => onAction?.("vcard")}
          data-testid="profile-add-contact"
          className="w-full py-3.5 rounded-full font-semibold text-sm inline-flex items-center justify-center gap-2 transition"
          style={{ background: t.accent, color: t.bg, boxShadow: `0 10px 30px -12px ${t.accent}80` }}
        >
          <Download size={16} /> Ajouter à mes contacts
        </button>
      </div>

      {/* Quick actions grid */}
      <div className="px-5 mt-4 pb-6 grid grid-cols-4 gap-2">
        {actions.filter(a => a.key !== "vcard").map((a) => (
          <a
            key={a.key}
            href={a.href}
            target={a.href?.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            data-testid={`profile-action-${a.key}`}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition hover:scale-[1.02]"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
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

  if (!framed) return <div className="w-full h-full">{inner}</div>;

  // Phone frame mockup
  return (
    <div className="relative mx-auto" style={{ width: 300 }} data-testid="profile-preview-frame">
      <div className="rounded-[42px] p-2 shadow-2xl" style={{ background: "#0A0A0A", boxShadow: "0 30px 80px -30px rgba(212,175,55,0.35), 0 20px 50px -20px rgba(0,0,0,0.6)" }}>
        <div className="rounded-[34px] overflow-hidden relative" style={{ width: "100%", height: 600 }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-black z-10" />
          {inner}
        </div>
      </div>
    </div>
  );
}
