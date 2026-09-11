/* Mini-icônes flat 2D pour les layouts — style trait fin, minimaliste, pas de fake 3D. */

const STROKE = "#4A3F2E";
const ACCENT = "#B8860B";
const FAINT  = "rgba(74,63,46,0.35)";

const Shell = ({ children, active }) => (
  <svg
    viewBox="0 0 40 52"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    aria-hidden="true"
    fill="none"
    stroke={active ? ACCENT : STROKE}
    strokeWidth="1.2"
    strokeLinecap="round"
  >
    <rect x="1.5" y="1.5" width="37" height="49" rx="4" />
    {children}
  </svg>
);

const H = ({ x, y, w }) => <line x1={x} y1={y} x2={x + w} y2={y} stroke={FAINT} strokeWidth="1" />;

const Hero = ({ active }) => (
  <Shell active={active}>
    {/* Photo top block */}
    <rect x="5" y="5" width="30" height="20" rx="1.5" />
    <circle cx="20" cy="14" r="3" />
    {/* Text lines */}
    <H x={6} y={30} w={16} />
    <H x={6} y={34} w={10} />
    <H x={6} y={40} w={28} />
    <H x={6} y={44} w={22} />
  </Shell>
);

const CardIco = ({ active }) => (
  <Shell active={active}>
    {/* Cadre interne */}
    <rect x="7" y="9" width="26" height="34" rx="2" stroke={ACCENT} />
    <circle cx="20" cy="18" r="3" />
    <H x={12} y={26} w={16} />
    <H x={14} y={30} w={12} />
    <line x1="16" y1="34" x2="24" y2="34" stroke={ACCENT} strokeWidth="1" />
    <H x={13} y={38} w={14} />
  </Shell>
);

const List = ({ active }) => (
  <Shell active={active}>
    <circle cx="20" cy="9" r="2.5" />
    <H x={13} y={14} w={14} />
    {/* Pile de boutons */}
    <rect x="6" y="19" width="28" height="4" rx="2" stroke={ACCENT} />
    <rect x="6" y="26" width="28" height="4" rx="2" />
    <rect x="6" y="33" width="28" height="4" rx="2" />
    <rect x="6" y="40" width="28" height="4" rx="2" />
  </Shell>
);

const Split = ({ active }) => (
  <Shell active={active}>
    {/* Bloc diagonal */}
    <path d="M1.5 1.5 H38.5 V22 L1.5 26 Z" fill={active ? `${ACCENT}18` : "rgba(74,63,46,0.10)"} stroke="none" />
    <path d="M1.5 1.5 H38.5 V22 L1.5 26" />
    <H x={6} y={30} w={16} />
    <H x={6} y={34} w={14} />
    {/* Grille 2x2 */}
    <rect x="6" y="38" width="12" height="8" rx="1.5" />
    <rect x="22" y="38" width="12" height="8" rx="1.5" />
  </Shell>
);

const Gradient = ({ active }) => (
  <Shell active={active}>
    {/* Cercles centrés dégradé */}
    <circle cx="20" cy="16" r="4" stroke={ACCENT} />
    <H x={9} y={24} w={22} />
    <H x={12} y={28} w={16} />
    {/* Pastilles ronds */}
    <circle cx="12" cy="36" r="2" />
    <circle cx="20" cy="36" r="2" />
    <circle cx="28" cy="36" r="2" />
    <rect x="8" y="42" width="24" height="4" rx="2" stroke={ACCENT} />
  </Shell>
);

const Brutal = ({ active }) => (
  <Shell active={active}>
    {/* Header bloc plein */}
    <rect x="1.5" y="1.5" width="37" height="14" fill={active ? ACCENT : STROKE} stroke="none" />
    {/* Blocs bordures nettes */}
    <rect x="5" y="19" width="30" height="8" strokeWidth="1.4" />
    <rect x="5" y="30" width="30" height="6" strokeWidth="1.4" fill={active ? `${ACCENT}22` : "rgba(74,63,46,0.08)"} />
    <rect x="5" y="39" width="8" height="8" strokeWidth="1.4" />
    <rect x="16" y="39" width="8" height="8" strokeWidth="1.4" fill={active ? `${ACCENT}` : "rgba(74,63,46,0.55)"} />
    <rect x="27" y="39" width="8" height="8" strokeWidth="1.4" />
  </Shell>
);

const MAP = { hero: Hero, card: CardIco, list: List, split: Split, gradient: Gradient, brutal: Brutal };

export default function LayoutIcon({ id, active = false, className = "" }) {
  const Cmp = MAP[id] || Hero;
  return (
    <div className={className} data-testid={`layout-icon-${id}`}>
      <Cmp active={active} />
    </div>
  );
}
