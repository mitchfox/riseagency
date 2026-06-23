// Shared configuration for the club / agent proposal page (key details
// tiles + post-video section ordering). Used by the staff editor in
// ClubOutreachManager and rendered by ClubOutreachProposal.

export type KeyDetailKind =
  // Auto-pulled from the player record
  | "club"
  | "age"
  | "nationality"
  | "league"
  | "position"
  | "contract_expiry"
  | "current_salary"
  // Typed per link (value lives on the key_details item itself)
  | "salary_expectations"
  | "transfer_fee"
  | "contract_expiry_override"
  | "height"
  | "preferred_foot"
  | "status"
  | "custom";

export interface KeyDetailItem {
  kind: KeyDetailKind;
  // Used by typed kinds + custom
  label?: string;
  value?: string;
}

export const DEFAULT_KEY_DETAILS: KeyDetailItem[] = [
  { kind: "club" },
  { kind: "position" },
  { kind: "age" },
  { kind: "nationality" },
  { kind: "league" },
  { kind: "contract_expiry" },
];

// Whether a key-detail kind carries free-text data on the link itself.
export const KEY_DETAIL_HAS_VALUE: Record<KeyDetailKind, boolean> = {
  club: false,
  age: false,
  nationality: false,
  league: false,
  position: false,
  contract_expiry: false,
  current_salary: false,
  salary_expectations: true,
  transfer_fee: true,
  contract_expiry_override: true,
  height: true,
  preferred_foot: true,
  status: true,
  custom: true,
};

export const KEY_DETAIL_LABELS: Record<KeyDetailKind, string> = {
  club: "Club",
  age: "Age",
  nationality: "Nationality",
  league: "League",
  position: "Position",
  contract_expiry: "Contract expiry",
  current_salary: "Current salary",
  salary_expectations: "Salary expectations",
  transfer_fee: "Transfer fee",
  contract_expiry_override: "Contract expiry",
  height: "Height",
  preferred_foot: "Preferred foot",
  status: "Status",
  custom: "Custom",
};

export type ProposalSectionKey =
  | "fit"
  | "situation"
  | "cards"
  | "form"
  | "in_numbers"
  | "season_stats"
  | "strengths";

export const DEFAULT_SECTION_ORDER: ProposalSectionKey[] = [
  "fit",
  "situation",
  "cards",
  "form",
  "in_numbers",
  "season_stats",
  "strengths",
];

export const SECTION_LABELS: Record<ProposalSectionKey, string> = {
  fit: "Fit & Recommendation",
  situation: "Situation",
  cards: "Video & Data / Proof cards",
  form: "Form",
  in_numbers: "In Numbers",
  season_stats: "Season Stats",
  strengths: "Strengths & Play Style",
};

export function normaliseKeyDetails(input: unknown): KeyDetailItem[] {
  if (!Array.isArray(input)) return DEFAULT_KEY_DETAILS;
  const out: KeyDetailItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const kind = (raw as any).kind as KeyDetailKind;
    if (!kind || !(kind in KEY_DETAIL_HAS_VALUE)) continue;
    out.push({
      kind,
      label: typeof (raw as any).label === "string" ? (raw as any).label : undefined,
      value: typeof (raw as any).value === "string" ? (raw as any).value : undefined,
    });
  }
  return out.length ? out : DEFAULT_KEY_DETAILS;
}

export function normaliseSectionOrder(input: unknown): ProposalSectionKey[] {
  if (!Array.isArray(input)) return DEFAULT_SECTION_ORDER;
  const seen = new Set<ProposalSectionKey>();
  const out: ProposalSectionKey[] = [];
  for (const v of input) {
    if (typeof v !== "string") continue;
    const k = v as ProposalSectionKey;
    if (DEFAULT_SECTION_ORDER.includes(k) && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  // Append any missing sections at the end so a future-added section still renders.
  for (const k of DEFAULT_SECTION_ORDER) if (!seen.has(k)) out.push(k);
  return out;
}
