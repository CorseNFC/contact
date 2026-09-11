import { X } from "lucide-react";

/* Compact color picker input.
   - value: hex string or ""
   - onChange(hex|"")
   - label
   - fallbackHint: text shown when unset (e.g. "Couleur du thème") */
export default function ColorField({ label, value, onChange, fallbackHint = "Couleur du thème", testid }) {
  const hasValue = !!value;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <label className="relative flex-shrink-0 cursor-pointer">
          <input
            type="color"
            value={value || "#B8860B"}
            onChange={(e) => onChange(e.target.value)}
            data-testid={testid}
            className="sr-only"
          />
          <div
            className="w-9 h-9 rounded-lg border-2 shadow-sm transition"
            style={{
              background: hasValue ? value : "repeating-linear-gradient(45deg,#e7e0d0,#e7e0d0 4px,#f7f3ec 4px,#f7f3ec 8px)",
              borderColor: hasValue ? value : "rgba(31,27,22,0.15)",
            }}
          />
        </label>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1F1B16] leading-none">{label}</p>
          <p className="text-[11px] text-[#8B7F6E] mt-1 truncate">
            {hasValue ? value.toUpperCase() : fallbackHint}
          </p>
        </div>
      </div>
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange("")}
          data-testid={`${testid}-clear`}
          className="flex-shrink-0 w-7 h-7 rounded-full grid place-items-center text-[#8B7F6E] hover:text-[#1F1B16] hover:bg-[#1F1B16]/5 transition"
          aria-label={`Réinitialiser ${label}`}
          title="Utiliser la couleur du thème"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
