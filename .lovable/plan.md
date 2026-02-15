

# Fix: Remove Hardcoded Role Constraint

## Problem
The `role_permissions` table has a CHECK constraint (`role_permissions_role_check`) that only permits three values: `admin`, `staff`, and `marketeer`. Any new role created via the Role Permissions Editor is blocked by this constraint.

## Solution
Drop the CHECK constraint entirely. The `available_roles` table already serves as the source of truth for valid roles, so the constraint is redundant and actively prevents the dynamic role creation feature from working.

## Technical Details

**Database migration (single statement):**
```sql
ALTER TABLE public.role_permissions DROP CONSTRAINT role_permissions_role_check;
```

No code changes are needed — the `RolePermissionsEditor.tsx` and `manage-roles` edge function are already correct. This is purely a database constraint removal.

