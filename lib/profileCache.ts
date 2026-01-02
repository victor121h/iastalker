const CACHE_KEY = 'instagram_profile_cache';
const CACHE_DURATION = 10 * 60 * 1000;

interface CachedProfile {
  username: string;
  profile: {
    pk?: string;
    username?: string;
    full_name?: string;
    avatar?: string;
    follower_count?: number;
    following_count?: number;
    media_count?: number;
    is_private?: boolean;
    biography?: string;
  } | null;
  following: Array<{
    pk: string;
    username: string;
    full_name: string;
    avatar: string;
  }>;
  location: string;
  timestamp: number;
}

export function saveProfileCache(data: Omit<CachedProfile, 'timestamp'>) {
  try {
    const cacheData: CachedProfile = {
      ...data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.error('Failed to save cache:', e);
  }
}

export function getProfileCache(username: string): CachedProfile | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedProfile = JSON.parse(cached);
    
    if (data.username.toLowerCase() !== username.toLowerCase()) {
      return null;
    }
    
    if (Date.now() - data.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (e) {
    return null;
  }
}

export function clearProfileCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
}
