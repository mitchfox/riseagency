import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface LeagueRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeagueRulesDialog = ({ open, onOpenChange }: LeagueRulesDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 md:p-6 pb-0">
          <DialogTitle className="text-xl font-bebas uppercase">Foreign Player Rules</DialogTitle>
          <p className="text-sm text-muted-foreground">League regulations around the world</p>
        </DialogHeader>
        <ScrollArea className="h-[70vh] px-4 md:px-6 pb-6">
          <div className="space-y-6">
            {/* Europe */}
            <section>
              <h3 className="font-bebas text-lg text-primary mb-3">EUROPE</h3>
              <div className="space-y-4">
                <RuleItem
                  country="England"
                  rule="No direct foreign player limit. Max 17 non-homegrown players in 25-man squad. At least 8 must be homegrown (played for English FA-affiliated club for 3 years before age 21)."
                />
                <RuleItem
                  country="Italy"
                  rule="No direct limit. Quota system for non-EU players. 8 of 25 must be trained in Italy (4 from club's youth system). Max 2 new non-EU players per season."
                />
                <RuleItem
                  country="Spain"
                  rule="Max 3 non-EU player transfers per club. No restrictions for EU players."
                />
                <RuleItem
                  country="France"
                  rule="4 non-EU foreign players allowed. Players from African countries under Cotonou Agreement exempt from restriction."
                />
                <RuleItem
                  country="Germany"
                  rule="Min 12 German players. 8 must come through youth systems (4 from club's own academy, 4 from other German clubs)."
                />
                <RuleItem
                  country="Netherlands"
                  rule="No quota for foreign players. Special minimum salary criterion applies only to non-EU transfers."
                />
                <RuleItem
                  country="Portugal"
                  rule="No direct limit. Min 8 locally trained players required (10 for clubs with B teams)."
                />
                <RuleItem
                  country="Belgium"
                  rule="No max foreign player rule. Min 6 home-grown players in match squad (3 years at Belgian club before age 23)."
                />
                <RuleItem
                  country="Poland"
                  rule="No restrictions. Fully open to foreign transfers since 2019/20."
                />
                <RuleItem
                  country="Austria"
                  rule="Max 7 foreign players in match squad. Exceeding limit results in loss of Bundesliga financial support."
                />
                <RuleItem
                  country="Romania"
                  rule="Max 3 non-EU players who must have national team experience. Min 1 U21-eligible Romanian player per match."
                />
                <RuleItem
                  country="Greece"
                  rule="Super League 1: Unlimited EU players, max 7 non-EU. Super League 2: Min 6 Greek players, max 5 non-EU on pitch."
                />
                <RuleItem
                  country="Turkey"
                  rule="Max 14 foreign players (at least 2 born on/after 1 Jan 2003). Squad max 28 players with min 14 Turkish national team eligible. 2 goalkeepers must be local."
                />
              </div>
            </section>

            <Separator />

            {/* Americas */}
            <section>
              <h3 className="font-bebas text-lg text-primary mb-3">NORTH & SOUTH AMERICA</h3>
              <div className="space-y-4">
                <RuleItem
                  country="USA/Canada (MLS)"
                  rule="International player slots system (avg 8 per team, tradeable). US: citizenship, Green Card or special status = domestic. Canada: min 3 Canadian players required."
                />
                <RuleItem
                  country="Mexico"
                  rule="Max 9 foreign players registered. Max 8 in match squad, max 7 on pitch simultaneously."
                />
                <RuleItem
                  country="Brazil"
                  rule="No transfer restrictions. Max 9 foreign players per match (rest must bench)."
                />
                <RuleItem
                  country="Argentina"
                  rule="Max 6 foreign players signed. Max 5 in match squad."
                />
                <RuleItem
                  country="Colombia"
                  rule="Max 4 foreign players transferred. Max 3 on pitch simultaneously."
                />
              </div>
            </section>

            <Separator />

            {/* Asia */}
            <section>
              <h3 className="font-bebas text-lg text-primary mb-3">ASIA</h3>
              <div className="space-y-4">
                <RuleItem
                  country="Japan"
                  rule="No registration limit since 2019. Match squad: J1 max 5, J2/J3 max 4 foreigners. Partner countries (Thailand, Vietnam, Myanmar, etc.) exempt."
                />
                <RuleItem
                  country="India"
                  rule="Max 6 foreign players registered. Max 4 on pitch. Min 1 must be from AFC country."
                />
                <RuleItem
                  country="Indonesia"
                  rule="11 foreign players total: 7 on pitch, 2 on bench, 2 in stands (2025 season)."
                />
                <RuleItem
                  country="Russia"
                  rule="Max 13 foreigners in squad, max 8 on pitch. Drops to 10 from 2026. Belarus, Kazakhstan, Armenia, Kyrgyzstan exempt."
                />
                <RuleItem
                  country="Saudi Arabia"
                  rule="Max 10 foreign players. 8 on pitch, 2 on bench."
                />
              </div>
            </section>

            <Separator />

            {/* Africa */}
            <section>
              <h3 className="font-bebas text-lg text-primary mb-3">AFRICA</h3>
              <div className="space-y-4">
                <RuleItem
                  country="Algeria"
                  rule="Max 27 players registered, only 4 can be foreign."
                />
                <RuleItem
                  country="Libya"
                  rule="Max 25 players registered, up to 7 foreign allowed."
                />
                <RuleItem
                  country="South Africa"
                  rule="Max 5 foreign players in squad."
                />
              </div>
            </section>

            <div className="pt-4 text-xs text-muted-foreground">
              Source: Transfermarkt – Foreign player rules around the world
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const RuleItem = ({ country, rule }: { country: string; rule: string }) => (
  <div className="space-y-1">
    <h4 className="font-semibold text-sm">{country}</h4>
    <p className="text-sm text-muted-foreground leading-relaxed">{rule}</p>
  </div>
);
