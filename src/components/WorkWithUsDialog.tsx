import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Role = "player" | "coach" | "club" | "agent" | "parent" | "media" | "other" | null;

interface WorkWithUsDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const WorkWithUsDialog = ({ children, open, onOpenChange }: WorkWithUsDialogProps) => {
  const [selectedRole, setSelectedRole] = useState<Role>(null);

  const resetSelection = () => setSelectedRole(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetSelection();
    }
    onOpenChange?.(isOpen);
  };

  const roles = [
    { value: "player" as const, label: "Player" },
    { value: "coach" as const, label: "Coach" },
    { value: "club" as const, label: "Club" },
    { value: "agent" as const, label: "Agent" },
    { value: "parent" as const, label: "Parent" },
    { value: "media" as const, label: "Media" },
    { value: "other" as const, label: "Other" },
  ];

  const renderRoleForm = () => {
    if (!selectedRole) {
      return (
        <div className="space-y-4">
          <p className="text-center text-muted-foreground mb-6">
            Please select your role to continue
          </p>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => (
              <Button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                size="lg"
                className="font-bebas uppercase tracking-wider text-lg h-16"
              >
                {role.label}
              </Button>
            ))}
          </div>
        </div>
      );
    }

    // Common fields for all forms
    const commonFields = (
      <>
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" placeholder="john@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp Number *</Label>
          <Input id="whatsapp" type="tel" placeholder="+1 (555) 000-0000" required />
        </div>
      </>
    );

    // Role-specific forms
    switch (selectedRole) {
      case "player":
        return (
          <form className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              ← Back to role selection
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" placeholder="e.g., Striker, Midfielder" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input id="age" type="number" placeholder="21" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentClub">Current Club</Label>
              <Input id="currentClub" placeholder="Your current club" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about yourself</Label>
              <Textarea
                id="message"
                placeholder="Share your experience, goals, and what you're looking for..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Application
            </Button>
          </form>
        );

      case "coach":
        return (
          <form className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              ← Back to role selection
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization *</Label>
              <Input id="specialization" placeholder="e.g., Youth Development, First Team" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenses">Coaching Licenses</Label>
              <Input id="licenses" placeholder="UEFA A, B, etc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience *</Label>
              <Input id="experience" type="number" placeholder="5" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about your coaching philosophy</Label>
              <Textarea
                id="message"
                placeholder="Share your experience, approach, and what you're looking for..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Application
            </Button>
          </form>
        );

      case "club":
        return (
          <form className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              ← Back to role selection
            </Button>
            <div className="space-y-2">
              <Label htmlFor="clubName">Club Name *</Label>
              <Input id="clubName" placeholder="Your Club Name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Person *</Label>
              <Input id="contactName" placeholder="Full Name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="contact@club.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number *</Label>
              <Input id="whatsapp" type="tel" placeholder="+1 (555) 000-0000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="league">League/Division *</Label>
              <Input id="league" placeholder="e.g., Championship, League Two" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What are you looking for?</Label>
              <Textarea
                id="message"
                placeholder="Player recruitment, coaching staff, scouting services..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      case "agent":
        return (
          <form className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              ← Back to role selection
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="agency">Agency Name</Label>
              <Input id="agency" placeholder="Your agency name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license">FIFA License Number</Label>
              <Input id="license" placeholder="If applicable" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">How can we collaborate?</Label>
              <Textarea
                id="message"
                placeholder="Tell us about potential collaboration opportunities..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      case "parent":
        return (
          <form className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              ← Back to role selection
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="playerName">Player's Name *</Label>
              <Input id="playerName" placeholder="Your child's name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playerAge">Player's Age *</Label>
              <Input id="playerAge" type="number" placeholder="16" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" placeholder="e.g., Striker, Midfielder" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentClub">Current Club/Academy</Label>
              <Input id="currentClub" placeholder="Current club or academy" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about the player</Label>
              <Textarea
                id="message"
                placeholder="Share their experience, strengths, and aspirations..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Application
            </Button>
          </form>
        );

      case "media":
        return (
          <form className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              ← Back to role selection
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="outlet">Media Outlet *</Label>
              <Input id="outlet" placeholder="Publication/Channel name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Your Role *</Label>
              <Input id="role" placeholder="e.g., Journalist, Content Creator" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What's your inquiry about?</Label>
              <Textarea
                id="message"
                placeholder="Interview requests, press releases, media partnerships..."
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      case "other":
        return (
          <form className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetSelection}
              className="mb-2"
            >
              ← Back to role selection
            </Button>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" placeholder="What is this regarding?" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Tell us how we can help you..."
                className="min-h-[120px]"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-shine font-bebas uppercase tracking-wider">
              Submit Inquiry
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bebas uppercase tracking-wider">
            {selectedRole ? `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Application` : "Work With Us"}
          </DialogTitle>
          <DialogDescription>
            {!selectedRole
              ? "Choose your role to get started"
              : "Fill out the form below and we'll get back to you soon"}
          </DialogDescription>
        </DialogHeader>
        {renderRoleForm()}
      </DialogContent>
    </Dialog>
  );
};
