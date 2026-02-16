import confetti from "canvas-confetti";

export const fireMilestoneConfetti = () => {
  // Gold-themed confetti burst
  const defaults = {
    spread: 360,
    ticks: 80,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: ["#C4A55A", "#FFD700", "#FFFFFF", "#F5E6B8"],
  };

  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ["star"],
  });

  confetti({
    ...defaults,
    particleCount: 20,
    scalar: 0.75,
    shapes: ["circle"],
  });
};

export const checkAndFireConfetti = (
  currentR90: number,
  previousBestR90: number | null
) => {
  if (previousBestR90 === null) return false;
  if (currentR90 > previousBestR90) {
    // Short delay so the UI renders first
    setTimeout(() => fireMilestoneConfetti(), 500);
    return true;
  }
  return false;
};
