import { motion } from "framer-motion";

// Finitions physiques — la carte ne porte AUCUNE inscription du client.
// Elle a juste sa texture + le logo KalliTag discret + un QR/NFC de secours.
const finishes = {
  noir_mat: {
    label: "Noir Mat",
    bg: "linear-gradient(135deg, #111111 0%, #0A0A0A 50%, #050505 100%)",
    fg: "#F2F2F2",
    edge: "rgba(255,255,255,0.06)",
    grain: 0.35,
  },
  metal_brosse: {
    label: "Métal Brossé",
    bg: "repeating-linear-gradient(180deg, #C0C6CC 0px, #B9BFC5 1px, #C8CED4 2px, #B4BAC0 3px)",
    fg: "#0B0F17",
    edge: "rgba(11,15,23,0.15)",
    grain: 0.15,
  },
  or_brosse: {
    label: "Or Brossé",
    bg: "repeating-linear-gradient(180deg, #E6C877 0px, #D4AF37 1px, #E9CB77 2px, #C89B2A 3px)",
    fg: "#1B1200",
    edge: "rgba(27,18,0,0.25)",
    grain: 0.18,
  },
};

export default function CardPreview({ finishId = "noir_mat", size = "md" }) {
  const f = finishes[finishId] || finishes.noir_mat;
  const w = size === "lg" ? 380 : size === "sm" ? 220 : 320;
  const h = w * 0.63;

  return (
    <div className="card-3d-wrap" data-testid="card-preview">
      <motion.div
        className="rounded-2xl relative overflow-hidden card-3d gold-glow shine"
        style={{ width: w, height: h, background: f.bg, border: `1px solid ${f.edge}` }}
        initial={{ rotateY: 10, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="absolute inset-0 flex items-center justify-between px-8" style={{ color: f.fg }}>
          <div>
            <p className="font-display font-bold text-2xl tracking-tight">KalliTag</p>
            <p className="mt-1 text-[10px] tracking-[0.3em] uppercase opacity-60">Tap · NFC · Share</p>
          </div>
          <div className="w-14 h-14 rounded-full border grid place-items-center" style={{ borderColor: f.fg + "33" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: f.fg, opacity: 0.75 }}>
              <path d="M4 12a8 8 0 0 1 16 0" />
              <path d="M7 12a5 5 0 0 1 10 0" />
              <path d="M10 12a2 2 0 0 1 4 0" />
            </svg>
          </div>
        </div>
        {/* subtle grain */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: f.grain, mixBlendMode: "overlay",
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
      </motion.div>
      <p className="mt-3 text-xs text-slate-400 text-center">Finition · <span className="text-amber-400">{f.label}</span></p>
    </div>
  );
}
