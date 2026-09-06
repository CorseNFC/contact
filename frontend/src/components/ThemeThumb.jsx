import { motion } from "framer-motion";
import { Download, Phone, Mail } from "lucide-react";

const themeSkins = {
  onyx:     { bg: "#0B0F17", surface: "#131926", accent: "#D4AF37", text: "#F8FAFC", muted: "#94A3B8" },
  ivory:    { bg: "#F7F3EC", surface: "#FFFFFF", accent: "#0B0F17", text: "#0B0F17", muted: "#64748B" },
  midnight: { bg: "#0F172A", surface: "#0B1226", accent: "#10B981", text: "#F8FAFC", muted: "#94A3B8" },
  rose:     { bg: "#F5E6DE", surface: "#FFFFFF", accent: "#8B3A2E", text: "#2A1810", muted: "#7A5A50" },
};

/** Mini mobile mockup used as tile thumbnail in the theme picker. */
export default function ThemeThumb({ themeId, label, active }) {
  const t = themeSkins[themeId] || themeSkins.onyx;
  return (
    <div className={`kt-card p-3 text-left transition ${active ? "border-amber-400/60 ring-1 ring-amber-500/30" : ""}`} data-testid={`theme-thumb-${themeId}`}>
      <div className="rounded-lg overflow-hidden relative mx-auto" style={{ width: "100%", aspectRatio: "16/12", background: `linear-gradient(180deg, ${t.bg} 0%, ${t.bg} 100%)` }}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
          className="absolute inset-2 rounded-md flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${t.accent}22, transparent 55%), ${t.bg}` }}
        >
          <div className="flex items-center gap-2 px-2 pt-2">
            <div className="rounded-full" style={{ width: 18, height: 18, background: t.surface, border: `1.5px solid ${t.accent}` }} />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded-full" style={{ background: t.text, opacity: 0.85, width: "70%" }} />
              <div className="h-1 rounded-full" style={{ background: t.muted, opacity: 0.8, width: "50%" }} />
            </div>
          </div>
          <div className="px-2 mt-2">
            <div className="h-2 rounded-full mx-auto" style={{ background: t.accent, width: "85%" }} />
          </div>
          <div className="grid grid-cols-4 gap-1 px-2 mt-2 pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 rounded" style={{ background: t.surface, border: `1px solid ${t.accent}22` }} />
            ))}
          </div>
        </motion.div>
      </div>
      <p className="text-xs font-medium mt-2" style={{ color: "var(--kt-text)" }}>{label}</p>
    </div>
  );
}
