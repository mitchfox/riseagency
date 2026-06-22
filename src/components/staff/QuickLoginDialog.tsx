import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ShieldAlert, KeyRound, ArrowRight, ArrowLeft, ExternalLink } from "lucide-react";

interface QuickLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { userId: string; email: string; fullName: string; role: string } | null;
}

// Build a noisy random challenge phrase that is annoying to copy/paste in
// muscle memory but trivial to retype carefully. Mixing in the role + first
// half of the email also makes it obvious which account is being unlocked.
const buildChallenge = (target: QuickLoginDialogProps["target"]) => {
  if (!target) return "";
  const tokens = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 4 })
    .map(() => tokens[Math.floor(Math.random() * tokens.length)])
    .join("");
  const handle = (target.email.split("@")[0] || "").slice(0, 8).toUpperCase();
  return `VIEW-${handle || "STAFF"}-${rand}`;
};

export const QuickLoginDialog = ({ open, onOpenChange, target }: QuickLoginDialogProps) => {
  const [step, setStep] = useState(1);
  const [challenge, setChallenge] = useState("");
  const [typedChallenge, setTypedChallenge] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLink, setActionLink] = useState<string | null>(null);

  // Regenerate challenge whenever the dialog reopens or target changes so
  // the same phrase can't be reused twice for the same account.
  useEffect(() => {
    if (open) {
      setStep(1);
      setChallenge(buildChallenge(target));
      setTypedChallenge("");
      setReason("");
      setPassword("");
      setActionLink(null);
    }
  }, [open, target]);

  const canAdvanceStep1 = useMemo(
    () => typedChallenge.trim().toUpperCase() === challenge.toUpperCase(),
    [typedChallenge, challenge],
  );
  const canAdvanceStep2 = reason.trim().length >= 10;
  const canSubmit = password.trim().length >= 4;

  const handleSubmit = async () => {
    if (!target) return;
    const adminUserId =
      localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
    if (!adminUserId) {
      toast.error("Not authenticated");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/staff-impersonate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_user_id: adminUserId,
            admin_password: password,
            target_user_id: target.userId,
            reason,
            challenge_typed: typedChallenge,
            challenge_expected: challenge,
            redirect_to: `${window.location.origin}/staff`,
          }),
        },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not issue link");
      setActionLink(result.action_link);
      setStep(4);
      toast.success("Quick-login link ready. Open it in a private window.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Quick login as {target?.fullName || target?.email}
          </DialogTitle>
          <DialogDescription>
            Issue a single-use sign-in link so you can see the portal exactly as
            this account does. Every step here is audit logged.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full ${
                  step >= n ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Read this first.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>You will be signed in as another staff member.</li>
                  <li>Do this on a private/incognito window so you don't lose your own session.</li>
                  <li>Every quick login is logged with your name, target, reason and time.</li>
                  <li>Never use this to perform destructive actions on another person's behalf.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label>Type this confirmation phrase to continue</Label>
                <div className="rounded-md border border-primary/30 bg-muted/30 px-3 py-2 font-mono text-base tracking-wider text-primary">
                  {challenge}
                </div>
                <Input
                  value={typedChallenge}
                  onChange={(e) => setTypedChallenge(e.target.value.toUpperCase())}
                  placeholder="Type the phrase exactly"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label htmlFor="reason">Reason for quick login</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Debugging a permissions bug Anthony reported on his analyst account"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters. This is saved against your name in the audit log.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label htmlFor="admin-pw" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Re-enter your own password
              </Label>
              <Input
                id="admin-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your admin password"
                autoComplete="current-password"
              />
              <p className="text-xs text-muted-foreground">
                We re-verify your password on the server. A failed attempt is logged.
              </p>
            </div>
          )}

          {step === 4 && actionLink && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
                <p className="font-medium text-primary">Link ready.</p>
                <p className="mt-1 text-muted-foreground">
                  Open it in a <strong>private/incognito window</strong> so it
                  doesn't sign you out of your own admin session. The link can
                  only be used once.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <a href={actionLink} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(actionLink);
                    toast.success("Link copied — paste into a private window");
                  }}
                >
                  Copy link
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          {step > 1 && step < 4 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step === 1 && (
            <Button disabled={!canAdvanceStep1} onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button disabled={!canAdvanceStep2} onClick={() => setStep(3)}>
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Issue quick-login link
            </Button>
          )}
          {step === 4 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};