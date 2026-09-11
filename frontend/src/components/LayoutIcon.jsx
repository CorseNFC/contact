/* Mini-wireframes monochromes pour illustrer chaque layout
   — style épuré, cohérent avec l'identité cream/gold. */

const BASE = {
  bg: "#F7F3EC",
  line: "#B8860B",
  ink: "#4A3F2E",
  faint: "rgba(31,27,22,0.18)",
};

const Shell = ({ children, active }) => (
  <svg
    viewBox="0 0 64 80"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    aria-hidden="true"
  >
    {/* Cadre "téléphone" */}
    <rect
      x="2"
      y="2"
      width="60"
      height="76"
      rx="8"
      ry="8"
      fill={BASE.bg}
      stroke={active ? BASE.line : BASE.faint}
      strokeWidth={active ? 1.4 : 1}
    />
    {children}
  </svg>
);

const Hero = ({ active }) => (
  <Shell active={active}>
    {/* Photo edge-to-edge */}
    <rect x="6" y="6" width="52" height="42" rx="4" fill={BASE.line} opacity="0.14" />
    <circle cx="32" cy="24" r="7" fill={BASE.line} opacity="0.35" />
    {/* Titre superposé */}
    <rect x="8" y="38" width="28" height="3" rx="1.5" fill={BASE.ink} />
    <rect x="8" y="43" width="18" height="2.5" rx="1" fill={BASE.ink} opacity="0.6" />
    {/* Sections dessous */}
    <rect x="8" y="54" width="48" height="6" rx="2" fill={BASE.line} opacity="0.25" />
    <rect x="8" y="63" width="30" height="2.5" rx="1" fill={BASE.ink} opacity="0.35" />
    <rect x="8" y="68" width="38" height="2.5" rx="1" fill={BASE.ink} opacity="0.35" />
  </Shell>
);

const CardIco = ({ active }) => (
  <Shell active={active}>
    {/* Cadre carton doré centré */}
    <rect x="10" y="14" width="44" height="52" rx="6" fill="none" stroke={BASE.line} strokeWidth="1.4" />
    <circle cx="32" cy="28" r="6" fill={BASE.line} opacity="0.35" />
    <rect x="20" y="40" width="24" height="2.5" rx="1" fill={BASE.ink} />
    <rect x="24" y="46" width="16" height="2" rx="1" fill={BASE.ink} opacity="0.55" />
    {/* Divider or */}
    <line x1="26" y1="52" x2="38" y2="52" stroke={BASE.line} strokeWidth="1" />
    <rect x="22" y="56" width="20" height="2" rx="1" fill={BASE.ink} opacity="0.35" />
    <rect x="22" y="60" width="20" height="2" rx="1" fill={BASE.ink} opacity="0.35" />
  </Shell>
);

const List = ({ active }) => (
  <Shell active={active}>
    <circle cx="32" cy="14" r="4" fill={BASE.line} opacity="0.4" />
    <rect x="22" y="21" width="20" height="2" rx="1" fill={BASE.ink} />
    <rect x="26" y="25" width="12" height="1.5" rx="0.75" fill={BASE.ink} opacity="0.5" />
    {/* Piles de boutons */}
    {[32, 40, 48, 56, 64].map((y, i) => (
      <rect
        key={i}
        x="8"
        y={y}
        width="48"
        height="5"
        rx="2.5"
        fill={i === 0 ? BASE.line : "none"}
        stroke={i === 0 ? "none" : BASE.line}
        strokeWidth="1"
        opacity={i === 0 ? 0.8 : 0.5}
      />
    ))}
  </Shell>
);

