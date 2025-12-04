// Simple in-memory cache for API responses
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 30000; // 30 seconds default TTL

  // Generate cache key from endpoint and params
  private getCacheKey(endpoint: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  }

  // Get cached data if not expired
  get(endpoint: string, options?: RequestInit): any | null {
    const key = this.getCacheKey(endpoint, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Cache expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Set cache entry
  set(endpoint: string, data: any, options?: RequestInit, ttl?: number): void {
    const key = this.getCacheKey(endpoint, options);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  // Invalidate cache for specific endpoint pattern
  invalidate(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      this.cache.clear();
      return;
    }

    // Clear cache entries matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Set default TTL
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

// Export singleton instance
export const apiCache = new ApiCache();

// Cleanup expired entries every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 60000);
}

