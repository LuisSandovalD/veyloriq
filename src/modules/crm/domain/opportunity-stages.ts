export const DEFAULT_OPPORTUNITY_STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export function opportunityStagesFromSettings(settings: unknown): string[] {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return [...DEFAULT_OPPORTUNITY_STAGES];
  }
  const value = (settings as Record<string, unknown>).opportunityStages;
  if (!Array.isArray(value)) return [...DEFAULT_OPPORTUNITY_STAGES];
  const stages = value.filter(
    (stage): stage is string =>
      typeof stage === "string" && /^[A-Z][A-Z0-9_]{1,39}$/.test(stage),
  );
  return stages.length >= 2
    ? [...new Set(stages)]
    : [...DEFAULT_OPPORTUNITY_STAGES];
}
