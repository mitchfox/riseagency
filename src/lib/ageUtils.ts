/**
 * Calculate whole-number age from date of birth
 */
export const calculateAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

/**
 * Calculate precise age in years (with decimals) from date of birth.
 * Used for comparing against min_contact_age rules like 15.5
 */
export const calculatePreciseAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  const diffMs = today.getTime() - dob.getTime();
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
};

/**
 * Calculate the date when a player reaches a specific age.
 * Supports decimals: e.g. 15.5 = 15 years and 6 months after DOB.
 */
export const getEligibleDate = (dateOfBirth: string, minAge: number): Date => {
  const dob = new Date(dateOfBirth);
  const years = Math.floor(minAge);
  const fractionalYears = minAge - years;
  const months = Math.round(fractionalYears * 12);
  const eligible = new Date(dob);
  eligible.setFullYear(eligible.getFullYear() + years);
  eligible.setMonth(eligible.getMonth() + months);
  return eligible;
};
