import { useRef, useState } from "react";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

/*
 * DropZone : drag & drop + click to upload.
 * Props:
 *   - value       : current image URL (absolute), or empty
 *   - onUpload    : async fn(file) → { url } — throws on error
 *   - onClear     : fn() to reset
 *   - label       : text shown when empty
 *   - hint        : subtext
 */
export default function DropZone({ value, onUpload, onClear, label = "Glissez votre photo ici", hint = "ou cliquez pour parcourir · JPEG, PNG, WebP · 5 Mo max", testid = "dropzone" }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Format non supporté");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (5 Mo max)");
      return;
    }
    setUploading(true);
    try {
      await onUpload(file);
      toast.success("Photo téléversée");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload impossible");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  if (value) {
    return (
      <div className="flex items-center gap-4" data-testid={`${testid}-filled`}>
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-amber-400/50 bg-slate-900">
          <img src={value} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="kt-btn-ghost text-xs inline-flex items-center gap-2" data-testid={`${testid}-replace`}>
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Remplacer
          </button>
          {onClear && (
            <button type="button" onClick={onClear} className="text-xs text-slate-500 hover:text-red-400 inline-flex items-center gap-1.5" data-testid={`${testid}-clear`}>
              <X size={12} /> Retirer la photo
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                 onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} data-testid={`${testid}-input`} />
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      data-testid={testid}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-amber-400 bg-amber-500/10" : "border-white/10 hover:border-amber-400/50 hover:bg-white/[0.02]"}`}
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
             onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} data-testid={`${testid}-input`} />
      <div className="flex flex-col items-center gap-2">
        <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 grid place-items-center">
          {uploading ? <Loader2 className="animate-spin text-amber-400" size={20} /> : <ImageIcon className="text-amber-400" size={20} />}
        </div>
        <p className="text-sm font-medium text-slate-200">{uploading ? "Téléversement…" : (dragging ? "Déposez pour téléverser" : label)}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}