const Split = ({ active }) => (
  <Shell active={active}>
    {/* Bloc diagonal en haut */}
    <path d="M2 2 H62 V38 L2 46 Z" fill={BASE.line} opacity="0.25" />
    <circle cx="32" cy="20" r="6" fill={BASE.line} opacity="0.4" />
    {/* Nom qui déborde */}
    <rect x="8" y="46" width="26" height="3" rx="1" fill={BASE.ink} />
    <rect x="8" y="51" width="18" height="3" rx="1" fill={BASE.line} />
    {/* Grille 2x2 */}
    <rect x="8" y="58" width="22" height="8" rx="2" fill="none" stroke={BASE.line} strokeWidth="1" opacity="0.6" />
    <rect x="34" y="58" width="22" height="8" rx="2" fill="none" stroke={BASE.line} strokeWidth="1" opacity="0.6" />
    <rect x="8" y="68" width="22" height="6" rx="2" fill="none" stroke={BASE.line} strokeWidth="1" opacity="0.4" />
    <rect x="34" y="68" width="22" height="6" rx="2" fill="none" stroke={BASE.line} strokeWidth="1" opacity="0.4" />
  </Shell>
);

const Gradient = ({ active }) => (
  <Shell active={active}>
    {/* Orbes dégradés (représentés par cercles doux) */}
    <defs>
      <radialGradient id="gd1" cx="80%" cy="10%" r="60%">
        <stop offset="0%" stopColor={BASE.line} stopOpacity="0.55" />
        <stop offset="100%" stopColor={BASE.line} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="gd2" cx="10%" cy="60%" r="55%">
        <stop offset="0%" stopColor={BASE.line} stopOpacity="0.4" />
        <stop offset="100%" stopColor={BASE.line} stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="60" height="76" rx="8" fill="url(#gd1)" />
    <rect x="2" y="2" width="60" height="76" rx="8" fill="url(#gd2)" />
    <circle cx="32" cy="22" r="5" fill={BASE.line} opacity="0.5" />
    {/* Gros titre centré */}
    <rect x="14" y="34" width="36" height="4" rx="1.5" fill={BASE.ink} />
    <rect x="18" y="40" width="28" height="4" rx="1.5" fill={BASE.ink} opacity="0.75" />
    <rect x="22" y="48" width="20" height="2" rx="1" fill={BASE.ink} opacity="0.5" />
    {/* Boutons ronds glass */}
    <circle cx="20" cy="60" r="3" fill="none" stroke={BASE.line} strokeWidth="1" />
    <circle cx="30" cy="60" r="3" fill="none" stroke={BASE.line} strokeWidth="1" />
    <circle cx="40" cy="60" r="3" fill="none" stroke={BASE.line} strokeWidth="1" />
    <rect x="14" y="68" width="36" height="5" rx="2.5" fill={BASE.line} opacity="0.7" />
  </Shell>
);

const Brutal = ({ active }) => (
  <Shell active={active}>
    {/* Header noir avec typo massive */}
    <rect x="2" y="2" width="60" height="26" fill={BASE.ink} />
    <rect x="6" y="10" width="34" height="4" fill={BASE.bg} />
    <rect x="6" y="16" width="26" height="4" fill="none" stroke={BASE.bg} strokeWidth="0.6" />
    {/* Blocs bordures nettes */}
    <rect x="8" y="34" width="48" height="12" fill="none" stroke={BASE.ink} strokeWidth="1.4" />
    <rect x="10" y="37" width="6" height="1.5" fill={BASE.ink} opacity="0.5" />
    <rect x="10" y="40" width="24" height="3" fill={BASE.ink} />
    <rect x="8" y="50" width="48" height="6" fill={BASE.ink} />
    {/* Grille sociaux carrés */}
    <rect x="8" y="60" width="14" height="14" fill="none" stroke={BASE.ink} strokeWidth="1.2" />
    <rect x="24" y="60" width="14" height="14" fill={BASE.line} opacity="0.7" />
    <rect x="40" y="60" width="16" height="14" fill="none" stroke={BASE.ink} strokeWidth="1.2" />
  </Shell>
);

const MAP = {
  hero: Hero,
  card: CardIco,
  list: List,
  split: Split,
  gradient: Gradient,
  brutal: Brutal,
};

export default function LayoutIcon({ id, active = false, className = "" }) {
  const Cmp = MAP[id] || Hero;
  return (
    <div className={className} data-testid={`layout-icon-${id}`}>
      <Cmp active={active} />
    </div>
  );
}
