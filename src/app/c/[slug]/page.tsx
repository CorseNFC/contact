import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicVCard({ params }: PageProps) {
  const { slug } = await params;

  const { data: vcard } = await supabase
    .from('vcards')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!vcard || !vcard.is_active) {
    notFound();
  }

  const vcardData = `BEGIN:VCARD
VERSION:3.0
N:${vcard.full_name || ''};;;;
FN:${vcard.full_name || ''}
ORG:${vcard.company || ''}
TITLE:${vcard.job_title || ''}
TEL;TYPE=CELL:${vcard.phone || ''}
EMAIL:${vcard.email || ''}
NOTE:${vcard.bio || ''}
END:VCARD`;

  const vcardBase64 = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcardData)}`;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-6 text-center border border-gray-100">
        {vcard.avatar_url ? (
          <img
            src={vcard.avatar_url}
            alt={vcard.full_name || 'Avatar'}
            className="w-28 h-28 rounded-full mx-auto mb-4 object-cover shadow-md"
          />
        ) : (
          <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl shadow-inner">
            {vcard.full_name ? vcard.full_name.charAt(0).toUpperCase() : '?'}
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900">{vcard.full_name}</h1>
        <p className="text-sm font-medium text-indigo-600 mb-1">{vcard.job_title}</p>
        <p className="text-xs text-gray-400 mb-4">{vcard.company}</p>

        {vcard.bio && (
          <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
            {vcard.bio}
          </p>
        )}

        {/* BOUTON PRINCIPAL VCF */}
        <div className="flex flex-col gap-3 mb-6">
          <a
            href={vcardBase64}
            download={`${vcard.full_name || 'contact'}.vcf`}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <span>💾 Enregistrer le contact</span>
          </a>
        </div>

        {/* LISTE DES LIENS ET RÉSEAUX SOCIAUX */}
        <div className="flex flex-col gap-2.5">
          {vcard.phone && (
            <a
              href={`tel:${vcard.phone}`}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium rounded-xl border border-gray-100 transition flex items-center justify-center gap-2 text-sm"
            >
              📞 Appeler ({vcard.phone})
            </a>
          )}

          {vcard.whatsapp_number && (
            <a
              href={`https://wa.me/${vcard.whatsapp_number.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 font-medium rounded-xl border border-green-100 transition flex items-center justify-center gap-2 text-sm"
            >
              💬 Discuter sur WhatsApp
            </a>
          )}

          {vcard.linkedin_url && (
            <a
              href={vcard.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl border border-blue-100 transition flex items-center justify-center gap-2 text-sm"
            >
              🔗 Profil LinkedIn
            </a>
          )}

          {vcard.instagram_url && (
            <a
              href={vcard.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 bg-pink-50 hover:bg-pink-100 text-pink-700 font-medium rounded-xl border border-pink-100 transition flex items-center justify-center gap-2 text-sm"
            >
              📸 Voir sur Instagram
            </a>
          )}

          {vcard.website_url && (
            <a
              href={vcard.website_url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium rounded-xl border border-gray-100 transition flex items-center justify-center gap-2 text-sm"
            >
              🌐 Visiter le site internet
            </a>
          )}
        </div>
      </div>
    </main>
  );
}