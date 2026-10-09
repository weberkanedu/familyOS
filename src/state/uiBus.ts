type UiEvent =
  | 'add:shopping'
  | 'add:message'
  | 'add:event'
  | 'add:chore'
  | 'add:word'
  | 'open:nutrition'
  | 'open:lessons'

const subs = new Set<(e: UiEvent) => void>()

/** Modüller arası mini sinyal köprüsü (FAB / hızlı ekleme için). */
export const uiBus = {
  emit(e: UiEvent) {
    for (const fn of Array.from(subs)) fn(e)
  },
  subscribe(fn: (e: UiEvent) => void): () => void {
    subs.add(fn)
    return () => subs.delete(fn)
  },
}

export type { UiEvent }
