export type RmdOwner = "you" | "partner";

export interface RmdCalculation {
  age: number;
  applicableAge: number | null;
  denominator: number | null;
  priorYearEndBalance: number;
  requiredDistribution: number;
  status: "not-required" | "required" | "needs-review";
}

// IRS Publication 590-B (2025), Appendix B, Table III (Uniform Lifetime).
// Age 120 and above uses the final 2.0 denominator.
const UNIFORM_LIFETIME_DENOMINATORS: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
  84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
  90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0,
  102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1,
  108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1,
  114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
  120: 2.0,
};

/**
 * Returns the statutory applicable age when birth year alone is sufficient.
 * Treasury's final regulations reserve the 1959 rule, so the planner does not
 * guess for that birth year. People born before 1951 were already RMD-eligible
 * before this planner's 2026 base year; 72 is enough to model future years.
 */
export function rmdApplicableAge(birthYear: number): number | null {
  if (!Number.isInteger(birthYear) || birthYear <= 0) return null;
  if (birthYear <= 1950) return 72;
  if (birthYear <= 1958) return 73;
  if (birthYear === 1959) return null;
  return 75;
}

export function calculateRmd({
  birthYear,
  calendarYear,
  age,
  priorYearEndBalance,
}: {
  birthYear: number;
  calendarYear: number;
  age: number;
  priorYearEndBalance: number;
}): RmdCalculation {
  const applicableAge = rmdApplicableAge(birthYear);
  const balance = Math.max(0, priorYearEndBalance);
  if (!applicableAge) {
    return {
      age,
      applicableAge: null,
      denominator: null,
      priorYearEndBalance: balance,
      requiredDistribution: 0,
      status: birthYear === 1959 ? "needs-review" : "not-required",
    };
  }

  const firstRmdYear = birthYear <= 1950 ? 2026 : birthYear + applicableAge;
  if (calendarYear < firstRmdYear || age < applicableAge || balance === 0) {
    return {
      age,
      applicableAge,
      denominator: null,
      priorYearEndBalance: balance,
      requiredDistribution: 0,
      status: "not-required",
    };
  }

  const denominator = UNIFORM_LIFETIME_DENOMINATORS[Math.min(120, Math.max(72, Math.floor(age)))];
  return {
    age,
    applicableAge,
    denominator,
    priorYearEndBalance: balance,
    requiredDistribution: denominator ? balance / denominator : 0,
    status: denominator ? "required" : "needs-review",
  };
}
