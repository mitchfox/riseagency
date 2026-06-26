import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export const WhatsAppWidget = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useLanguage();

  return (
    <a
      href="https://wa.me/447508342901"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))] text-black hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      aria-label="Chat on WhatsApp"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full">
        <MessageCircle className="w-6 h-6 text-black" />
      </div>
      <span
        className={`font-bebas uppercase tracking-wider text-sm pr-5 transition-all duration-300 overflow-hidden whitespace-nowrap text-black group-hover:text-black ${
          isHovered ? "max-w-48 opacity-100" : "max-w-0 opacity-0 pr-0"
        }`}
      >
        {t('whatsapp_widget.label', 'Chat With Us')}
      </span>
    </a>
  );
};
