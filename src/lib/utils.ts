import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScoreWithFrequency(score: number): string {
  if (score === 0) return "0.00 (never)";
  const frequency = Math.round(1 / score);
  return `${score.toFixed(2)} (1 in ${frequency})`;
}
