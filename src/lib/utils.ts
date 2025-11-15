import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScoreWithFrequency(score: number | string | null): string {
  if (!score) return "0 (never)";
  
  // If it's a text value, just return it
  const numScore = typeof score === 'number' ? score : parseFloat(score);
  if (isNaN(numScore)) return String(score);
  
  if (numScore === 0) return "0 (never)";
  const frequency = Math.round(1 / numScore);
  return `${numScore} (1 in ${frequency})`;
}
