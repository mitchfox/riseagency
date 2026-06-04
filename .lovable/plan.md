## 1. Contract print — include existing signatures

Problem: when printing a contract from the staff side, signature images already saved on `signature_fields` aren't drawn on the PDF.

Fix in `src/lib/pdfExport.ts` / wherever `printSignedContractPDF` is called: when building the `fields` array, hydrate each field's `value` from the latest `signature_submissions` / `signature_fields.value` so existing signature data URLs are passed in. Verify the print path (not just the download path) merges the same source. No schema changes.

## 2. Video analysis — 413 on 3.5GB upload

Root cause: Supabase Storage's default per-object size cap rejects the file before TUS can finish. We removed the splitter last turn, so single-file uploads now hit the platform ceiling.

Fix: raise the `analysis-videos` bucket's `file_size_limit` to 6 GB (6442450944 bytes) via migration on `storage.buckets`. Keep the existing TUS upload code as-is (6 MiB chunks, retries). Add a client-side pre-check that rejects > 6 GB with a clear message instead of letting TUS fail.

## 3. Staff tab reload inside Lovable preview

Each tab click is triggering a full reload only inside the iframe. Likely culprit: `VersionManager.initialize` or a route guard re-running on tab change. `VersionManager` already short-circuits in preview, so investigate:
- `src/pages/Home.tsx` preview redirect to `/staff` firing on every navigation
- any `window.location.replace` or `window.location.href = ...` in staff tab handlers / `useSubdomainRouter`
- `_refresh=` query reappearing

Switch to `useNavigate` / `<Link>` everywhere a tab click currently sets `window.location`. Guard the preview redirect in `Home.tsx` so it doesn't fire when already on a staff route.

## 4. Investor Portal — Real Finances screenshot upload + AI parse

UI on the existing Real Finances tab:
- "Upload receipt/screenshot" button → uploads to existing `receipt-uploads` private bucket
- Thumbnail list of uploaded screenshots, each with a "Parse with AI" button
- After parsing, an inline form pre-fills: date, time, amount, item bought, location, plus an empty notes field (user fills notes manually)
- "Add to expenses" saves into the existing `expenses` (or `investor_spending`) table and the screenshot row gets a `parsed_at` / `expense_id` link so it shows as Done

New edge function `parse-receipt-image` calling Lovable AI Gateway (`google/gemini-3-flash-preview`) with the image and a JSON schema returning `{ date, time, amount, item, location }`. No new secrets — uses `LOVABLE_API_KEY`.

Schema: new `investor_receipts` table (id, user_id, image_path, parsed_data jsonb, expense_id nullable, created_at). RLS scoped to investor users; GRANTs for authenticated + service_role.

## 5. Mandate tracker on staff network map

Connect the **Google Maps Platform** connector (Lovable-managed) — it routes Geocoding, Places, Routes, and the browser Maps JS API through a gateway with the workspace's key. This will let us recalibrate club coordinates by geocoding club name + country instead of relying on whatever stored lat/lng is currently wrong.

New `staff_mandates` table:
- `id`, `club_name`, `club_country`, `lat`, `lng` (geocoded once on save)
- `agent_name`, `agent_firm`
- `player_ids` (uuid[] referencing players)
- `mandate_type` (buy/sell/loan)
- `status` (active/expired/closed)
- `start_date`, `end_date`
- `notes`
- standard timestamps + RLS for staff/admin only

UI:
- New "Mandates" section under staff network area with CRUD form (club autocomplete via Places API new, agent text, player multi-select)
- New map layer toggle on the existing network map that pins active mandates with a distinct gold marker, popover showing agent + players + status
- Geocoding done in edge function `geocode-club` via Google Maps gateway, lat/lng cached on the row

## Files / migrations

```text
new   supabase/functions/parse-receipt-image/index.ts
new   supabase/functions/geocode-club/index.ts
new   migration: bump analysis-videos file_size_limit; create investor_receipts; create staff_mandates
edit  src/lib/pdfExport.ts + caller (hydrate signatures into print)
edit  src/components/staff/coaching/VideoAnalysis.tsx (6GB pre-check + clearer error)
edit  src/pages/Home.tsx + staff nav handlers (stop window.location reloads in preview)
new   src/components/investor/ReceiptUploader.tsx
new   src/components/staff/MandateTracker.tsx + map layer integration
```

## Out of scope

- Reassembly UI for older split videos (legacy rows untouched)
- Changing finance reporting/analytics aggregation
- Backfilling existing club coordinates beyond what mandate creation triggers
