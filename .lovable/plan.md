
## Goal

Paste the complete Investor Portal source into chat, in sequential chunks, so you can copy it into the other site. No code changes to this project.

## Files to send (in order)

1. `src/pages/InvestorsPortal.tsx` — 4,176 lines. Sent in 4 parts:
   - Part 1: lines 1–1200
   - Part 2: lines 1201–2400
   - Part 3: lines 2401–3400
   - Part 4: lines 3401–4176
2. `src/hooks/useInvestorSession.ts` — 48 lines (single message)
3. `src/components/investor/InvestmentOverview.tsx`
4. `src/components/investor/CapacityPlanner.tsx`
5. `src/components/investor/ExecutiveSupport.tsx`
6. `src/components/investor/OpsBoard.tsx`
7. `src/components/investor/InvestorHighlineLog.tsx`
8. PWA support files added earlier: `public/manifest-investors.json`, `public/investors-portal.html`, and the `_redirects` entry.

## Delivery rules

- Each turn: paste as much file content as fits inside a single fenced code block up to the message character limit, then stop.
- Every chunk is prefixed with the file path and the line range it covers, so you can concatenate them cleanly.
- I will wait for your "continue" before sending the next chunk.
- No summarising, no truncation inside a chunk — raw source only.

Approve and I'll start with Part 1 of `InvestorsPortal.tsx` in the next message.
