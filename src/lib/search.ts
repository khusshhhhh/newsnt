/** Strip characters that would break PostgREST's `.or()` mini-syntax (commas split conditions, parens group them). */
export function sanitizeSearchTerm(query: string) {
  return query.replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
}

/** Escape ILIKE metacharacters so a literal "%" or "_" in a search doesn't act as a wildcard. */
export function escapeLikePattern(term: string) {
  return term.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * A safe `%term%` ILIKE pattern for use inside `.or()`, or null when the
 * query is empty after cleaning (callers should skip the filter then).
 */
export function ilikeContainsPattern(query: string | null | undefined): string | null {
  const term = sanitizeSearchTerm(query ?? "");
  if (!term) return null;
  return `%${escapeLikePattern(term)}%`;
}
