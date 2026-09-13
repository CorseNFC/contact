import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { authVerifyEmail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function VerifyEmail() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const [state, setState] = useState("loading"); // loading | ok | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); setMsg("Lien invalide"); return; }
    authVerifyEmail(token)
      .then(async (r) => {
        if (r.session_token) await login(r.session_token);
        setState("ok");
        setTimeout(() => nav("/mon-compte", { replace: true }), 1600);
      })
      .catch((err) => {
        setState("error");
        setMsg(err.response?.data?.detail || "Lien expiré ou déjà utilisé");
      });
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-40 pb-24 max-w-md mx-auto px-4 text-center" data-testid="verify-email-page">
        {state === "loading" && (
          <>
            <Loader2 className="animate-spin text-amber-500 mx-auto" size={40} />
            <p className="mt-6 text-sm text-[#6B5F4E]">Vérification de votre email…</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 className="text-emerald-500 mx-auto" size={48} />
            <h1 className="mt-5 font-display font-bold text-2xl">Email confirmé !</h1>
            <p className="mt-2 text-sm text-[#6B5F4E]">Redirection vers votre espace…</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="text-red-500 mx-auto" size={48} />
            <h1 className="mt-5 font-display font-bold text-2xl">Vérification impossible</h1>
            <p className="mt-2 text-sm text-[#6B5F4E]">{msg}</p>
            <a href="/mon-compte" className="mt-6 inline-block kt-btn-ghost text-sm">Retour à mon compte</a>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
