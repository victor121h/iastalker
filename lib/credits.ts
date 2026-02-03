const CREDITS_KEY = 'user_credits';
const SEARCH_DONE_KEY = 'search_done';
const DEFAULT_CREDITS = 25;

export function getCredits(): number {
  if (typeof window === 'undefined') return DEFAULT_CREDITS;
  const stored = localStorage.getItem(CREDITS_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_CREDITS;
}

export function setCredits(amount: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CREDITS_KEY, amount.toString());
}

export function deductCredits(amount: number): boolean {
  const current = getCredits();
  if (current >= amount) {
    setCredits(current - amount);
    return true;
  }
  return false;
}

export function hasSearched(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SEARCH_DONE_KEY) === 'true';
}

export function setSearchDone(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEARCH_DONE_KEY, 'true');
}

export function resetSearch(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEARCH_DONE_KEY);
}
