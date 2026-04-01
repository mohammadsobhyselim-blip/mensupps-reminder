import { addDays } from '../utils/timeHelper';

const PATTERNS = [
  /(\d+)\s*servings/i,
  /(\d+)\s*serving/i,
  /(\d+)\s*capsules/i,
  /(\d+)\s*caps/i,
  /(\d+)\s*tablets/i,
  /(\d+)\s*tabs/i,
  /(\d+)\s*scoops/i,
  /(\d+)\s*softgels/i,
];

export function extractServings(title: string, description: string): number | null {
  const text = `${title} ${description}`;
  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const val = parseInt(match[1]);
      if (val > 0 && val < 1000) return val;
    }
  }
  return null;
}

export function calcPrediction(servings: number, dailyUsage = 1, from = new Date()) {
  const duration = Math.floor(servings / dailyUsage);
  return {
    estimatedEndDate:   addDays(from, duration),
    reorderTriggerDate: addDays(from, Math.floor(duration * 0.80)),
    daysLeft: duration,
  };
}

export function defaultServings(timingCategory: string): number {
  const defaults: Record<string, number> = {
    MORNING: 30, WITH_MEALS: 60, PRE_WORKOUT: 30,
    POST_WORKOUT: 30, BEFORE_SLEEP: 30, ANYTIME: 30,
  };
  return defaults[timingCategory] ?? 30;
}
