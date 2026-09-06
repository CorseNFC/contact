import { motion } from "framer-motion";

const templateStyles = {
  onyx: { bg: "#0B0F17", accent: "#F8FAFC", accent2: "#D4AF37", pattern: "linear-gradient(135deg, #0B0F17 0%, #1a1f2c 100%)" },
  gold: { bg: "#111111", accent: "#D4AF37", accent2: "#FFF7D6", pattern: "linear-gradient(135deg, #1a1400 0%, #111 60%, #2a1e00 100%)" },
  marble: { bg: "#F1EBE0", accent: "#0B0F17", accent2: "#8B6B2E", pattern: "radial-gradient(circle at 30% 20%, #FFF 0%, #F1EBE0 40%, #E5DBC5 100%)" },
  cyber: { bg: "#0F172A", accent: "#10B981", accent2: "#F8FAFC", pattern: "linear-gradient(135deg, #0F172A 0%, #052e2b 100%)" },
  botanical: { bg: "#DCEFDF", accent: "#052e16", accent2: "#7f8b56", pattern: "linear-gradient(135deg, #DCEFDF 0%, #C4DDC9 100%)" },
  noir: { bg: "#000000", accent: "#D4AF37", accent2: "#F8FAFC", pattern: "radial-gradient(circle at 50% 0%, #1a0f00 0%, #000 70%)" },
};

export default function CardPreview({ profile, size = "md", showBack = false }) {
  const t = templateStyles[profile.template_id] || templateStyles.onyx;
  const w = size === "lg" ? 380 : size === "sm" ? 240 : 320;
  const h = w * 0.63;
  const textColor = t.accent;
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "K";

  if (showBack) {
    return (
      <div className="card-3d-wrap" data-testid="card-preview-back">
        <motion.div
          className="rounded-2xl relative overflow-hidden card-3d gold-glow"
          style={{ width: w, height: h, background: t.pattern }}
          initial={{ rotateY: -8, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center" style={{ color: textColor }}>
              <div className="w-24 h-24 mx-auto rounded-lg" style={{ background: `linear-gradient(135deg, ${t.accent}22, ${t.accent}11)`, border: `1px solid ${t.accent}44` }}>
                <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-[2px] p-2">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} style={{ background: (i * 7 + i % 5) % 3 === 0 ? t.accent : "transparent", borderRadius: 1 }} />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[9px] tracking-[0.2em] uppercase opacity-70">Scan · NFC · kallitag</p>
            </div>
          </div>
          <div className="absolute top-3 right-3 text-[9px] tracking-[0.25em] uppercase opacity-60" style={{ color: textColor }}>KalliTag</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="card-3d-wrap" data-testid="card-preview-front">
      <motion.div
        className="rounded-2xl relative overflow-hidden card-3d gold-glow shine"
        style={{ width: w, height: h, background: t.pattern }}
        initial={{ rotateY: 12, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="absolute inset-0 p-5 flex flex-col justify-between" style={{ color: textColor }}>
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-md grid place-items-center font-display font-bold text-sm" style={{ background: t.accent, color: t.bg }}>
              {initials}
            </div>
            <span className="text-[9px] tracking-[0.3em] uppercase opacity-70">KalliTag</span>
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-tight truncate" style={{ color: textColor }}>
              {profile.first_name || "Prénom"} {profile.last_name || "Nom"}
            </p>
            <p className="text-[11px] opacity-80 truncate mt-0.5">{profile.job_title || "Votre poste"}{profile.company ? ` · ${profile.company}` : ""}</p>
            <div className="mt-2 h-[1px] w-10" style={{ background: t.accent2 }} />
            <div className="mt-2 text-[10px] opacity-70 flex flex-wrap gap-x-3">
              {profile.phone && <span>{profile.phone}</span>}
              {profile.email && <span className="truncate max-w-[160px]">{profile.email}</span>}
            </div>
          </div>
        </div>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-40" style={{ background: `radial-gradient(circle, ${t.accent2}66, transparent 70%)` }} />
      </motion.div>
    </div>
  );
}
