/**
 * Joins conditional class name fragments. No conflict resolution (no
 * tailwind-merge dependency) — callers are responsible for not passing
 * contradictory utility classes for the same property.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
