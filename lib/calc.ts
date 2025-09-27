export function minutesBetween(startMin: number, endMin: number) {
  if (endMin >= startMin) return endMin - startMin;
  return (24 * 60 - startMin) + endMin; // cross-midnight
}

export function minsToHours(mins: number) {
  return mins / 60;
}

export function round2(v: number) {
  return Math.round(v * 100) / 100;
}

export type TaxProfile = { mode: "flat"; flatPct: number }; // extend later for bands

export function computePay(params: {
  hours: number;
  baseRate: number;
  multiplier: number;
  taxProfile: TaxProfile;
}) {
  const { hours, baseRate, multiplier, taxProfile } = params;
  const gross = hours * baseRate * multiplier;
  const tax = taxProfile.mode === "flat" ? gross * taxProfile.flatPct : 0;
  const net = gross - tax;
  return {
    gross: round2(gross),
    tax_withheld: round2(tax),
    net: round2(net),
  };
}
