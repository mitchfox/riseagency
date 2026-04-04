import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { FaWhatsapp } from 'react-icons/fa';
import { Mail, Building2, MapPin, User, Download } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const SharedContact = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId) return;
    const fetchContact = async () => {
      const { data } = await supabase
        .from('club_network_contacts')
        .select('name, club_name, position, email, phone, country, city, image_url')
        .eq('id', contactId)
        .single();
      setContact(data);
      setLoading(false);
    };
    fetchContact();
  }, [contactId]);

  const downloadVCard = () => {
    if (!contact) return;
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
      contact.club_name ? `ORG:${contact.club_name}` : '',
      contact.position ? `TITLE:${contact.position}` : '',
      contact.email ? `EMAIL:${contact.email}` : '',
      contact.phone ? `TEL:${contact.phone}` : '',
      contact.city && contact.country ? `ADR:;;${contact.city};;;${contact.country}` : '',
      'END:VCARD',
    ].filter(Boolean).join('\n');

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contact.name.replace(/\s+/g, '_')}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading contact...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Contact Not Found</h1>
          <p className="text-muted-foreground">This contact may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{contact.name} | Rise Football Agency</title>
        <meta name="description" content={`Contact card for ${contact.name}${contact.club_name ? ` at ${contact.club_name}` : ''}`} />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-gradient-to-br from-card/90 via-card/80 to-card/60 border border-white/10 rounded-3xl p-8 shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)' }}>
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              {contact.image_url ? (
                <img src={contact.image_url} alt={contact.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center ring-4 ring-primary/20">
                  <span className="text-3xl font-bold text-primary">
                    {contact.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{contact.name}</h1>
              {contact.position && <p className="text-muted-foreground mt-1">{contact.position}</p>}
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6">
              {contact.club_name && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30">
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{contact.club_name}</span>
                </div>
              )}
              {contact.country?.trim() && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30">
                  <img src={getCountryFlagUrl(contact.country.trim())} alt={contact.country.trim()} className="w-6 h-4 object-cover rounded-sm shrink-0" />
                  <span>{contact.city ? `${contact.city}, ` : ''}{contact.country.trim()}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {contact.phone && (
                <a
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors font-medium"
                >
                  <FaWhatsapp className="h-5 w-5" />WhatsApp
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary transition-colors font-medium"
                >
                  <Mail className="h-5 w-5" />Email
                </a>
              )}
              <Button onClick={downloadVCard} variant="outline" className="w-full rounded-xl py-3 h-auto">
                <Download className="h-5 w-5 mr-2" />Add to Contacts
              </Button>
            </div>

            {/* Branding */}
            <div className="text-center mt-8 pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground">Shared via Rise Football Agency</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SharedContact;
