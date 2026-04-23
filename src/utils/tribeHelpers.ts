import { renderMoons } from './assets';

/** Returns a moon-phase emoji representing the tribe's average host rating. */
export const calculateTribeMoons = (tribe: any): string => {
  const sum: number = tribe?.ratingSum ?? 0;
  const count: number = tribe?.ratingCount ?? 0;
  return renderMoons(sum, count);
};