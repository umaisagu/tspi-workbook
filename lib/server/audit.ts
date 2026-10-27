/** Audit columns for a new record. */
export function created(actorId: string) {
  return { createdById: actorId, updatedById: actorId };
}

/** Audit columns for an update. */
export function updated(actorId: string) {
  return { updatedById: actorId };
}
