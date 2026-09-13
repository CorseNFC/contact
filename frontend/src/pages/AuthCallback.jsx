import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { verifyMagicLink } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const auth = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setError("Lien invalide"); return; }
    verifyMagicLink(token)
      .then(async (r) => {
        await auth.login(r.session_token);
        // If the user has never set a password, force them through the /definir-mot-de-passe page
        if (r.has_password === false) {
          nav(`/definir-mot-de-passe?token=${encodeURIComponent(token)}`, { replace: true });
        } else {
          nav("/mon-compte", { replace: true });
        }
      })
      .catch(() => setError("Lien expiré ou déjà utilisé."));
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF7F0] grid place-items-center px-4" data-testid="auth-callback">
      {error ? (
        <div className="text-center max-w-sm">
          <p className="font-display text-xl font-bold text-[#1F1B16]">Connexion impossible</p>
          <p className="mt-2 text-sm text-[#6B5F4E]">{error}</p>
          <a href="/connexion" className="mt-6 inline-block kt-btn-ghost">Réessayer</a>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="animate-spin text-amber-400 mx-auto" size={32} />
          <p className="mt-4 text-[#6B5F4E] text-sm">Connexion en cours…</p>
        </div>
      )}
    </div>
  );
}
