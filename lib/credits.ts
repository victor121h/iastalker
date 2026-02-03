const CREDITS_KEY = 'ia_observer_credits';
const SEARCH_DONE_KEY = 'ia_observer_search_done';
const USER_EMAIL_KEY = 'ia_observer_user_email';

export const getCredits = (): number => {
  if (typeof window === 'undefined') return 200;
  const stored = localStorage.getItem(CREDITS_KEY);
  if (stored === null) {
    localStorage.setItem(CREDITS_KEY, '200');
    return 200;
  }
  return parseInt(stored, 10);
};

export const setCredits = (amount: number): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CREDITS_KEY, amount.toString());
};

export const deductCredits = (amount: number): boolean => {
  const current = getCredits();
  if (current >= amount) {
    setCredits(current - amount);
    return true;
  }
  return false;
};

export const hasSearched = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SEARCH_DONE_KEY) === 'true';
};

export const setSearchDone = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEARCH_DONE_KEY, 'true');
};

export const getUserEmail = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_EMAIL_KEY);
};

export const setUserEmail = (email: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_EMAIL_KEY, email);
};

export const resetSearch = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEARCH_DONE_KEY);
};
