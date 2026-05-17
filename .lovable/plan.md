## Problem

1. `/highlights-login` still renders a "Password (optional)" field. Highlights Makers should sign in with just a username — no password input at all.
2. When creating an account from **Staff → Staff Accounts**, there is no "Highlights Maker" option, so picking any role there goes through the normal flow that requires an email + password and creates a real Supabase auth user. Highlights Makers should never get an auth user, an `@rise.local` email, or a password — they live only in the `highlight_makers` table.

## Fix

### 1. `src/pages/HighlightsLogin.tsx`
- Delete the password `<Input>`, its `<Label>`, and the `password` state entirely.
- Send only `{ username }` to the `highlight-maker-login-check` edge function (the function already treats password as optional).
- Keep "Remember me" and the existing welcome / error toasts unchanged.

### 2. `src/components/staff/StaffAccountManagement.tsx`
Add Highlights Maker as a first-class option in the **Create account** form, so the user never has to leave the Staff Accounts section.

- Inject a synthetic entry `{ role_key: "highlights_maker", role_label: "Highlights Maker" }` into the role dropdown (kept client-side; not added to `available_roles` because it isn't a real app_role).
- When `newAccount.role === "highlights_maker"`:
  - Re-label the "Email or username" field to **Username** and hide the password field and "(optional)" hint entirely.
  - Skip the `@rise.local` synthesis, skip auto-generating a password, skip the `create-staff-account` edge function, and skip the post-create credentials panel.
  - Insert directly into `public.highlight_makers` with `{ username, display_name: full_name, password: "", status: "active" }`. Toast "Highlights Maker created" on success and reset the form.
- For every other role keep the current behaviour exactly as it is (email-or-username, password optional only for `stats_updater`, etc.).
- Existing Highlights Maker accounts are still fully managed (assign players, disable, delete, edit) from the dedicated **Tools → Highlights Makers** section — no need to duplicate that table here.

### 3. `src/components/staff/HighlightMakersManagement.tsx`
Already password-free after the previous change. No edits needed; just verifying the form still has only Display name + Username so the two entry points behave identically.

### 4. No database, edge function, or routing changes
- `highlight_makers` table, RLS, and the two edge functions (`highlight-maker-login-check`, `highlight-maker-data`) already support password-less sign-in.
- `supabase/config.toml` already has `verify_jwt = false` on both functions.

## Out of scope
- No changes to the highlights portal workspace, clip download, or playlist logic.
- No changes to other staff roles, the staff login page, or `create-staff-account`.
