import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal } from "@/components/ScrollReveal";

const faqItems = [
  {
    questionKey: "faq.players.q1",
    questionDefault: "How do I get represented by RISE?",
    answerKey: "faq.players.a1",
    answerDefault:
      "We scout players across Europe and beyond. If you believe you have the talent and ambition to compete at a high level, reach out via our contact page or WhatsApp. We'll arrange a review of your footage and discuss next steps.",
  },
  {
    questionKey: "faq.players.q2",
    questionDefault: "What does RISE offer its players?",
    answerKey: "faq.players.a2",
    answerDefault:
      "We provide end-to-end career management including contract negotiation, club placement, performance analysis, personalised coaching programmes, marketing support and more. Every player gets access to our dedicated portal with video analysis, training plans and direct communication with the team.",
  },
  {
    questionKey: "faq.players.q3",
    questionDefault: "How does the player portal work?",
    answerKey: "faq.players.a3",
    answerDefault:
      "Each represented player receives login credentials to our bespoke portal. Inside you'll find match analyses, performance reports, highlight reels, training programmes and direct messaging with your agent. It's designed to keep you informed and developing at all times.",
  },
  {
    questionKey: "faq.players.q4",
    questionDefault: "Can clubs enquire about specific players?",
    answerKey: "faq.players.a4",
    answerDefault:
      "Absolutely. Clubs can declare interest in any player listed on this page, request our full portfolio, or contact us directly. We respond to all professional enquiries within 24 hours.",
  },
  {
    questionKey: "faq.players.q5",
    questionDefault: "What level of players does RISE represent?",
    answerKey: "faq.players.a5",
    answerDefault:
      "We work with players across a range of levels, from promising academy graduates to established professionals in Europe's top divisions. Our network spans multiple countries and leagues, allowing us to find the right fit for every player's career stage.",
  },
  {
    questionKey: "faq.players.q6",
    questionDefault: "Is there a cost to be represented?",
    answerKey: "faq.players.a6",
    answerDefault:
      "Players are never charged upfront fees. Our compensation is structured through industry-standard representation agreements, meaning we only succeed when you succeed.",
  },
];

export const PlayersFAQ = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <p className="text-primary uppercase tracking-[0.3em] text-xs md:text-sm font-medium mb-4">
              {t("faq.players.subtitle", "Common Questions")}
            </p>
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
              {t("faq.players.title", "Frequently Asked Questions")}
            </h2>
            <div className="w-16 h-px bg-primary mx-auto mt-6" />
          </div>
        </ScrollReveal>

        <Accordion type="single" collapsible className="space-y-3">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-border bg-secondary/30 px-6 data-[state=open]:border-primary/30 transition-colors"
            >
              <AccordionTrigger className="font-bebas text-lg md:text-xl uppercase tracking-wider text-foreground hover:text-primary py-5 hover:no-underline">
                {t(item.questionKey, item.questionDefault)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pb-6">
                {t(item.answerKey, item.answerDefault)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
