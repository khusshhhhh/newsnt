/** Minimum time a trashed inquiry must sit before it can be permanently deleted — not an auto-purge, just a floor an admin can act after. */
export const TRASH_RETENTION_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

export function trashEligibleAt(deletedAt: string): Date {
  return new Date(new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * DAY_MS);
}

export function isEligibleForPermanentDelete(deletedAt: string): boolean {
  return trashEligibleAt(deletedAt).getTime() <= Date.now();
}

/** Whole days remaining until eligible, 0 once it's eligible. */
export function daysUntilEligible(deletedAt: string): number {
  const remainingMs = trashEligibleAt(deletedAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(remainingMs / DAY_MS));
}
