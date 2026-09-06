import { motion } from "framer-motion";
import { useMemo } from "react";

/*
 * Physical NFC card preview — NO text, NO branding on the card itself.
 * Realistic textures + subtle perspective + gloss sweep + edge highlight.
 * Three finishes:
 *   - noir_mat      : soft-touch matte black with faint grain
 *   - metal_brosse  : brushed anodized aluminum (silvery)
 *   - or_brosse     : brushed champagne gold
 */

const finishes = {
  noir_mat: {
    label: "Noir Mat",
    base: "linear-gradient(160deg, #1B1B1B 0%, #0A0A0A 55%, #030303 100%)",
    brushed: null,
    chip: { ring: "rgba(255,255,255,0.10)", fill: "rgba(255,255,255,0.04)" },
    edgeTop: "rgba(255,255,255,0.10)",
    edgeBottom: "rgba(0,0,0,0.6)",
    gloss: "rgba(255,255,255,0.06)",
  },
  metal_brosse: {
    label: "Métal Brossé",
    base: "linear-gradient(160deg, #E4E8ED 0%, #B4BAC0 50%, #8F969E 100%)",
    // Vertical fine brushed lines
    brushed:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, rgba(0,0,0,0.06) 1px, rgba(0,0,0,0.06) 2px)",
    chip: { ring: "rgba(0,0,0,0.15)", fill: "rgba(0,0,0,0.05)" },
    edgeTop: "rgba(255,255,255,0.55)",
    edgeBottom: "rgba(0,0,0,0.35)",
    gloss: "rgba(255,255,255,0.35)",
  },
  or_brosse: {
    label: "Or Brossé",
    base: "linear-gradient(160deg, #F4D983 0%, #D4AF37 45%, #8B6914 100%)",
    brushed:
      "repeating-linear-gradient(90deg, rgba(255,240,180,0.22) 0px, rgba(255,240,180,0.22) 1px, rgba(60,40,0,0.10) 1px, rgba(60,40,0,0.10) 2px)",
    chip: { ring: "rgba(60,40,0,0.28)", fill: "rgba(60,40,0,0.10)" },
    edgeTop: "rgba(255,245,190,0.65)",
    edgeBottom: "rgba(60,40,0,0.45)",
    gloss: "rgba(255,255,255,0.40)",
  },
};

const noiseSVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

export default function CardPreview({ finishId = "noir_mat", size = "md", tilt = true, showLabel = true }) {
  const f = finishes[finishId] || finishes.noir_mat;
  const w = size === "lg" ? 400 : size === "sm" ? 200 : 320;
  const h = w * 0.63;
  const cornerR = Math.max(14, w * 0.075);

  const perspective = tilt ? { rotateX: 6, rotateY: -10, y: 0 } : { rotateX: 0, rotateY: 0, y: 0 };
  const chipSize = Math.round(w * 0.13);
  const chipRight = Math.round(w * 0.11);

  const shadow = `0 30px 60px -25px rgba(0,0,0,0.6), 0 15px 30px -15px rgba(0,0,0,0.4)${
    finishId === "or_brosse" ? ", 0 0 45px -18px rgba(212,175,55,0.55)" : ""
  }`;

  const grain = useMemo(() => (finishId === "noir_mat" ? 0.55 : finishId === "metal_brosse" ? 0.18 : 0.22), [finishId]);

  return (
    <div style={{ perspective: 1400 }} data-testid={`card-preview-${finishId}`} className="inline-block">
      <motion.div
        initial={{ opacity: 0, rotateY: -14, y: 6 }}
        animate={{ opacity: 1, ...perspective }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        whileHover={tilt ? { rotateY: -4, rotateX: 3 } : undefined}
        style={{ width: w, height: h, borderRadius: cornerR, transformStyle: "preserve-3d", boxShadow: shadow, background: f.base, position: "relative", overflow: "hidden" }}
      >
        {/* Brushed metal fine lines */}
        {f.brushed && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: f.brushed, opacity: 0.85, mixBlendMode: "overlay" }} />
        )}
        {/* Radial highlight (soft light) */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 22% 15%, ${f.gloss} 0%, transparent 55%)`,
          mixBlendMode: "screen", opacity: 0.9,
        }} />
        {/* Diagonal gloss sweep */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(115deg, transparent 40%, ${f.gloss} 50%, transparent 60%)`,
          mixBlendMode: "screen", opacity: finishId === "noir_mat" ? 0.5 : 0.65,
        }} />
        {/* Grain / soft-touch */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: noiseSVG, opacity: grain, mixBlendMode: finishId === "noir_mat" ? "overlay" : "soft-light" }} />

        {/* Embossed NFC chip disc (no text) */}
        <div
          style={{
            position: "absolute",
            right: chipRight, top: "50%", transform: "translateY(-50%)",
            width: chipSize, height: chipSize, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, ${f.gloss} 0%, transparent 55%), ${f.chip.fill}`,
            border: `1px solid ${f.chip.ring}`,
            boxShadow: `inset 0 1px 0 ${f.edgeTop}, inset 0 -1px 0 ${f.edgeBottom}`,
          }}
        >
          <div style={{
            position: "absolute", inset: "18%", borderRadius: "50%",
            border: `1px solid ${f.chip.ring}`, opacity: 0.75,
          }} />
          <div style={{
            position: "absolute", inset: "38%", borderRadius: "50%",
            border: `1px solid ${f.chip.ring}`, opacity: 0.55,
          }} />
        </div>

        {/* Edge highlight top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: f.edgeTop, opacity: 0.7 }} />
        {/* Edge shadow bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: f.edgeBottom }} />
      </motion.div>
      {showLabel && (
        <p className="mt-3 text-xs text-slate-400 text-center">Finition · <span className="text-amber-400">{f.label}</span></p>
      )}
    </div>
  );
}
