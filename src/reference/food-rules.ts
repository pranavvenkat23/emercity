/**
 * Fixed food-safety timers for outages (§11.1, §11.3): fridge 4 hours with
 * the door closed; full freezer about 48 hours, half full about 24 hours.
 *
 * Source: USDA Food Safety and Inspection Service, "Keep Your Food Safe
 * During Emergencies" (checked 2026-10-24). Loudoun County's January 2026
 * winter storm advice repeats the 4-hour fridge rule (spec §11.2).
 */
export const FOOD_RULES = {
  fridgeHours: 4,
  freezerFullHours: 48,
  freezerHalfHours: 24,
  sourceName: 'USDA FSIS',
  sourceUrl: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/emergencies/keep-your-food-safe-during-emergencies',
  verified: true,
} as const;
