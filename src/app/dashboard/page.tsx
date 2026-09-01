'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const THEMES = [
  { id: 'classic', name: 'Classique Épuré', bgClass: 'bg-white text-gray-900 border-gray-100', btnClass: 'bg-indigo-600 text-white' },
  { id: 'dark', name: 'Dark Modern', bgClass: 'bg-gray-900 text-white border-gray-800', btnClass: 'bg-emerald-500 text-gray-900 font-bold' },
  { id: 'sunset', name: 'Sunset Premium', bgClass: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white border-purple-800', btnClass: 'bg-pink-500 text-white' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    slug: '',
    full_name: '',
    job_title: '',
    company: '',
    bio: '',
    phone: '',
    email: '',
    avatar_url: '',
    theme_id: 'classic',
    linkedin_url: '',
    instagram_url: '',
    whatsapp_number: '',
    website_url: '',
  });

  useEffect(() => {
    async function loadVCard() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/auth';
        return;
      }

      const { data } = await supabase
        .from('vcards')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFormData((prev) => ({ ...prev, ...data }));
      }
      setLoading(false);
    }
    loadVCard();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: publicUrlData.publicUrl });
      setMessage('Photo téléchargée avec succès !');
    } catch (error: any) {
      setMessage("Erreur lors de l'envoi de la photo : " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage('Veuillez vous connecter.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('vcards')
      .upsert({
        user_id: user.id,
        ...formData,
      });

    if (error) {
      setMessage('Erreur lors de la sauvegarde : ' + error.message);
    } else {
      setMessage('Modifications enregistrées avec succès !');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Chargement de votre profil...
      </div>
    );
  }

  const selectedTheme = THEMES.find((t) => t.id === formData.theme_id) || THEMES[0];
  const publicCardUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${formData.slug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicCardUrl)}`;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLONNE GAUCHE : FORMULAIRE */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Personnaliser votre carte</h1>
              <p className="text-sm text-gray-500">Mise à jour en temps réel sur la carte NFC.</p>
            </div>
            <a
              href={`/c/${formData.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg font-semibold hover:bg-indigo-100 transition"
            >
              Voir ma carte ↗
            </a>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-xl text-sm ${message.includes('succès') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* AVATAR & THEME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Photo de profil
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Choix du thème
                </label>
                <select
                  name="theme_id"
                  value={formData.theme_id}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* INFOS PERSONNELLES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Nom complet</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  placeholder="Jean Dupont"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Poste</label>
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title || ''}
                  onChange={handleChange}
                  placeholder="Fondateur / CEO"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Entreprise</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleChange}
                  placeholder="Ma Société"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                />
              </div>
            </div>

            {/* RÉSEAUX SOCIAUX & LIENS */}
            <hr className="my-4 border-gray-100" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Réseaux Sociaux & Liens</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-500 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url || ''}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/profil"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-500 mb-1">Instagram URL</label>
                <input
                  type="url"
                  name="instagram_url"
                  value={formData.instagram_url || ''}
                  onChange={handleChange}
                  placeholder="https://instagram.com/pseudo"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-500 mb-1">Numéro WhatsApp</label>
                <input
                  type="text"
                  name="whatsapp_number"
                  value={formData.whatsapp_number || ''}
                  onChange={handleChange}
                  placeholder="+33612345678"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-500 mb-1">Site Web</label>
                <input
                  type="url"
                  name="website_url"
                  value={formData.website_url || ''}
                  onChange={handleChange}
                  placeholder="https://monsite.com"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Bio / Présentation</label>
              <textarea
                name="bio"
                rows={2}
                value={formData.bio || ''}
                onChange={handleChange}
                placeholder="Courte présentation..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>

        {/* COLONNE DROITE : PRÉVISUALISATION + QR CODE */}
        <div className="flex flex-col items-center justify-start gap-6">
          <div className="w-full max-w-sm">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center mb-3">Aperçu en temps réel</h2>
            
            <div className={`rounded-3xl shadow-2xl overflow-hidden p-6 text-center border transition-all duration-300 ${selectedTheme.bgClass}`}>
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt={formData.full_name || 'Avatar'}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center text-gray-400 text-2xl font-bold">
                  {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
              
              <h3 className="text-2xl font-bold">{formData.full_name || 'Votre Nom'}</h3>
              <p className="text-sm opacity-90 mb-1">{formData.job_title || 'Intitulé du poste'}</p>
              <p className="text-xs opacity-75 mb-4">{formData.company || 'Entreprise'}</p>

              {/* LIENS SOCIAUX SUR APERÇU */}
              <div className="flex justify-center gap-3 mb-4">
                {formData.linkedin_url && <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">LinkedIn</span>}
                {formData.instagram_url && <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">Instagram</span>}
                {formData.whatsapp_number && <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">WhatsApp</span>}
              </div>

              <div className="flex flex-col gap-2">
                {formData.phone && (
                  <div className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm shadow ${selectedTheme.btnClass}`}>
                    Appeler ({formData.phone})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GENERATEUR DE QR CODE */}
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Votre QR Code dynamique</h3>
            <p className="text-xs text-gray-500 mb-4">À imprimer au dos de votre carte NFC physique.</p>
            
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-40 h-40 mx-auto rounded-xl border p-2 bg-white shadow-inner mb-4"
            />

            <a
              href={qrCodeUrl}
              download="qrcode-nfc.png"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2.5 rounded-xl transition"
            >
              Télécharger le QR Code
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}