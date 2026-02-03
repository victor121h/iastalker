const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck', 'xcod'];

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  src?: string;
  sck?: string;
  xcod?: string;
}

export const extractUTMsFromUrl = (): UTMParams => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const utms: UTMParams = {};
  
  UTM_KEYS.forEach(key => {
    const value = params.get(key);
    if (value) {
      utms[key as keyof UTMParams] = value;
    }
  });
  
  return utms;
};

export const hasUTMs = (utms: UTMParams): boolean => {
  return Object.keys(utms).length > 0;
};

export const saveUTMsForUsername = async (username: string, utms: UTMParams): Promise<boolean> => {
  try {
    const response = await fetch('/api/utms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, utms }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error saving UTMs:', error);
    return false;
  }
};

export const getUTMsForUsername = async (username: string): Promise<UTMParams | null> => {
  try {
    const response = await fetch(`/api/utms?username=${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.utms;
  } catch (error) {
    console.error('Error fetching UTMs:', error);
    return null;
  }
};

export const buildUrlWithUTMs = (basePath: string, utms: UTMParams): string => {
  if (!hasUTMs(utms)) return basePath;
  
  const params = new URLSearchParams();
  Object.entries(utms).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  
  return `${basePath}?${params.toString()}`;
};

export const storeCurrentUTMs = (): void => {
  if (typeof window === 'undefined') return;
  
  const utms = extractUTMsFromUrl();
  if (hasUTMs(utms)) {
    sessionStorage.setItem('current_utms', JSON.stringify(utms));
  }
};

export const getCurrentStoredUTMs = (): UTMParams => {
  if (typeof window === 'undefined') return {};
  
  const stored = sessionStorage.getItem('current_utms');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return extractUTMsFromUrl();
};
